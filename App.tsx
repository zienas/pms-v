


import React, { useState, useMemo, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import ShipFormModal from './components/ShipFormModal';
import type { Ship, View, Port, Berth, User, Alert, Trip } from './types';
import { UserRole, ShipStatus } from './types';
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
import VesselAnalyticsPage from './pages/VesselAnalytics';
import TripDirectory from './pages/TripDirectory';
import TripDetailModal from './components/TripDetailModal';
import * as api from './services/api';
import { useAuth } from './context/AuthContext';
import WarningIcon from './components/icons/WarningIcon';
import { useSettings } from './context/SettingsContext';
import { usePort } from './context/PortContext';

const ProximityAlertDialog: React.FC<{
    ship: Ship;
    onAssignPilot: (ship: Ship) => void;
    onDismiss: () => void;
}> = ({ ship, onAssignPilot, onDismiss }) => {
    
    const message = `Vessel ${ship.name} is approaching. ${!ship.pilotId ? 'Suggest assigning a pilot.' : 'A pilot is already assigned.'}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border-2 border-yellow-500/50 text-white">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-yellow-500/10 rounded-full mt-1 flex-shrink-0">
                         <WarningIcon className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-yellow-300">Proximity Alert</h2>
                        <p className="mt-2 text-gray-300">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onDismiss} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                        Dismiss
                    </button>
                    {!ship.pilotId && (
                         <button onClick={() => onAssignPilot(ship)} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">
                            Assign Pilot
                        </button>
                    )}
                </div>
            </div>
            {/* Simple fade-in animation */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};


const MainApp: React.FC = () => {
  const { currentUser, users } = useAuth();
  const { aisSource } = useSettings();
  
  // UI and navigation state
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Selected IDs for management views
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [managingPort, setManagingPort] = useState<Port | null>(null);
  
  const {
    // State
    ships, berths, trips, alerts, isLoading, allBerths,
    isShipFormModalOpen, editingShip, isHistoryModalOpen, historyShip,
    isPortFormModalOpen, editingPort, isBerthFormModalOpen, editingBerth,
    isBerthDetailModalOpen, selectedBerthForDetail, isTripDetailModalOpen, selectedTripForDetail,
    isUserFormModalOpen, editingUser, proximityAlertShipForModal,
    // Actions
    fetchData, generateAlerts, runAisSimulation, initWebSocket,
    deleteBerth, setAllPorts, clearData,
    openShipFormModal, closeShipFormModal, openHistoryModal, closeHistoryModal,
    openPortFormModal, closePortFormModal, openBerthFormModal, closeBerthFormModal,
    openBerthDetailModal, closeBerthDetailModal, openTripDetailModal, closeTripDetailModal,
    openUserFormModal, closeUserFormModal, closeProximityModal,
  } = usePort();

  const [allPorts, setAllPortsState] = useState<Port[]>([]);
  const [accessiblePorts, setAccessiblePorts] = useState<Port[]>([]);

  // Derived state for pilots and agents
  const pilots = useMemo(() => users.filter(u => u.role === UserRole.PILOT), [users]);
  const agents = useMemo(() => users.filter(u => u.role === UserRole.AGENT), [users]);

  // Fetch all ports and set initial selections based on user role
  const fetchPorts = async () => {
      if (!currentUser) return;
      try {
          const fetchedPorts = await api.getPorts();
          setAllPortsState(fetchedPorts);
          setAllPorts(fetchedPorts); // Update context

          if (currentUser.role === UserRole.ADMIN) {
              setAccessiblePorts(fetchedPorts);
              if (fetchedPorts.length > 0) {
                  if (!selectedPortId || !fetchedPorts.some(p => p.id === selectedPortId)) {
                      setSelectedPortId(fetchedPorts[0].id);
                  }
                  if (!managingPort || !fetchedPorts.some(p => p.id === managingPort.id)) {
                      setManagingPort(fetchedPorts[0]);
                  }
              } else {
                  setSelectedPortId(null); setManagingPort(null);
              }
          } else {
              const userPort = fetchedPorts.find(p => p.id === currentUser.portId);
              if (userPort) {
                  setAccessiblePorts([userPort]); setSelectedPortId(userPort.id);
              } else {
                   setAccessiblePorts([]); setSelectedPortId(null);
              }
          }
      } catch (error) { console.error("Failed to fetch ports:", error); }
  };

  useEffect(() => { fetchPorts(); }, [currentUser]);

  // Main data fetching effect with AbortController for race condition safety
  useEffect(() => {
    if (selectedPortId) {
        const controller = new AbortController();
        fetchData(selectedPortId, controller.signal);
        return () => controller.abort();
    } else {
        clearData();
    }
  }, [selectedPortId, fetchData]);

  // Effects for live updates and alerts
  useEffect(() => { 
    const cleanup = initWebSocket(selectedPortId);
    return cleanup;
  }, [selectedPortId, initWebSocket]);
  useEffect(() => runAisSimulation(aisSource), [runAisSimulation, aisSource]);
  useEffect(() => { generateAlerts(); }, [ships, berths, selectedPortId, generateAlerts]);


  // Handlers for Modals
  const handleAssignPilotFromAlert = (ship: Ship) => {
    closeProximityModal();
    openShipFormModal(ship);
  };
  
  const handleManageShipFromBerthDetail = (ship: Ship) => {
    closeBerthDetailModal();
    openShipFormModal(ship);
  };
  
  const handleViewHistoryFromTripDetail = (trip: Trip) => {
    const ship = ships.find(s => s.id === trip.shipId);
    if (ship) {
        closeTripDetailModal();
        openHistoryModal(ship);
    }
  };

  const handleDeletePort = async (portId: string) => {
    const portToDelete = allPorts.find(p => p.id === portId);
    if (!portToDelete) {
        toast.error("Port not found.");
        return;
    }

    if (window.confirm(`Are you sure you want to delete the port "${portToDelete.name}"? This will also delete all associated berths, vessels, and history. This action cannot be undone.`)) {
        try {
            await toast.promise(
                api.deletePort(portId),
                {
                    loading: `Deleting port "${portToDelete.name}"...`,
                    success: `Port "${portToDelete.name}" deleted successfully.`,
                    error: 'Failed to delete port.'
                }
            );
            await fetchPorts();
        } catch (e) {
            console.error("Port deletion failed", e);
        }
    }
};

  const selectedPort = useMemo(() => allPorts.find(p => p.id === selectedPortId), [allPorts, selectedPortId]);

  // Special view for when no ports exist
  if (currentUser && accessiblePorts.length === 0 && !isLoading) {
    return (
        <div className="flex h-screen font-sans bg-gray-900 text-gray-200">
            <SidebarNav activeView={activeView} setActiveView={setActiveView} alertCount={0} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex flex-col flex-1">
                <Header portName="No Ports Available" ports={[]} selectedPortId={null} onPortChange={() => {}} onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 overflow-y-auto bg-gray-800">
                    {currentUser.role === UserRole.ADMIN && (
                     <PortManagement 
                        ports={allPorts} 
                        selectedPort={managingPort}
                        onSelectPort={setManagingPort}
                        onDeletePort={handleDeletePort}
                     />
                    )}
                </main>
                 {isPortFormModalOpen && <PortFormModal onClose={closePortFormModal} onSaveSuccess={fetchPorts} />}
                 {isBerthFormModalOpen && managingPort && <BerthFormModal port={managingPort} onClose={closeBerthFormModal} />}
            </div>
        </div>
    )
  }
  
  return (
    <div className="flex h-screen font-sans bg-gray-900 text-gray-200 relative">
      <Toaster position="bottom-right" toastOptions={{
          style: { background: '#374151', color: '#fff' },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
      }}/>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
      <SidebarNav activeView={activeView} setActiveView={setActiveView} alertCount={alerts.filter(a => !a.acknowledged).length} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
            portName={selectedPort?.name || "Loading..."}
            ports={accessiblePorts}
            selectedPortId={selectedPortId}
            onPortChange={setSelectedPortId}
            onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 p-2 sm:p-4 overflow-y-auto bg-gray-800">
          {isLoading && !selectedPort ? (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg">Loading Port Data...</p>
                </div>
            </div>
          ) : (
            (() => {
                switch(activeView) {
                  case 'dashboard':
                    return selectedPort ? <Dashboard selectedPort={selectedPort} /> : <div>Select a port to view the dashboard.</div>;
                  case 'vessels':
                    return <VesselDirectory selectedPort={selectedPort || null} />;
                  case 'berths':
                    return <BerthDirectory />;
                  case 'alerts':
                    return <AlertsDashboard />;
                  case 'trips':
                    return <TripDirectory selectedPort={selectedPort || null} />;
                  case 'vessel-analytics':
                    return selectedPort ? <VesselAnalyticsPage selectedPort={selectedPort} /> : <div>Select a port to view analytics.</div>;
                  case 'management':
                    return <PortManagement 
                                ports={allPorts}
                                selectedPort={managingPort}
                                onSelectPort={setManagingPort}
                                onDeletePort={handleDeletePort}
                            />;
                  case 'users':
                    return <UserManagement allPorts={allPorts} />;
                  case 'settings':
                    return <SettingsPage ports={allPorts} selectedPortId={selectedPortId} onPortUpdateSuccess={fetchPorts} />;
                  default:
                    return selectedPort ? <Dashboard selectedPort={selectedPort} /> : <div>Select a port to view the dashboard.</div>;
                }
            })()
          )}
        </main>
      </div>

      {isShipFormModalOpen && selectedPortId && (
        <ShipFormModal
          pilots={pilots.filter(p => p.portId === selectedPortId)}
          agents={agents.filter(p => p.portId === selectedPortId)}
        />
      )}
      {isHistoryModalOpen && historyShip && selectedPortId && (
        <ShipHistoryModal
          ship={historyShip}
          portId={selectedPortId}
          onClose={closeHistoryModal}
        />
      )}
      {isPortFormModalOpen && <PortFormModal onClose={closePortFormModal} onSaveSuccess={fetchPorts}/>}
       {isBerthFormModalOpen && (
        <BerthFormModal
            port={managingPort || selectedPort!} // Use managing port if available, otherwise fallback to selected port
            onClose={closeBerthFormModal}
        />
      )}
      {isUserFormModalOpen && <UserFormModal ports={allPorts} onClose={closeUserFormModal} />}
      {proximityAlertShipForModal && (
        <ProximityAlertDialog
            ship={proximityAlertShipForModal}
            onAssignPilot={handleAssignPilotFromAlert}
            onDismiss={closeProximityModal}
        />
      )}
      {isBerthDetailModalOpen && selectedBerthForDetail && (
        <BerthDetailModal
          berth={selectedBerthForDetail}
          onClose={closeBerthDetailModal}
          onManageShip={handleManageShipFromBerthDetail}
        />
      )}
      {isTripDetailModalOpen && selectedTripForDetail && selectedPortId && (
        <TripDetailModal
          pilots={pilots.filter(p => p.portId === selectedPortId)}
          agents={agents.filter(a => a.portId === selectedPortId)}
          onClose={closeTripDetailModal}
          onViewHistory={handleViewHistoryFromTripDetail}
          selectedPort={selectedPort || null}
        />
      )}
    </div>
  );
}

export default function App() {
    const { currentUser, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                 <div className="flex flex-col items-center">
                    <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg text-gray-200">Initializing...</p>
                </div>
            </div>
        );
    }
    
    return currentUser ? <MainApp /> : <LoginPage />;
}