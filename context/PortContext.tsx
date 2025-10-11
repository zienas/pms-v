import React, { useReducer, useCallback, useRef, createContext, useContext } from 'react';
import { toast } from 'react-hot-toast';
import type { Ship, Berth, Alert, Port, Trip, User, AisSource } from '../types';
import { AlertType, ShipStatus } from '../types';
import * as api from '../services/api';
import { runAisUpdateStep } from '../services/aisSimulator';
import { calculateDistanceNM } from '../utils/geolocation';
import { webSocketService } from '../services/webSocketService';

// --- STATE AND ACTION TYPES ---
interface PortState {
  ships: Ship[];
  berths: Berth[];
  trips: Trip[];
  allBerths: Berth[];
  alerts: Alert[];
  isLoading: boolean;
  allPorts: Port[];
  isShipFormModalOpen: boolean;
  editingShip: Ship | null;
  isHistoryModalOpen: boolean;
  historyShip: Ship | null;
  isPortFormModalOpen: boolean;
  editingPort: Port | null;
  isBerthFormModalOpen: boolean;
  editingBerth: Berth | null;
  isBerthDetailModalOpen: boolean;
  selectedBerthForDetail: Berth | null;
  isTripDetailModalOpen: boolean;
  selectedTripForDetail: Trip | null;
  isUserFormModalOpen: boolean;
  editingUser: User | null;
  proximityAlertShipForModal: Ship | null;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: { ships: Ship[]; berths: Berth[]; trips: Trip[]; allBerths: Berth[] } }
  | { type: 'CLEAR_DATA' }
  | { type: 'SET_ALL_PORTS'; payload: Port[] }
  | { type: 'SET_ALL_BERTHS'; payload: Berth[] }
  | { type: 'SET_ALERTS'; payload: Alert[] }
  | { type: 'ACKNOWLEDGE_ALERT'; payload: string }
  | { type: 'REMOVE_ALERT'; payload: string }
  | { type: 'SHOW_PROXIMITY_MODAL'; payload: Ship }
  | { type: 'CLOSE_PROXIMITY_MODAL' }
  | { type: 'OPEN_SHIP_MODAL'; payload: Ship | null }
  | { type: 'CLOSE_SHIP_MODAL' }
  | { type: 'OPEN_HISTORY_MODAL'; payload: Ship | null }
  | { type: 'CLOSE_HISTORY_MODAL' }
  | { type: 'OPEN_PORT_MODAL'; payload: Port | null }
  | { type: 'CLOSE_PORT_MODAL' }
  | { type: 'OPEN_BERTH_MODAL'; payload: Berth | null }
  | { type: 'CLOSE_BERTH_MODAL' }
  | { type: 'OPEN_BERTH_DETAIL_MODAL'; payload: Berth }
  | { type: 'CLOSE_BERTH_DETAIL_MODAL' }
  | { type: 'OPEN_TRIP_DETAIL_MODAL'; payload: Trip }
  | { type: 'CLOSE_TRIP_DETAIL_MODAL' }
  | { type: 'OPEN_USER_MODAL'; payload: User | null }
  | { type: 'CLOSE_USER_MODAL' }
  | { type: 'UPDATE_SHIP_POSITION'; payload: { shipId: string; lat: number; lon: number } };

const initialState: PortState = {
  ships: [], berths: [], trips: [], allBerths: [], alerts: [], allPorts: [],
  isLoading: true, proximityAlertShipForModal: null,
  isShipFormModalOpen: false, editingShip: null, isHistoryModalOpen: false, historyShip: null,
  isPortFormModalOpen: false, editingPort: null, isBerthFormModalOpen: false, editingBerth: null,
  isBerthDetailModalOpen: false, selectedBerthForDetail: null, isTripDetailModalOpen: false, selectedTripForDetail: null,
  isUserFormModalOpen: false, editingUser: null,
};

const portReducer = (state: PortState, action: Action): PortState => {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_DATA': return { ...state, ...action.payload, alerts: [] };
    case 'CLEAR_DATA': return { ...state, ships: [], berths: [], trips: [], alerts: [], isLoading: false };
    case 'SET_ALL_PORTS': return { ...state, allPorts: action.payload };
    case 'SET_ALL_BERTHS': return { ...state, allBerths: action.payload };
    case 'SET_ALERTS': return { ...state, alerts: action.payload };
    case 'ACKNOWLEDGE_ALERT': return { ...state, alerts: state.alerts.map(a => a.id === action.payload ? { ...a, acknowledged: true } : a) };
    case 'REMOVE_ALERT': return { ...state, alerts: state.alerts.filter(a => a.id !== action.payload) };
    case 'SHOW_PROXIMITY_MODAL': return { ...state, proximityAlertShipForModal: action.payload };
    case 'CLOSE_PROXIMITY_MODAL': return { ...state, proximityAlertShipForModal: null };
    case 'OPEN_SHIP_MODAL': return { ...state, isShipFormModalOpen: true, editingShip: action.payload };
    case 'CLOSE_SHIP_MODAL': return { ...state, isShipFormModalOpen: false, editingShip: null };
    case 'OPEN_HISTORY_MODAL': return { ...state, isHistoryModalOpen: true, historyShip: action.payload };
    case 'CLOSE_HISTORY_MODAL': return { ...state, isHistoryModalOpen: false, historyShip: null };
    case 'OPEN_PORT_MODAL': return { ...state, isPortFormModalOpen: true, editingPort: action.payload };
    case 'CLOSE_PORT_MODAL': return { ...state, isPortFormModalOpen: false, editingPort: null };
    case 'OPEN_BERTH_MODAL': return { ...state, isBerthFormModalOpen: true, editingBerth: action.payload };
    case 'CLOSE_BERTH_MODAL': return { ...state, isBerthFormModalOpen: false, editingBerth: null };
    case 'OPEN_BERTH_DETAIL_MODAL': return { ...state, isBerthDetailModalOpen: true, selectedBerthForDetail: action.payload };
    case 'CLOSE_BERTH_DETAIL_MODAL': return { ...state, isBerthDetailModalOpen: false, selectedBerthForDetail: null };
    case 'OPEN_TRIP_DETAIL_MODAL': return { ...state, isTripDetailModalOpen: true, selectedTripForDetail: action.payload };
    case 'CLOSE_TRIP_DETAIL_MODAL': return { ...state, isTripDetailModalOpen: false, selectedTripForDetail: null };
    case 'OPEN_USER_MODAL': return { ...state, isUserFormModalOpen: true, editingUser: action.payload };
    case 'CLOSE_USER_MODAL': return { ...state, isUserFormModalOpen: false, editingUser: null };
    case 'UPDATE_SHIP_POSITION': 
        return {
            ...state,
            ships: state.ships.map(ship => 
                ship.id === action.payload.shipId 
                ? { ...ship, lat: action.payload.lat, lon: action.payload.lon } 
                : ship
            )
        };
    default: return state;
  }
};

interface PortContextType extends PortState {
  fetchData: (portId: string, signal: AbortSignal) => Promise<void>;
  addShip: (ship: Omit<Ship, 'id'>) => Promise<Ship>;
  updateShip: (id: string, updatedShip: Ship) => Promise<Ship>;
  deleteShip: (portId: string, id: string) => void;
  addBerth: (portId: string, berth: Omit<Berth, 'id' | 'portId'>) => Promise<Berth>;
  updateBerth: (portId: string, id: string, updatedBerth: Berth) => Promise<Berth>;
  deleteBerth: (portId: string, id: string) => Promise<void>;
  deletePort: (portId: string) => void;
  updateTrip: (id: string, updatedTrip: Trip) => Promise<Trip>;
  fetchAllBerths: () => Promise<void>;
  generateAlerts: () => void;
  clearData: () => void;
  setAllPorts: (ports: Port[]) => void;
  runAisSimulation: (aisSource: AisSource) => () => void;
  initWebSocket: (portId: string | null) => () => void;
  openShipFormModal: (ship: Ship | null) => void;
  closeShipFormModal: () => void;
  openHistoryModal: (ship: Ship | null) => void;
  closeHistoryModal: () => void;
  openPortFormModal: (port: Port | null) => void;
  closePortFormModal: () => void;
  openBerthFormModal: (berth: Berth | null) => void;
  closeBerthFormModal: () => void;
  openBerthDetailModal: (berth: Berth) => void;
  closeBerthDetailModal: () => void;
  openTripDetailModal: (trip: Trip) => void;
  closeTripDetailModal: () => void;
  openUserFormModal: (user: User | null) => void;
  closeUserFormModal: () => void;
  closeProximityModal: () => void;
  acknowledgeAlert: (alertId: string) => void;
  removeAlert: (alertId: string) => void;
}

const PortContext = createContext<PortContextType | undefined>(undefined);

export const PortProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(portReducer, initialState);

    const shownProximityPopupsRef = useRef(new Set<string>());

    const fetchData = useCallback(async (portId: string, signal: AbortSignal) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            const [fetchedShips, fetchedBerths, fetchedTrips, fetchedAllBerths] = await Promise.all([
                api.getShips(portId), api.getBerths(portId), api.getTripsForPort(portId), api.getAllBerths()
            ]);
            if (!signal.aborted) {
                dispatch({ type: 'SET_DATA', payload: { ships: fetchedShips, berths: fetchedBerths, trips: fetchedTrips, allBerths: fetchedAllBerths } });
            }
        } catch (error) {
            if (!signal.aborted) console.error("Failed to fetch initial port data:", error);
        } finally {
            if (!signal.aborted) dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    const fetchAllBerths = useCallback(async () => {
        try {
            const fetchedAllBerths = await api.getAllBerths();
            dispatch({ type: 'SET_ALL_BERTHS', payload: fetchedAllBerths });
        } catch (error) { console.error("Failed to fetch all berths:", error); }
    }, []);

    const addShip = useCallback(async (ship: Omit<Ship, 'id'>) => {
        const newShip = await api.addShip(ship);
        toast.success(`Ship "${newShip.name}" added successfully.`);
        await fetchData(ship.portId, new AbortController().signal);
        return newShip;
    }, [fetchData]);

    const updateShip = useCallback(async (id: string, updatedShip: Ship) => {
        const savedShip = await api.updateShip(id, updatedShip);
        toast.success(`Ship "${savedShip.name}" updated.`);
        await fetchData(updatedShip.portId, new AbortController().signal);
        return savedShip;
    }, [fetchData]);

    const deleteShip = useCallback((portId: string, id: string) => {
        toast.error("Deletion not implemented in this context version.");
    }, []);

    const addBerth = useCallback(async (portId: string, berth: Omit<Berth, 'id' | 'portId'>) => {
        const newBerth = await api.addBerth(portId, berth);
        toast.success(`Berth "${newBerth.name}" added.`);
        await fetchData(portId, new AbortController().signal);
        await fetchAllBerths();
        return newBerth;
    }, [fetchData, fetchAllBerths]);

    const updateBerth = useCallback(async (portId: string, id: string, updatedBerth: Berth) => {
        const savedBerth = await api.updateBerth(portId, id, updatedBerth);
        toast.success(`Berth "${savedBerth.name}" updated.`);
        await fetchData(portId, new AbortController().signal);
        await fetchAllBerths();
        return savedBerth;
    }, [fetchData, fetchAllBerths]);

    const deleteBerth = useCallback(async (portId: string, id: string) => {
        const berthToDelete = state.allBerths.find(b => b.id === id);
        if (!berthToDelete) {
            toast.error("Berth not found.");
            return;
        }

        if (window.confirm(`Are you sure you want to delete the berth "${berthToDelete.name}"? This action cannot be undone.`)) {
            try {
                await toast.promise(
                    api.deleteBerth(portId, id),
                    {
                        loading: 'Deleting berth...',
                        success: `Berth "${berthToDelete.name}" deleted.`,
                        error: 'Failed to delete berth.',
                    }
                );
                await fetchData(portId, new AbortController().signal);
                await fetchAllBerths();
            } catch (e) {
                console.error("Berth deletion failed", e);
            }
        }
    }, [state.allBerths, fetchData, fetchAllBerths]);

    const deletePort = (portId: string) => {
        toast.error("Port deletion is a critical action and must be confirmed in the management panel.");
    };

    const updateTrip = useCallback(async (id: string, updatedTrip: Trip) => {
        const savedTrip = await api.updateTrip(id, updatedTrip);
        toast.success(`Trip updated.`);
        await fetchData(savedTrip.portId, new AbortController().signal);
        return savedTrip;
    }, [fetchData]);
    
    const generateAlerts = useCallback(() => {
        const { ships, allPorts } = state;
        const portId = ships[0]?.portId;
        if (!portId) { dispatch({ type: 'SET_ALERTS', payload: [] }); return; }
        const currentPort = allPorts.find(p => p.id === portId);
        if (!currentPort) return;
        
        const newAlerts: Omit<Alert, 'acknowledged'>[] = [];
        const shipsInProx = new Set<string>();

        ships.forEach(ship => {
            if (ship.lat && ship.lon) {
                const distance = calculateDistanceNM(ship.lat, ship.lon, currentPort.lat, currentPort.lon);
                if (distance <= 2) {
                    shipsInProx.add(ship.id);
                    if (!shownProximityPopupsRef.current.has(ship.id)) {
                        dispatch({ type: 'SHOW_PROXIMITY_MODAL', payload: ship });
                        shownProximityPopupsRef.current.add(ship.id);
                    }
                    if (ship.status === ShipStatus.APPROACHING && !ship.pilotId) {
                         newAlerts.push({ id: `alert-prox-${ship.id}`, portId, type: AlertType.WARNING, message: `Vessel ${ship.name} is approaching (${distance.toFixed(2)} NM). Suggest assigning a pilot.`, shipId: ship.id, timestamp: new Date().toISOString() });
                    }
                }
            }
        });

        shownProximityPopupsRef.current.forEach(id => !shipsInProx.has(id) && shownProximityPopupsRef.current.delete(id));
        
        // FIX: Explicitly type the Map to resolve a TypeScript inference issue where the map's value type was being inferred as 'unknown'.
        const oldAlertsMap = new Map<string, Alert>(state.alerts.map(a => [a.id, a]));
        dispatch({ type: 'SET_ALERTS', payload: newAlerts.map(a => ({ ...a, acknowledged: oldAlertsMap.get(a.id)?.acknowledged || false })) });
    }, [state.ships, state.allPorts, state.alerts]);


    const runAisSimulation = useCallback((aisSource: AisSource) => {
        if (aisSource !== 'simulator') return () => {};
        const intervalId = setInterval(async () => {
            if (state.allPorts.length > 0) {
                const allShips = await api.getAllShips();
                const updates = runAisUpdateStep(state.allPorts, allShips);
                const currentPortId = state.ships[0]?.portId;
                if ((updates.newShip || updates.updatedShip) && currentPortId) {
                    if(updates.newShip) await api.addShip(updates.newShip);
                    if(updates.updatedShip) await api.updateShip(updates.updatedShip.id, updates.updatedShip);
                    await fetchData(currentPortId, new AbortController().signal);
                }
            }
        }, 7000);
        return () => clearInterval(intervalId);
    }, [state.allPorts, state.ships, fetchData]);

    const initWebSocket = useCallback((portId: string | null) => {
        if (!portId) return () => {};
        const subscription = webSocketService.subscribe(message => {
            if (message.type === 'ship_position_update' && message.payload.portId === portId) {
                dispatch({ type: 'UPDATE_SHIP_POSITION', payload: message.payload });
            }
        });
        return () => webSocketService.unsubscribe(subscription);
    }, []);

    const value: PortContextType = {
        ...state,
        fetchData,
        addShip,
        updateShip,
        deleteShip,
        addBerth,
        updateBerth,
        deleteBerth,
        deletePort,
        updateTrip,
        fetchAllBerths,
        generateAlerts,
        clearData: useCallback(() => dispatch({ type: 'CLEAR_DATA' }), []),
        setAllPorts: useCallback((ports: Port[]) => dispatch({ type: 'SET_ALL_PORTS', payload: ports }), []),
        runAisSimulation,
        initWebSocket,
        openShipFormModal: useCallback((ship) => dispatch({ type: 'OPEN_SHIP_MODAL', payload: ship }), []),
        closeShipFormModal: useCallback(() => dispatch({ type: 'CLOSE_SHIP_MODAL' }), []),
        openHistoryModal: useCallback((ship) => dispatch({ type: 'OPEN_HISTORY_MODAL', payload: ship }), []),
        closeHistoryModal: useCallback(() => dispatch({ type: 'CLOSE_HISTORY_MODAL' }), []),
        openPortFormModal: useCallback((port) => dispatch({ type: 'OPEN_PORT_MODAL', payload: port }), []),
        closePortFormModal: useCallback(() => dispatch({ type: 'CLOSE_PORT_MODAL' }), []),
        openBerthFormModal: useCallback((berth) => dispatch({ type: 'OPEN_BERTH_MODAL', payload: berth }), []),
        closeBerthFormModal: useCallback(() => dispatch({ type: 'CLOSE_BERTH_MODAL' }), []),
        openBerthDetailModal: useCallback((berth) => dispatch({ type: 'OPEN_BERTH_DETAIL_MODAL', payload: berth }), []),
        closeBerthDetailModal: useCallback(() => dispatch({ type: 'CLOSE_BERTH_DETAIL_MODAL' }), []),
        openTripDetailModal: useCallback((trip) => dispatch({ type: 'OPEN_TRIP_DETAIL_MODAL', payload: trip }), []),
        closeTripDetailModal: useCallback(() => dispatch({ type: 'CLOSE_TRIP_DETAIL_MODAL' }), []),
        openUserFormModal: useCallback((user) => dispatch({ type: 'OPEN_USER_MODAL', payload: user }), []),
        closeUserFormModal: useCallback(() => dispatch({ type: 'CLOSE_USER_MODAL' }), []),
        closeProximityModal: useCallback(() => dispatch({ type: 'CLOSE_PROXIMITY_MODAL' }), []),
        acknowledgeAlert: useCallback((id) => dispatch({ type: 'ACKNOWLEDGE_ALERT', payload: id }), []),
        removeAlert: useCallback((id) => dispatch({ type: 'REMOVE_ALERT', payload: id }), []),
    };

    return <PortContext.Provider value={value}>{children}</PortContext.Provider>;
};

export const usePort = (): PortContextType => {
  const context = useContext(PortContext);
  if (context === undefined) {
    throw new Error('usePort must be used within a PortProvider');
  }
  return context;
};