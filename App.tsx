import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ShipFormModal from './components/ShipFormModal';
import type { View } from './types';
import { UserRole } from './types';
import SidebarNav from './components/SidebarNav';
import Dashboard from './pages/Dashboard';
import VesselDirectory from './pages/VesselDirectory';
import BerthDirectory from './pages/BerthDirectory';
import AlertsDashboard from './pages/AlertsDashboard';
import ShipHistoryModal from './components/ShipHistoryModal';
import PortManagement from './pages/PortManagement';
import PortFormModal from './components/PortFormModal';
import BerthFormModal from './components/BerthFormModal';
import BerthDetailModal from './components/BerthDetailModal';
import UserManagement from './pages/UserManagement';
import UserFormModal from './components/UserFormModal';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import VesselAnalytics from './pages/VesselAnalytics';
import TripDirectory from './pages/TripDirectory';
import TripDetailModal from './components/TripDetailModal';
import ReassignBerthModal from './components/ReassignBerthModal';
import AssignPilotModal from './components/AssignPilotModal';
import { useAuth } from './context/AuthContext';
import WarningIcon from './components/icons/WarningIcon';
import { useSettings } from './context/SettingsContext';
import { usePort } from './context/PortContext';
import SystemLogs from './pages/SystemLogs';

const LoadingSpinner: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-gray-200">{message}</p>
        </div>
    </div>
);

const NoPortsView: React.FC = () => {
    const { currentUser } = useAuth();
    const { state } = usePort();
    const isAdmin = currentUser?.role === UserRole.ADMIN;

    return (
        <main className="flex-1 p-4 overflow-y-auto bg-gray-800">
            {isAdmin ? (
                <PortManagement />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                    <WarningIcon className="w-16 h-16 mb-4" />
                    <h2 className="text-xl font-bold text-white">No Port Assigned</h2>
                    <p className="max-w-md mt-2">
                        Your user account is not assigned to an active port.
                        Please contact an administrator to have your account configured correctly.
                    </p>
                </div>
            )}
            {state.modal?.type === 'portForm' && <PortFormModal />}
            {state.modal?.type === 'berthForm' && state.modal.port && <BerthFormModal port={state.modal.port} />}
        </main>
    );
};


const MainApp: React.FC = () => {
  const { currentUser } = useAuth();
  const { aisSource, approachingThreshold, pilotThreshold } = useSettings();
  const { state, actions } = usePort();
  const {
    accessiblePorts,
    selectedPortId,
    alerts,
    modal,
    ships,
    isLoading,
    selectedPort,
  } = state;
  
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => { actions.loadInitialPorts(); }, [actions]);

  useEffect(() => {
    if (selectedPortId) {
        const controller = new AbortController();
        actions.fetchDataForPort(selectedPortId, controller.signal);
        return () => controller.abort();
    } else {
        actions.clearData();
    }
  }, [selectedPortId, actions]);

  useEffect(() => {
    const cleanup = actions.initWebSocket(selectedPortId);
    return cleanup;
  }, [selectedPortId, actions]);

  useEffect(() => {
    const cleanup = actions.runAisSimulation(aisSource);
    return cleanup;
  }, [aisSource, actions, selectedPortId]); // Re-run if port changes

  useEffect(() => {
    const cleanup = actions.generateAlerts(approachingThreshold, pilotThreshold);
    return cleanup;
  }, [ships, actions, approachingThreshold, pilotThreshold]);
  
  const renderView = () => {
    if (isLoading && !selectedPort) {
        return <LoadingSpinner message="Loading Port Data..." />;
    }
    if (!selectedPort && accessiblePorts.length > 0) {
        return <div className="flex items-center justify-center h-full text-gray-400">Select a port to begin.</div>
    }

    switch(activeView) {
        case 'dashboard': return <Dashboard />;
        case 'vessels': return <VesselDirectory />;
        case 'berths': return <BerthDirectory />;
        case 'alerts': return <AlertsDashboard />;
        case 'trips': return <TripDirectory />;
        case 'vessel-analytics': return <VesselAnalytics />;
        case 'logs': return <SystemLogs />;
        case 'management': return <PortManagement />;
        case 'users': return <UserManagement />;
        case 'settings': return <SettingsPage />;
        default: return <Dashboard />;
    }
  };

  if (currentUser && accessiblePorts.length === 0 && !isLoading) {
    return (
      <div className="flex h-screen font-sans bg-gray-900 text-gray-200">
        <SidebarNav activeView={activeView} setActiveView={setActiveView} alertCount={0} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="flex flex-col flex-1">
          <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          <NoPortsView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen font-sans bg-gray-900 text-gray-200 relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
      <SidebarNav activeView={activeView} setActiveView={setActiveView} alertCount={alerts.filter(a => !a.acknowledged).length} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-2 sm:p-4 overflow-y-auto bg-gray-800">
          {renderView()}
        </main>
      </div>

      {/* Modals */}
      {modal?.type === 'shipForm' && <ShipFormModal />}
      {modal?.type === 'history' && modal.ship && <ShipHistoryModal ship={modal.ship} portId={selectedPortId!} onClose={actions.closeModal} />}
      {modal?.type === 'portForm' && <PortFormModal />}
      {modal?.type === 'berthForm' && modal.port && <BerthFormModal port={modal.port}/>}
      {modal?.type === 'berthDetail' && modal.berth && <BerthDetailModal berth={modal.berth} />}
      {modal?.type === 'tripDetail' && modal.trip && <TripDetailModal />}
      {modal?.type === 'userForm' && <UserFormModal />}
      {modal?.type === 'reassignBerth' && modal.ship && <ReassignBerthModal ship={modal.ship} />}
      {modal?.type === 'assignPilot' && modal.ship && <AssignPilotModal ship={modal.ship} />}
    </div>
  );
}

export default function App() {
    const { currentUser, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <LoadingSpinner message="Initializing..." />
            </div>
        );
    }
    
    return currentUser ? <MainApp /> : <LoginPage />;
}