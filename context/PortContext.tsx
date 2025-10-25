import React, { useReducer, useCallback, createContext, useContext, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { Ship, Berth, Alert, Port, Trip, User, AisSource, ModalState, AisData, ShipMovement, LoginHistoryEntry, InteractionLogEntry } from '../types';
import { AlertType, ShipStatus, UserRole, MovementEventType } from '../types';
import * as api from '../services/api';
import { runAisSimulationStep } from '../services/aisSimulator';
import { calculateDistanceNM } from '../utils/geolocation';
import { webSocketService } from '../services/webSocketService';
import { useAuth } from './AuthContext';
import AlertToast from '../components/AlertToast';
import { playNotificationSound } from '../utils/audio';

// --- STATE ---
interface PortState {
  // Data
  ships: Ship[];
  berths: Berth[];
  trips: Trip[];
  alerts: Alert[];
  ports: Port[];
  allBerths: Berth[]; // Berths for all ports, for management views
  movements: ShipMovement[];
  loginHistory: LoginHistoryEntry[];
  interactionLogs: InteractionLogEntry[];
  
  // UI State
  isLoading: boolean;
  selectedPortId: string | null;
  accessiblePorts: Port[];
  modal: ModalState | null;

  // Derived
  selectedPort: Port | null;
}

// --- REDUCER ACTIONS ---
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIAL_PORTS'; payload: { ports: Port[], accessiblePorts: Port[], selectedPortId: string | null } }
  | { type: 'SET_ALL_BERTHS'; payload: Berth[] }
  | { type: 'SET_PORT_DATA'; payload: { ships: Ship[]; berths: Berth[]; trips: Trip[]; movements: ShipMovement[]; loginHistory: LoginHistoryEntry[]; interactionLogs: InteractionLogEntry[] } }
  | { type: 'SET_SELECTED_PORT_ID'; payload: string | null }
  | { type: 'CLEAR_DATA' }
  | { type: 'SET_ALERTS'; payload: Alert[] }
  | { type: 'OPEN_MODAL'; payload: ModalState }
  | { type: 'CLOSE_MODAL' }
  | { type: 'UPDATE_SHIP_POSITION'; payload: { shipId: string; lat: number; lon: number } }
  | { type: 'UPDATE_SHIP_AIS'; payload: Ship };

const initialState: PortState = {
  ships: [], berths: [], trips: [], alerts: [], ports: [], allBerths: [], movements: [], loginHistory: [], interactionLogs: [],
  isLoading: true, selectedPortId: null, accessiblePorts: [], modal: null,
  selectedPort: null,
};

const portReducer = (state: PortState, action: Action): PortState => {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_INITIAL_PORTS': {
        const selectedPort = action.payload.ports.find(p => p.id === action.payload.selectedPortId) ?? null;
        return { ...state, ...action.payload, selectedPort };
    }
    case 'SET_ALL_BERTHS': return { ...state, allBerths: action.payload };
    case 'SET_PORT_DATA': return { ...state, ...action.payload };
    case 'SET_SELECTED_PORT_ID': {
        const selectedPort = state.ports.find(p => p.id === action.payload) ?? null;
        return { 
            ...state, 
            selectedPortId: action.payload, 
            selectedPort,
            // Clear data from the old port to prevent showing stale information while new data loads
            ships: [],
            berths: [],
            trips: [],
            alerts: [],
            movements: [],
            loginHistory: [],
            interactionLogs: [],
        };
    }
    case 'CLEAR_DATA': return { ...state, ships: [], berths: [], trips: [], alerts: [], movements: [], loginHistory: [], interactionLogs: [] };
    case 'SET_ALERTS': return { ...state, alerts: action.payload };
    case 'OPEN_MODAL': return { ...state, modal: action.payload };
    case 'CLOSE_MODAL': return { ...state, modal: null };
    case 'UPDATE_SHIP_POSITION':
        return {
            ...state,
            ships: state.ships.map(ship =>
                ship.id === action.payload.shipId
                ? { ...ship, lat: action.payload.lat, lon: action.payload.lon }
                : ship
            )
        };
    case 'UPDATE_SHIP_AIS': {
        const updatedShip = action.payload;
        const shipExists = state.ships.some(s => s.id === updatedShip.id);
        const updatedShips = shipExists
            ? state.ships.map(s => s.id === updatedShip.id ? updatedShip : s)
            : [...state.ships, updatedShip];
        return { ...state, ships: updatedShips };
    }
    default: return state;
  }
};

// --- CONTEXT TYPE ---
interface PortContextType {
  state: PortState;
  actions: {
    loadInitialPorts: () => Promise<void>;
    fetchDataForPort: (portId: string, signal: AbortSignal) => Promise<void>;
    setSelectedPortId: (portId: string) => void;
    clearData: () => void;
    generateAlerts: (approachingThreshold: number, pilotThreshold: number) => () => void;
    runAisSimulation: (aisSource: AisSource, pilotThreshold: number) => () => void;
    initWebSocket: (portId: string | null) => () => void;
    openModal: (modal: ModalState) => void;
    closeModal: () => void;
    addShip: (shipData: Omit<Ship, 'id'>) => Promise<void>;
    updateShip: (id: string, shipData: Ship) => Promise<void>;
    deleteShip: (portId: string, shipId: string) => Promise<void>;
    addBerth: (portId: string, berthData: Omit<Berth, 'id' | 'portId'>) => Promise<void>;
    updateBerth: (portId: string, id: string, berthData: Berth) => Promise<void>;
    deleteBerth: (portId: string, berthId: string) => Promise<void>;
    addPort: (portData: Omit<Port, 'id'>) => Promise<void>;
    updatePort: (id: string, portData: Port) => Promise<void>;
    deletePort: (portId: string) => Promise<void>;
    updateTrip: (id: string, tripData: Trip) => Promise<void>;
    acknowledgeAlert: (alertId: string) => void;
    removeAlert: (alertId: string) => void;
    addPilotLog: (ship: Ship, eventType: MovementEventType.PILOT_ONBOARD | MovementEventType.PILOT_OFFBOARD, comments: string) => Promise<void>;
  };
}

const PortContext = createContext<PortContextType | undefined>(undefined);

export const PortProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(portReducer, initialState);
    const { currentUser, loggedInPortId } = useAuth();
    
    // Create a ref to hold the current state. This allows action functions to access
    // the latest state without needing to be recreated on every state change,
    // which stabilizes the `actions` object and prevents `useEffect` infinite loops.
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);
    
    const triggeredPilotAlertsRef = useRef(new Set<string>());

    useEffect(() => {
        // When port changes, reset the set of triggered alerts to allow new alerts for the new port
        triggeredPilotAlertsRef.current.clear();
    }, [state.selectedPortId]);


    const actions = useMemo(() => {
        const loadInitialPorts = async () => {
            if (!currentUser) return;
            try {
                const fetchedPorts = await api.getPorts();
                const fetchedAllBerths = await api.getAllBerths();
                dispatch({ type: 'SET_ALL_BERTHS', payload: fetchedAllBerths });

                let accessiblePorts: Port[] = [];
                let selectedPortId: string | null = null;
                
                if (currentUser.role === UserRole.ADMIN) {
                    accessiblePorts = fetchedPorts;
                    if (loggedInPortId && fetchedPorts.some(p => p.id === loggedInPortId)) {
                        selectedPortId = loggedInPortId;
                    } else if (fetchedPorts.length > 0) {
                        selectedPortId = fetchedPorts[0].id;
                    }
                } else {
                    const userPort = fetchedPorts.find(p => p.id === currentUser.portId);
                    if (userPort) {
                        accessiblePorts = [userPort];
                        selectedPortId = userPort.id;
                    }
                }
                dispatch({ type: 'SET_INITIAL_PORTS', payload: { ports: fetchedPorts, accessiblePorts, selectedPortId } });
            } catch (error) {
                toast.error("Failed to load port infrastructure.");
                console.error(error);
            }
        };

        const fetchDataForPort = async (portId: string, signal: AbortSignal) => {
            try {
                dispatch({ type: 'SET_LOADING', payload: true });
                const [ships, berths, trips, movements, allLoginHistory, interactionLogs] = await Promise.all([
                    api.getShips(portId), 
                    api.getBerths(portId), 
                    api.getTripsForPort(portId), 
                    api.getHistoryForPort(portId),
                    api.getLoginHistory(),
                    api.getInteractionLogs(portId),
                ]);
                if (!signal.aborted) {
                    const loginHistory = allLoginHistory.filter(h => h.portId === portId);
                    dispatch({ type: 'SET_PORT_DATA', payload: { ships, berths, trips, movements, loginHistory, interactionLogs } });
                }
            } catch (error) {
                if (!signal.aborted) toast.error(`Failed to load data for port.`);
            } finally {
                if (!signal.aborted) dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        
        const setSelectedPortId = (portId: string) => dispatch({ type: 'SET_SELECTED_PORT_ID', payload: portId });
        const clearData = () => dispatch({ type: 'CLEAR_DATA' });
        const openModal = (modal: ModalState) => dispatch({ type: 'OPEN_MODAL', payload: modal });
        const closeModal = () => dispatch({ type: 'CLOSE_MODAL' });

        const crudActions = {
            addShip: async (shipData: Omit<Ship, 'id'>) => {
                await toast.promise(api.addShip(shipData), { loading: 'Adding vessel...', success: 'Vessel added.', error: 'Failed to add vessel.' });
                await fetchDataForPort(shipData.portId, new AbortController().signal);
            },
            updateShip: async (id: string, shipData: Ship) => {
                await toast.promise(api.updateShip(id, shipData), { loading: 'Updating vessel...', success: 'Vessel updated.', error: 'Failed to update vessel.' });
                await fetchDataForPort(shipData.portId, new AbortController().signal);
            },
            deleteShip: async (portId: string, shipId: string) => {
                 if (window.confirm("Are you sure you want to delete this vessel?")) {
                    await toast.promise(api.deleteShip(portId, shipId), { loading: 'Deleting vessel...', success: 'Vessel deleted.', error: 'Failed to delete vessel.' });
                    await fetchDataForPort(portId, new AbortController().signal);
                }
            },
            addBerth: async (portId: string, berthData: Omit<Berth, 'id' | 'portId'>) => {
                await toast.promise(api.addBerth(portId, berthData), { loading: 'Adding berth...', success: 'Berth added.', error: 'Failed to add berth.' });
                await Promise.all([
                    fetchDataForPort(portId, new AbortController().signal),
                    api.getAllBerths().then(b => dispatch({ type: 'SET_ALL_BERTHS', payload: b}))
                ]);
                closeModal();
            },
            updateBerth: async (portId: string, id: string, berthData: Berth) => {
                 await toast.promise(api.updateBerth(portId, id, berthData), { loading: 'Updating berth...', success: 'Berth updated.', error: 'Failed to update berth.' });
                 await Promise.all([
                    fetchDataForPort(portId, new AbortController().signal),
                    api.getAllBerths().then(b => dispatch({ type: 'SET_ALL_BERTHS', payload: b}))
                ]);
                closeModal();
            },
            deleteBerth: async (portId: string, berthId: string) => {
                 if (window.confirm("Are you sure you want to delete this berth?")) {
                    await toast.promise(api.deleteBerth(portId, berthId), { loading: 'Deleting berth...', success: 'Berth deleted.', error: 'Failed to delete berth.' });
                    await Promise.all([
                        fetchDataForPort(portId, new AbortController().signal),
                        api.getAllBerths().then(b => dispatch({ type: 'SET_ALL_BERTHS', payload: b}))
                    ]);
                }
            },
            addPort: async (portData: Omit<Port, 'id'>) => {
                await toast.promise(api.addPort(portData), { loading: 'Adding port...', success: 'Port added.', error: 'Failed to add port.' });
                await loadInitialPorts();
            },
            updatePort: async (id: string, portData: Port) => {
                const promise = api.updatePort(id, portData);
                // For silent updates like theme changes, we don't show a toast.
                if (!portData.mapTheme) {
                    await toast.promise(promise, { loading: 'Updating port...', success: 'Port updated.', error: 'Failed to update port.' });
                } else {
                    await promise;
                }
                await loadInitialPorts();
            },
            deletePort: async (portId: string) => {
                 if (window.confirm("Are you sure you want to delete this port and all its data? This cannot be undone.")) {
                    await toast.promise(api.deletePort(portId), { loading: 'Deleting port...', success: 'Port deleted.', error: 'Failed to delete port.' });
                    await loadInitialPorts();
                }
            },
            updateTrip: async (id: string, tripData: Trip) => {
                await toast.promise(api.updateTrip(id, tripData), { loading: 'Updating trip...', success: 'Trip updated.', error: 'Failed to update trip.' });
                await fetchDataForPort(tripData.portId, new AbortController().signal);
            }
        };
        
        const generateAlerts = (approachingThreshold: number, pilotThreshold: number) => {
            const timer = setInterval(() => {
                const { selectedPort, ships, selectedPortId, alerts } = stateRef.current;
                if (!selectedPort) {
                    dispatch({ type: 'SET_ALERTS', payload: [] });
                    return;
                }
                const newAlerts: Alert[] = [];
                const currentPilotAlertIds = new Set<string>();

                ships.forEach(ship => {
                    if (ship.lat && ship.lon && ship.status === ShipStatus.APPROACHING) {
                        const distance = calculateDistanceNM(ship.lat, ship.lon, selectedPort.lat, selectedPort.lon);
                        
                        // General approaching alert
                        if (distance <= approachingThreshold) {
                           newAlerts.push({ id: `alert-approach-${ship.id}`, portId: selectedPortId!, type: AlertType.WARNING, message: `Vessel ${ship.name} is approaching port at ${distance.toFixed(2)} NM.`, shipId: ship.id, timestamp: new Date().toISOString() });
                        }

                        // Pilot assignment alert
                        if (distance <= pilotThreshold && !ship.pilotId) {
                            const alertId = `alert-pilot-${ship.id}`;
                            const message = `Vessel ${ship.name} requires pilot assignment. It is within ${distance.toFixed(2)} NM of the port.`;
                             const newPilotAlert: Alert = {
                                id: alertId,
                                portId: selectedPortId!,
                                type: AlertType.ERROR,
                                message,
                                shipId: ship.id,
                                timestamp: new Date().toISOString()
                            };
                            newAlerts.push(newPilotAlert);
                            currentPilotAlertIds.add(alertId);

                            // Trigger audible/visual notification only once
                            if (!triggeredPilotAlertsRef.current.has(alertId)) {
                                playNotificationSound();
                                toast(
                                    (t) => (
                                      <AlertToast
                                        alert={newPilotAlert}
                                        toastId={t.id}
                                      />
                                    ),
                                    {
                                      id: alertId,
                                      duration: Infinity,
                                      style: {
                                        background: 'transparent',
                                        padding: '0',
                                        boxShadow: 'none',
                                        border: 'none',
                                      }
                                    }
                                );
                                triggeredPilotAlertsRef.current.add(alertId);
                            }
                        }
                    }
                });

                // Clean up resolved pilot alerts from the tracking ref
                triggeredPilotAlertsRef.current.forEach(alertId => {
                    if (!currentPilotAlertIds.has(alertId)) {
                        triggeredPilotAlertsRef.current.delete(alertId);
                    }
                });
                
                const existingAcknowledged = new Map(alerts.filter(a => a.acknowledged).map(a => [a.id, a]));
                const finalAlerts = newAlerts.map(alert => ({...alert, acknowledged: existingAcknowledged.has(alert.id) }));
                
                dispatch({ type: 'SET_ALERTS', payload: finalAlerts });
            }, 5000);
            return () => clearInterval(timer);
        };
        
        const runAisSimulation = (aisSource: AisSource, pilotThreshold: number) => {
            if (aisSource !== 'simulator') return () => {};
            const interval = setInterval(async () => {
                const { allBerths, selectedPortId } = stateRef.current;
                if (selectedPortId) {
                    const allShips = await api.getAllShips(); // Fetch all ships for a global simulation
                    const aisUpdates = runAisSimulationStep(allShips, allBerths);
                    
                    for (const update of aisUpdates) {
                        const updatedShip = await api.updateShipFromAIS(update);
                        // Only dispatch updates for the currently viewed port to avoid unnecessary re-renders
                        if (updatedShip && updatedShip.portId === selectedPortId) {
                            dispatch({ type: 'UPDATE_SHIP_AIS', payload: updatedShip });
                        }
                    }
                }
            }, 7000);
            return () => clearInterval(interval);
        };
        
        const initWebSocket = (portId: string | null) => {
            if (!portId) { webSocketService.close(); return () => {}; }
            webSocketService.start();
            const sub = webSocketService.subscribe(msg => {
                if (msg.type === 'ship_position_update' && msg.payload.portId === portId) {
                    const shipToUpdate = stateRef.current.ships.find(s => s.imo === msg.payload.imo);
                    if (shipToUpdate) {
                        dispatch({
                            type: 'UPDATE_SHIP_POSITION',
                            payload: {
                                shipId: shipToUpdate.id,
                                lat: msg.payload.lat,
                                lon: msg.payload.lon,
                            },
                        });
                    }
                }
            });
            return () => webSocketService.unsubscribe(sub);
        };

        const acknowledgeAlert = (alertId: string) => {
            const newAlerts = stateRef.current.alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a);
            dispatch({ type: 'SET_ALERTS', payload: newAlerts });
            toast.dismiss(alertId);
        };
        const removeAlert = (alertId: string) => {
            const newAlerts = stateRef.current.alerts.filter(a => a.id !== alertId);
            dispatch({ type: 'SET_ALERTS', payload: newAlerts });
            toast.dismiss(alertId);
        };
        
        const addPilotLog = async (ship: Ship, eventType: MovementEventType.PILOT_ONBOARD | MovementEventType.PILOT_OFFBOARD, comments: string) => {
            if (!ship.currentTripId) {
                toast.error('Cannot log pilot activity for a vessel without an active trip.');
                return;
            }
            const message = eventType === MovementEventType.PILOT_ONBOARD
                ? `Pilot boarded vessel. ${comments ? `Comments: ${comments}` : ''}`
                : `Pilot left vessel. ${comments ? `Comments: ${comments}` : ''}`;

            await toast.promise(api.addShipMovement({
                shipId: ship.id,
                portId: ship.portId,
                tripId: ship.currentTripId,
                eventType,
                timestamp: new Date().toISOString(),
                details: { message }
            }), {
                loading: 'Saving log entry...',
                success: 'Log entry saved.',
                error: 'Failed to save log entry.'
            });
            // Refetch data to update history
            await fetchDataForPort(ship.portId, new AbortController().signal);
        };

        return {
            loadInitialPorts,
            fetchDataForPort,
            setSelectedPortId,
            clearData,
            openModal,
            closeModal,
            generateAlerts,
            runAisSimulation,
            initWebSocket,
            acknowledgeAlert,
            removeAlert,
            addPilotLog,
            ...crudActions
        };
    }, [currentUser, loggedInPortId]);

    const value: PortContextType = { state, actions };

    return <PortContext.Provider value={value}>{children}</PortContext.Provider>;
};

export const usePort = (): PortContextType => {
  const context = useContext(PortContext);
  if (context === undefined) {
    throw new Error('usePort must be used within a PortProvider');
  }
  return context;
};
