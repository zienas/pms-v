// services/api.ts
// This file simulates a backend API using localStorage for demonstration purposes.

import {
  Ship, Berth, Port, User, ShipMovement, LoginHistoryEntry, Trip, AisData,
  UserRole, ShipStatus, MovementEventType, TripStatus, BerthType
} from '../types';

const initialSeedData = {
    ports: [
        { id: 'port-sg', name: 'Port of Singapore', lat: 1.2647, lon: 103.8225, geometry: [[1.29, 103.75], [1.29, 103.90], [1.22, 103.90], [1.22, 103.75]] },
        { id: 'port-rt', name: 'Port of Rotterdam', lat: 51.9470, lon: 4.1500, geometry: [[51.98, 4.0], [51.98, 4.3], [51.90, 4.3], [51.90, 4.0]] },
    ],
    berths: [
        { id: 'berth-sg-1', portId: 'port-sg', name: 'Tanjong Pagar Berth 1', type: BerthType.BERTH, maxLength: 250, maxDraft: 12, equipment: ['Crane', 'Water'], quayId: 'quay-tp', positionOnQuay: 1 },
        { id: 'berth-sg-2', portId: 'port-sg', name: 'Tanjong Pagar Berth 2', type: BerthType.BERTH, maxLength: 300, maxDraft: 14, equipment: ['Crane', 'Fuel'], quayId: 'quay-tp', positionOnQuay: 2 },
        { id: 'anch-sg-A', portId: 'port-sg', name: 'Eastern Anchorage A', type: BerthType.ANCHORAGE, maxLength: 500, maxDraft: 20, equipment: [] },
        { id: 'berth-rt-1', portId: 'port-rt', name: 'Europoort Berth 80', type: BerthType.QUAY, maxLength: 400, maxDraft: 18, equipment: ['Gantry Crane'], quayId: 'quay-eu', positionOnQuay: 1 },
    ],
    ships: [
        { id: 'ship-1', portId: 'port-sg', name: 'Ever Ace', imo: '9893890', type: 'Container Ship', length: 400, draft: 16, flag: 'PA', eta: new Date(Date.now() - 3600000).toISOString(), etd: new Date(Date.now() + 86400000 * 2).toISOString(), status: ShipStatus.DOCKED, berthIds: ['berth-sg-2'], hasDangerousGoods: false, lat: 1.255, lon: 103.82, heading: 90, currentTripId: 'trip-1' },
        // FIX: Replaced 'ANCHORAGE' with 'ANCHORED' to match the enum definition in 'types.ts'.
        { id: 'ship-2', portId: 'port-sg', name: 'Sirius Star', imo: '9384179', type: 'Oil Tanker', length: 330, draft: 22, flag: 'LR', eta: new Date().toISOString(), etd: new Date(Date.now() + 86400000 * 3).toISOString(), status: ShipStatus.ANCHORED, berthIds: ['anch-sg-A'], hasDangerousGoods: true, lat: 1.24, lon: 103.85, heading: 180, currentTripId: 'trip-2' },
    ],
    users: [
        { id: 'user-admin', name: 'Admin', role: UserRole.ADMIN, password: 'password', forcePasswordChange: false },
        { id: 'user-sup', name: 'Supervisor', role: UserRole.SUPERVISOR, portId: 'port-sg', password: 'password', forcePasswordChange: true },
        { id: 'user-op-sg', name: 'Operator SG', role: UserRole.OPERATOR, portId: 'port-sg', password: 'password', forcePasswordChange: false },
        { id: 'user-op-rt', name: 'Operator RT', role: UserRole.OPERATOR, portId: 'port-rt', password: 'password', forcePasswordChange: false },
        { id: 'user-pilot-1', name: 'John Doe', role: UserRole.PILOT, portId: 'port-sg', password: 'password' },
        { id: 'user-agent-1', name: 'Maritime Masters', role: UserRole.AGENT, portId: 'port-sg', password: 'password' },
    ],
    trips: [
        { id: 'trip-1', shipId: 'ship-1', portId: 'port-sg', arrivalTimestamp: new Date(Date.now() - 7200000).toISOString(), departureTimestamp: null, status: TripStatus.ACTIVE },
        { id: 'trip-2', shipId: 'ship-2', portId: 'port-sg', arrivalTimestamp: new Date(Date.now() - 3600000).toISOString(), departureTimestamp: null, status: TripStatus.ACTIVE },
    ],
    shipMovements: [],
    loginHistory: [],
};

const DB_KEY = 'pms_data';
const LATENCY = 200; // ms to simulate network latency

// --- DB HELPER FUNCTIONS ---

const getDb = (): any => {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : {};
};

const saveDb = (db: any): void => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
};

const initializeDb = (): void => {
    if (!localStorage.getItem(DB_KEY)) {
        console.log("Initializing database with seed data...");
        saveDb(initialSeedData);
    }
};

// Call initialization on script load
initializeDb();

// --- API IMPLEMENTATION ---

// Wrapper to simulate async API calls
const simulate = <T,>(data: T): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), LATENCY));
};

const generateId = (prefix: string): string => `${prefix}-${new Date().getTime()}-${Math.random().toString(36).substr(2, 5)}`;

const addMovement = (db: any, shipId: string, portId: string, tripId: string, eventType: MovementEventType, details: any): void => {
    const newMovement: ShipMovement = {
        id: generateId('mov'),
        shipId, portId, tripId, eventType,
        timestamp: new Date().toISOString(),
        details,
    };
    if(!db.shipMovements) db.shipMovements = [];
    db.shipMovements.push(newMovement);
};


// --- User & Auth ---

export const getUsers = (): Promise<User[]> => {
    const db = getDb();
    return simulate(db.users || []);
};

export const loginUser = (name: string, password_provided: string, portId: string): Promise<User> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const db = getDb();
            const user = db.users.find((u: User) => u.name === name);

            if (!user) {
                return reject(new Error('User not found.'));
            }
            if (user.password !== password_provided) {
                return reject(new Error('Invalid password. (Hint: password is "password")'));
            }
            
            const port = db.ports.find((p: Port) => p.id === portId);
            if (!port) {
                return reject(new Error('Invalid port selected.'));
            }

            const historyEntry: LoginHistoryEntry = {
                id: generateId('log'),
                userId: user.id,
                userName: user.name,
                portId: port.id,
                portName: port.name,
                timestamp: new Date().toISOString(),
            };
            db.loginHistory.push(historyEntry);
            saveDb(db);

            resolve(JSON.parse(JSON.stringify(user)));
        }, LATENCY);
    });
};

export const logoutUser = (userId: string): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const db = getDb();
            const lastLogin = db.loginHistory
                .filter((h: LoginHistoryEntry) => h.userId === userId && !h.logoutTimestamp)
                .sort((a: LoginHistoryEntry, b: LoginHistoryEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            if (lastLogin) {
                lastLogin.logoutTimestamp = new Date().toISOString();
                db.loginHistory = db.loginHistory.map((h: LoginHistoryEntry) => h.id === lastLogin.id ? lastLogin : h);
                saveDb(db);
            }
            resolve();
        }, LATENCY);
    });
};


export const addUser = (userData: Omit<User, 'id'>): Promise<User> => {
    const db = getDb();
    const newUser: User = { ...userData, id: generateId('user') };
    db.users.push(newUser);
    saveDb(db);
    return simulate(newUser);
};

export const updateUser = (id: string, userData: User): Promise<User> => {
    const db = getDb();
    const userIndex = db.users.findIndex((u: User) => u.id === id);
    if (userIndex > -1) {
        db.users[userIndex] = { ...db.users[userIndex], ...userData };
        saveDb(db);
        return simulate(db.users[userIndex]);
    }
    return Promise.reject(new Error('User not found'));
};

export const updateOwnPassword = (userId: string, newPassword: string): Promise<User> => {
    const db = getDb();
    const userIndex = db.users.findIndex((u: User) => u.id === userId);
    if (userIndex > -1) {
        db.users[userIndex].password = newPassword;
        db.users[userIndex].forcePasswordChange = false;
        saveDb(db);
        return simulate(db.users[userIndex]);
    }
    return Promise.reject(new Error('User not found'));
};

export const deleteUser = (id: string): Promise<void> => {
    const db = getDb();
    db.users = db.users.filter((u: User) => u.id !== id);
    saveDb(db);
    return simulate(undefined);
};

export const getLoginHistory = (): Promise<LoginHistoryEntry[]> => {
    const db = getDb();
    return simulate(db.loginHistory || []);
};


// --- Ports ---

export const getPorts = (): Promise<Port[]> => {
    const db = getDb();
    return simulate(db.ports || []);
};

export const addPort = (portData: Omit<Port, 'id'>): Promise<Port> => {
    const db = getDb();
    const newPort = { ...portData, id: generateId('port') };
    db.ports.push(newPort);
    saveDb(db);
    return simulate(newPort);
};

export const updatePort = (id: string, portData: Port): Promise<Port> => {
    const db = getDb();
    db.ports = db.ports.map((p: Port) => p.id === id ? { ...p, ...portData } : p);
    saveDb(db);
    return simulate(portData);
};

// FIX: Added implementation for the deletePort function.
export const deletePort = (id: string): Promise<void> => {
    const db = getDb();
    // Also delete associated berths, ships, etc.
    db.ports = db.ports.filter((p: Port) => p.id !== id);
    db.berths = db.berths.filter((b: Berth) => b.portId !== id);
    db.ships = db.ships.filter((s: Ship) => s.portId !== id);
    db.trips = db.trips.filter((t: Trip) => t.portId !== id);
    db.shipMovements = db.shipMovements.filter((m: ShipMovement) => m.portId !== id);
    saveDb(db);
    return simulate(undefined);
};

// --- Berths ---
export const getBerths = (portId: string): Promise<Berth[]> => {
    const db = getDb();
    return simulate(db.berths.filter((b: Berth) => b.portId === portId) || []);
};

export const getAllBerths = (): Promise<Berth[]> => {
    const db = getDb();
    return simulate(db.berths || []);
};

export const addBerth = (portId: string, berthData: Omit<Berth, 'id' | 'portId'>): Promise<Berth> => {
    const db = getDb();
    const newBerth: Berth = { ...berthData, id: generateId('berth'), portId };
    db.berths.push(newBerth);
    saveDb(db);
    return simulate(newBerth);
};

export const updateBerth = (portId: string, id: string, berthData: Berth): Promise<Berth> => {
    const db = getDb();
    db.berths = db.berths.map((b: Berth) => b.id === id ? { ...b, ...berthData } : b);
    saveDb(db);
    return simulate(berthData);
};

export const deleteBerth = (portId: string, berthId: string): Promise<void> => {
    const db = getDb();
    db.berths = db.berths.filter((b: Berth) => b.id !== berthId);
    // Also unassign this berth from any ships
    db.ships = db.ships.map((s: Ship) => ({
        ...s,
        berthIds: s.berthIds.filter(id => id !== berthId)
    }));
    saveDb(db);
    return simulate(undefined);
};

// --- Ships ---
export const getShips = (portId: string): Promise<Ship[]> => {
    const db = getDb();
    return simulate(db.ships.filter((s: Ship) => s.portId === portId) || []);
};

export const getAllShips = (): Promise<Ship[]> => {
    const db = getDb();
    return simulate(db.ships || []);
};

export const addShip = (shipData: Omit<Ship, 'id'>): Promise<Ship> => {
    const db = getDb();
    const newTrip: Trip = {
        id: generateId('trip'),
        shipId: '', // will be set after ship is created
        portId: shipData.portId,
        arrivalTimestamp: shipData.eta,
        departureTimestamp: null,
        status: TripStatus.ACTIVE
    };

    const newShip: Ship = { ...shipData, id: generateId('ship'), currentTripId: newTrip.id };
    newTrip.shipId = newShip.id;

    db.ships.push(newShip);
    db.trips.push(newTrip);

    addMovement(db, newShip.id, newShip.portId, newTrip.id, MovementEventType.CREATED, { message: `Vessel registered in port.` });
    
    saveDb(db);
    return simulate(newShip);
};

export const updateShip = (id: string, shipData: Ship): Promise<Ship> => {
    const db = getDb();
    const shipIndex = db.ships.findIndex((s: Ship) => s.id === id);
    if (shipIndex > -1) {
        const oldShip = db.ships[shipIndex];
        // Create movement logs for changes
        if (oldShip.status !== shipData.status) {
            addMovement(db, id, shipData.portId, shipData.currentTripId!, MovementEventType.STATUS_CHANGE, { message: `Status changed from ${oldShip.status} to ${shipData.status}.`, fromStatus: oldShip.status, status: shipData.status });
        }
        if (JSON.stringify(oldShip.berthIds.sort()) !== JSON.stringify(shipData.berthIds.sort())) {
            const getBerthNames = (ids: string[]) => ids.map(berthId => db.berths.find((b: Berth) => b.id === berthId)?.name).filter(Boolean);
            addMovement(db, id, shipData.portId, shipData.currentTripId!, MovementEventType.BERTH_ASSIGNMENT, { message: `Berth assignment changed.`, fromBerthIds: oldShip.berthIds, berthIds: shipData.berthIds, fromBerthNames: getBerthNames(oldShip.berthIds), berthNames: getBerthNames(shipData.berthIds) });
        }
        if (oldShip.pilotId !== shipData.pilotId) {
            addMovement(db, id, shipData.portId, shipData.currentTripId!, MovementEventType.PILOT_ASSIGNMENT, { message: `Pilot assignment changed.`, fromPilotId: oldShip.pilotId, pilotId: shipData.pilotId });
        }
        if (oldShip.agentId !== shipData.agentId) {
            addMovement(db, id, shipData.portId, shipData.currentTripId!, MovementEventType.AGENT_ASSIGNMENT, { message: `Agent assignment changed.`, fromAgentId: oldShip.agentId, agentId: shipData.agentId });
        }
        
        db.ships[shipIndex] = { ...oldShip, ...shipData };

        // Handle trip completion
        if(shipData.status === ShipStatus.LEFT_PORT && oldShip.status !== ShipStatus.LEFT_PORT) {
            const tripIndex = db.trips.findIndex((t: Trip) => t.id === shipData.currentTripId);
            if(tripIndex > -1) {
                db.trips[tripIndex].status = TripStatus.COMPLETED;
                db.trips[tripIndex].departureTimestamp = new Date().toISOString();
            }
            db.ships[shipIndex].departureDate = new Date().toISOString();
        }

        saveDb(db);
        return simulate(db.ships[shipIndex]);
    }
    return Promise.reject(new Error('Ship not found'));
};

export const deleteShip = (portId: string, shipId: string): Promise<void> => {
    const db = getDb();
    db.ships = db.ships.filter((s: Ship) => s.id !== shipId);
    // Optionally delete related trips and movements for cleanliness
    db.trips = db.trips.filter((t: Trip) => t.shipId !== shipId);
    db.shipMovements = db.shipMovements.filter((m: ShipMovement) => m.shipId !== shipId);
    saveDb(db);
    return simulate(undefined);
};

// --- Trips ---
export const getTripsForPort = (portId: string): Promise<Trip[]> => {
    const db = getDb();
    const portTrips = db.trips.filter((t: Trip) => t.portId === portId) || [];
    // Enrich with ship details for directory view
    const enrichedTrips = portTrips.map((trip: Trip) => {
        const ship = db.ships.find((s: Ship) => s.id === trip.shipId);
        return {
            ...trip,
            vesselName: ship?.name,
            vesselImo: ship?.imo,
            agentId: ship?.agentId,
            pilotId: ship?.pilotId,
        };
    });
    return simulate(enrichedTrips);
};

export const updateTrip = (id: string, tripData: Trip): Promise<Trip> => {
    const db = getDb();
    const tripIndex = db.trips.findIndex((t: Trip) => t.id === id);
    if (tripIndex > -1) {
        db.trips[tripIndex] = { ...db.trips[tripIndex], ...tripData };
        
        // Also update the agent/pilot on the ship record for consistency
        const shipIndex = db.ships.findIndex((s: Ship) => s.id === db.trips[tripIndex].shipId);
        if(shipIndex > -1) {
            db.ships[shipIndex].agentId = tripData.agentId;
            db.ships[shipIndex].pilotId = tripData.pilotId;
        }

        saveDb(db);
        return simulate(db.trips[tripIndex]);
    }
    return Promise.reject(new Error('Trip not found'));
};

// --- Movements / History ---
export const getHistoryForPort = (portId: string): Promise<ShipMovement[]> => {
    const db = getDb();
    return simulate(db.shipMovements.filter((m: ShipMovement) => m.portId === portId).sort((a: ShipMovement, b: ShipMovement) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || []);
};

export const getShipHistory = (portId: string, shipId: string): Promise<ShipMovement[]> => {
    const db = getDb();
    return simulate(db.shipMovements.filter((m: ShipMovement) => m.shipId === shipId).sort((a: ShipMovement, b: ShipMovement) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || []);
};


// --- AIS ---
export const updateShipFromAIS = (aisData: AisData): Promise<Ship> => {
    const db = getDb();
    let ship = db.ships.find((s: Ship) => s.imo === aisData.imo && s.portId === aisData.portId);
    
    if (ship) {
        // Update existing ship
        const oldStatus = ship.status;
        ship.lat = aisData.lat ?? ship.lat;
        ship.lon = aisData.lon ?? ship.lon;
        ship.heading = aisData.heading ?? ship.heading;
        if(aisData.status && aisData.status !== ship.status) {
            ship.status = aisData.status;
            addMovement(db, ship.id, ship.portId, ship.currentTripId!, MovementEventType.STATUS_CHANGE, { message: `Status changed from ${oldStatus} to ${ship.status}.`, fromStatus: oldStatus, status: ship.status });
        }
        addMovement(db, ship.id, ship.portId, ship.currentTripId!, MovementEventType.AIS_UPDATE, { message: `Received AIS position update.` });
        db.ships = db.ships.map((s: Ship) => s.id === ship!.id ? ship : s);
    } else {
        // Create new ship from AIS data if it has enough info
        const newTrip: Trip = {
            id: generateId('trip'),
            shipId: '', // will be set after ship is created
            portId: aisData.portId,
            arrivalTimestamp: new Date().toISOString(),
            departureTimestamp: null,
            status: TripStatus.ACTIVE
        };
        ship = {
            id: generateId('ship'),
            portId: aisData.portId,
            imo: aisData.imo,
            name: aisData.name || `Vessel ${aisData.imo}`,
            type: aisData.type || 'Unknown',
            length: 150, // default
            draft: 8, // default
            flag: 'XX', // default
            eta: new Date().toISOString(),
            etd: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
            status: aisData.status || ShipStatus.APPROACHING,
            berthIds: [],
            hasDangerousGoods: false,
            lat: aisData.lat,
            lon: aisData.lon,
            heading: aisData.heading,
            currentTripId: newTrip.id,
        };
        newTrip.shipId = ship.id;
        db.ships.push(ship);
        db.trips.push(newTrip);
        addMovement(db, ship.id, ship.portId, newTrip.id, MovementEventType.CREATED, { message: `Vessel registered via AIS feed.` });
    }

    saveDb(db);
    return simulate(ship);
};
