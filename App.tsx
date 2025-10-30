import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import ShipFormModal from './components/ShipFormModal';
import type { View } from './types';
import { UserRole, InteractionEventType } from './types';
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
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import { toast } from 'react-hot-toast';
import { useLogger } from './context/InteractionLoggerContext';
import PilotPage from './pages/PilotPage';
import LogMovementModal from './components/LogMovementModal';
import VesselMovements from './pages/VesselMovements';
import GeneratePromptModal from './components/GeneratePromptModal';

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
  const { currentUser, logout } = useAuth();
  const { aisSource, approachingThreshold, pilotThreshold, firstShiftStartHour, shiftDurationHours, isAisSimulationEnabled } = useSettings();
  const { state, actions } = usePort();
  const { log } = useLogger();
  const {
    accessiblePorts,
    selectedPortId,
    alerts,
    modal,
    ships,
    isLoading,
    selectedPort,
  } = state;
  
  const [activeView, setActiveView] = useState<View>(currentUser?.role === UserRole.PILOT ? 'pilot-log' : 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const warningShownForShiftEnd = useRef<number | null>(null);
  const lastPixelRatio = useRef(window.devicePixelRatio);

  const unacknowledgedAlerts = useMemo(() => {
    const baseAlerts = alerts.filter(a => !a.acknowledged);
    if (currentUser?.role === UserRole.PILOT) {
      const assignedShipIds = new Set(ships.filter(s => s.pilotId === currentUser.id).map(s => s.id));
      return baseAlerts.filter(a => a.shipId && assignedShipIds.has(a.shipId));
    }
    if (currentUser?.role === UserRole.AGENT) {
        const assignedShipIds = new Set(ships.filter(s => s.agentId === currentUser.id).map(s => s.id));
        return baseAlerts.filter(a => a.shipId && assignedShipIds.has(a.shipId));
    }
    return baseAlerts;
  }, [alerts, currentUser, ships]);


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
    if (aisSource === 'simulator' && isAisSimulationEnabled) {
        const cleanup = actions.runAisSimulation(aisSource, pilotThreshold);
        return cleanup;
    }
  }, [aisSource, actions, selectedPortId, pilotThreshold, isAisSimulationEnabled]);

  useEffect(() => {
    const cleanup = actions.generateAlerts(approachingThreshold, pilotThreshold);
    return cleanup;
  }, [ships, actions, approachingThreshold, pilotThreshold]);
  
  // Effect for shift-based auto-logout
  useEffect(() => {
    if (currentUser?.role !== UserRole.OPERATOR || !shiftDurationHours || shiftDurationHours <= 0) {
        return; // Do nothing if not an operator or settings are invalid
    }

    const timer = setInterval(() => {
        const now = new Date();

        // Calculate the start of the first shift on the "operational day"
        const firstShiftToday = new Date(now);
        firstShiftToday.setHours(firstShiftStartHour, 0, 0, 0);

        const firstShiftEpoch = (now < firstShiftToday) 
            ? new Date(firstShiftToday.setDate(firstShiftToday.getDate() - 1)) 
            : firstShiftToday;
        
        const msIntoDay = now.getTime() - firstShiftEpoch.getTime();
        const shiftDurationMs = shiftDurationHours * 60 * 60 * 1000;

        const currentShiftIndex = Math.floor(msIntoDay / shiftDurationMs);
        const currentShiftEndMs = firstShiftEpoch.getTime() + (currentShiftIndex + 1) * shiftDurationMs;
        const logoutTimeMs = currentShiftEndMs + 5 * 60 * 1000; // 5 minutes after shift end

        const msUntilLogout = logoutTimeMs - now.getTime();

        // Check for logout (within a 1-second window to ensure it fires)
        if (msUntilLogout <= 0 && msUntilLogout > -1000) {
            logout('Your shift has ended. You have been automatically logged out.');
            return; // Logout called, no need to continue checking
        }

        // Check for 2-minute warning (within a 1-second window)
        const warningTimeMs = logoutTimeMs - 2 * 60 * 1000;
        const msUntilWarning = warningTimeMs - now.getTime();
        if (msUntilWarning > 0 && msUntilWarning < 1000) {
            if (warningShownForShiftEnd.current !== logoutTimeMs) {
                toast.loading('You will be automatically logged out in 2 minutes.', {
                    id: 'shift-warning-toast',
                    duration: 10000,
                });
                warningShownForShiftEnd.current = logoutTimeMs;
            }
        }

    }, 1000); // Check every second for precision

    return () => clearInterval(timer);

  }, [currentUser, firstShiftStartHour, shiftDurationHours, logout]);

  // Effect for global interaction logging
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;

        if (target.closest('[data-logging-handler="true"]')) {
            return;
        }

        const interactiveElement = target.closest('button, a, [role="button"], [role="link"], [role="menuitem"], label, [onclick]');
        
        if (interactiveElement) {
            const element = interactiveElement as HTMLElement;

            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.closest('[data-component="port-map"]')) {
                return;
            }

            // --- Enhanced Description Logic ---
            let description = 
                element.ariaLabel ||
                element.getAttribute('aria-label');
            
            // If no explicit label, try to get a title from the element itself or a more specific child target
            if (!description) {
                // The direct click target might be more specific (e.g., an SVG icon inside a button)
                const specificTarget = target.closest('svg, img');
                if (specificTarget) {
                    description = specificTarget.querySelector('title')?.textContent ||
                                  (specificTarget as HTMLImageElement).alt ||
                                  specificTarget.getAttribute('title');
                }
            }
            
            // Fallback to the interactive element's title, text content, name, or id
            if (!description) {
                description = element.title ||
                              element.textContent?.trim() ||
                              element.getAttribute('name') ||
                              element.id;
            }
            
            // As a final fallback, use the tag name
            if (!description) {
                description = element.tagName;
            }

            if (description) {
                const contextElement = element.closest('[data-log-context]');
                const context = contextElement ? contextElement.getAttribute('data-log-context') : 'Global';

                description = description.replace(/\s+/g, ' ').substring(0, 80);
                const message = `User clicked ${element.tagName.toLowerCase()} element: "${description}" within context: "${context}"`;

                log(InteractionEventType.GENERIC_CLICK, {
                    action: `Click on ${element.tagName}`,
                    value: description,
                    message: message,
                    targetId: element.id
                });
            }
        }
    };
    
    const handleResize = () => {
        if (window.devicePixelRatio !== lastPixelRatio.current) {
            lastPixelRatio.current = window.devicePixelRatio;
            log(InteractionEventType.BROWSER_ZOOM, {
                action: 'Browser Zoom Changed',
                value: `Zoom level: ${Math.round(lastPixelRatio.current * 100)}%`,
                message: `User changed browser zoom level to ${Math.round(lastPixelRatio.current * 100)}%`,
            });
        }
    };

    document.addEventListener('click', handleGlobalClick);
    window.addEventListener('resize', handleResize);

    return () => {
        document.removeEventListener('click', handleGlobalClick);
        window.removeEventListener('resize', handleResize);
    };
  }, [log]);

  // Effect to handle navigation requests from toasts
  useEffect(() => {
    const handleNavigation = (event: CustomEvent) => {
        if (event.detail && typeof event.detail === 'string') {
            setActiveView(event.detail as View);
        }
    };
    
    window.addEventListener('navigateTo', handleNavigation as EventListener);

    return () => {
        window.removeEventListener('navigateTo', handleNavigation as EventListener);
    };
  }, [setActiveView]);

  // Effect to enforce role-based view restrictions
  useEffect(() => {
    if (currentUser?.role === UserRole.AGENT) {
        const agentAllowedViews: View[] = ['dashboard', 'vessels', 'trips', 'alerts', 'settings'];
        if (!agentAllowedViews.includes(activeView)) {
            toast.error("You do not have permission to access this page.");
            setActiveView('dashboard');
        }
    }
  }, [activeView, currentUser, setActiveView]);


  const renderView = () => {
    if (isLoading && activeView !== 'dashboard') { // Keep dashboard visible but show loading on map
        return <LoadingSpinner message="Loading Port Data..." />;
    }
    if (!selectedPort && accessiblePorts.length > 0) {
        return <div className="flex items-center justify-center h-full text-gray-400">Select a port to begin.</div>
    }

    switch(activeView) {
        case 'dashboard': return <Dashboard />;
        case 'vessels': return <VesselDirectory setActiveView={setActiveView} />;
        case 'berths': return <BerthDirectory />;
        case 'alerts': return <AlertsDashboard />;
        case 'trips': return <TripDirectory />;
        case 'vessel-analytics': return <VesselAnalytics />;
        case 'vessel-movements': return <VesselMovements />;
        case 'logs': return <SystemLogs />;
        case 'management': return <PortManagement />;
        case 'users': return <UserManagement />;
        case 'settings': return <SettingsPage />;
        case 'pilot-log': return <PilotPage />;
        default: return <Dashboard />;
    }
  };

  if (currentUser && accessiblePorts.length === 0 && !isLoading) {
      return <NoPortsView />;
  }

  return (
    <div className="flex h-screen bg-gray-800 text-gray-200">
      <SidebarNav activeView={activeView} setActiveView={setActiveView} alertCount={unacknowledgedAlerts.length} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        <Header onMenuClick={() => setIsSidebarOpen(true)} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto bg-gray-800">
          {renderView()}
        </main>
      </div>
      
      {/* Modals */}
      {modal?.type === 'shipForm' && <ShipFormModal />}
      {modal?.type === 'history' && <ShipHistoryModal ship={modal.ship} portId={selectedPortId!} onClose={actions.closeModal} />}
      {modal?.type === 'portForm' && <PortFormModal />}
      {modal?.type === 'berthForm' && modal.port && <BerthFormModal port={modal.port} />}
      {modal?.type === 'berthDetail' && modal.berth && <BerthDetailModal berth={modal.berth} />}
      {modal?.type === 'userForm' && <UserFormModal />}
      {modal?.type === 'tripDetail' && <TripDetailModal />}
      {modal?.type === 'reassignBerth' && modal.ship && <ReassignBerthModal ship={modal.ship} />}
      {modal?.type === 'assignPilot' && modal.ship && <AssignPilotModal ship={modal.ship} />}
      {modal?.type === 'logMovement' && modal.ship && <LogMovementModal ship={modal.ship} />}
      {modal?.type === 'generatePrompt' && <GeneratePromptModal />}
    </div>
  );
};

const App: React.FC = () => {
    const { currentUser, isLoading, isPasswordChangeRequired } = useAuth();

    if (isLoading) {
        return <div className="bg-gray-900 h-screen flex items-center justify-center"><LoadingSpinner message="Authenticating..." /></div>;
    }

    if (!currentUser) {
        return <LoginPage />;
    }

    if (isPasswordChangeRequired) {
        return <ForcePasswordChangeModal />;
    }
    
    return <MainApp />;
};

export default App;