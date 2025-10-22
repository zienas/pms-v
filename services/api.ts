// services/api.ts
// This file SIMULATES a backend API using localStorage.
// It is designed to be a drop-in replacement for a service that would make real HTTP requests.

import type {
  Ship, Berth, Port, User, ShipMovement, LoginHistoryEntry, Trip, AisData, InteractionLogEntry, InteractionEventType, View
} from '../types';
import { initialSeedData } from './seedData';
import { UserRole, ShipStatus, TripStatus, MovementEventType } from '../types';

const DB_KEY = 'pms_database';

// --- Database Simulation ---

const getDatabase = (): typeof initialSeedData => {
  try {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : initializeDatabase();
  } catch (error) {
    console.error("Error reading from localStorage, re-initializing database.", error);
    return initializeDatabase();
  }
};

const saveDatabase = (db: typeof initialSeedData): void => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error("Error writing to localStorage.", error);
  }
};

const initializeDatabase = (): typeof initialSeedData => {
  saveDatabase(initialSeedData);
  return initialSeedData;
};

// Ensure database is initialized on first load
if (!localStorage.getItem(DB_KEY)) {
  initializeDatabase();
}

// Helper to simulate network delay
const simulateDelay = (ms = 200) => new Promise(res => setTimeout(res, ms));


// --- User & Auth ---

export const getUsers = async (): Promise<User[]> => {
  await simulateDelay();
  const db = getDatabase();
  return db.users.map(({ password, ...user }) => user); // Don't send password to client
};

export const loginUser = async (name: string, password_provided: string, portId: string): Promise<User> => {
    await simulateDelay(500);
    const db = getDatabase();
    const user = db.users.find(u => u.name === name);

    if (!user || user.password !== password_provided) {
        throw new Error('Invalid username or password.');
    }

    if (user.role !== UserRole.ADMIN && user.portId !== portId) {
        throw new Error('User not assigned to this port.');
    }

    const portName = db.ports.find(p => p.id === portId)?.name || 'N/A';
    const newHistoryEntry: LoginHistoryEntry = {
        id: `hist-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        portId: portId,
        portName: portName,
        timestamp: new Date().toISOString(),
    };
    db.loginHistory.push(newHistoryEntry);
    saveDatabase(db);
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = user;
    return userToReturn;
};

export const logoutUser = async (userId: string): Promise<void> => {
    await simulateDelay();
    const db = getDatabase();
    const lastLogin = db.loginHistory
        .filter(h => h.userId === userId && !h.logoutTimestamp)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (lastLogin) {
        lastLogin.logoutTimestamp = new Date().toISOString();
        saveDatabase(db);
    }
};

export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    await simulateDelay();
    const db = getDatabase();
    const newUser: User = {
        ...userData,
        id: `user-${Date.now()}`,
        // By default, non-admins require a password change
        forcePasswordChange: userData.role !== UserRole.ADMIN,
    };
    db.users.push(newUser);
    saveDatabase(db);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = newUser;
    return userToReturn;
};

export const updateUser = async (id: string, userData: User): Promise<User> => {
    await simulateDelay();
    const db = getDatabase();
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('User not found.');
    
    // Preserve original password if not provided in update
    const newPassword = userData.password ? userData.password : db.users[userIndex].password;

    db.users[userIndex] = { ...db.users[userIndex], ...userData, password: newPassword };
    saveDatabase(db);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = db.users[userIndex];
    return userToReturn;
};

export const updateOwnPassword = async (userId: string, newPassword: string): Promise<User> => {
    await simulateDelay();
    const db = getDatabase();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found.");
    user.password = newPassword;
    user.forcePasswordChange = false; // Clear the flag
    saveDatabase(db);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = user;
    return userToReturn;
};

export const deleteUser = async (id: string): Promise<void> => {
    await simulateDelay();
    const db = getDatabase();
    db.users = db.users.filter(u => u.id !== id);
    saveDatabase(db);
};

export const getLoginHistory = async (): Promise<LoginHistoryEntry[]> => {
    await simulateDelay();
    return getDatabase().loginHistory;
};

// --- Interaction Logs ---
export const logInteraction = async (entry: Omit<InteractionLogEntry, 'id' | 'timestamp'>): Promise<InteractionLogEntry> => {
    // No delay for logging to not slow down UI
    const db = getDatabase();
    const newLog: InteractionLogEntry = {
        ...entry,
        id: `int-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
    };
    db.interactionLog.unshift(newLog);
    // To avoid performance issues, cap the log size
    if (db.interactionLog.length > 1000) {
        db.interactionLog = db.interactionLog.slice(0, 1000);
    }
    saveDatabase(db);
    return newLog;
};

export const getInteractionLogs = async (portId: string): Promise<InteractionLogEntry[]> => {
    await simulateDelay();
    return getDatabase().interactionLog.filter(log => log.portId === portId);
};


// --- Ports ---

export const getPorts = async (): Promise<Port[]> => {
    await simulateDelay();
    return getDatabase().ports;
};

export const addPort = async (portData: Omit<Port, 'id'>): Promise<Port> => {
    await simulateDelay();
    const db = getDatabase();
    const newPort: Port = { ...portData, id: `port-${Date.now()}` };
    db.ports.push(newPort);
    saveDatabase(db);
    return newPort;
};

export const updatePort = async (id: string, portData: Port): Promise<Port> => {
    await simulateDelay();
    const db = getDatabase();
    const index = db.ports.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Port not found.');
    db.ports[index] = { ...db.ports[index], ...portData };
    saveDatabase(db);
    return db.ports[index];
};

export const deletePort = async (id: string): Promise<void> => {
    await simulateDelay();
    const db = getDatabase();
    db.ports = db.ports.filter(p => p.id !== id);
    db.berths = db.berths.filter(b => b.portId !== id);
    db.ships = db.ships.filter(s => s.portId !== id);
    db.movements = db.movements.filter(m => m.portId !== id);
    saveDatabase(db);
};

// --- Berths ---
export const getBerths = async (portId: string): Promise<Berth[]> => {
    await simulateDelay();
    return getDatabase().berths.filter(b => b.portId === portId);
};

export const getAllBerths = async (): Promise<Berth[]> => {
    await simulateDelay();
    return getDatabase().berths;
};

export const addBerth = async (portId: string, berthData: Omit<Berth, 'id' | 'portId'>): Promise<Berth> => {
    await simulateDelay();
    const db = getDatabase();
    const newBerth: Berth = { ...berthData, id: `berth-${Date.now()}`, portId };
    db.berths.push(newBerth);
    saveDatabase(db);
    return newBerth;
};

export const updateBerth = async (portId: string, id: string, berthData: Berth): Promise<Berth> => {
    await simulateDelay();
    const db = getDatabase();
    const index = db.berths.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Berth not found.');
    db.berths[index] = { ...db.berths[index], ...berthData };
    saveDatabase(db);
    return db.berths[index];
};

export const deleteBerth = async (portId: string, berthId: string): Promise<void> => {
    await simulateDelay();
    const db = getDatabase();
    db.berths = db.berths.filter(b => b.id !== berthId);
    saveDatabase(db);
};

// --- Ships ---
export const getShips = async (portId: string): Promise<Ship[]> => {
    await simulateDelay();
    return getDatabase().ships.filter(s => s.portId === portId);
};

export const getAllShips = async (): Promise<Ship[]> => {
    await simulateDelay();
    return getDatabase().ships;
};

const createMovement = (db: typeof initialSeedData, ship: Ship, eventType: MovementEventType, details: ShipMovement['details']): void => {
    const movement: ShipMovement = {
        id: `mov-${Date.now()}-${Math.random()}`,
        shipId: ship.id,
        portId: ship.portId,
        tripId: ship.currentTripId || 'unknown-trip',
        eventType,
        timestamp: new Date().toISOString(),
        details,
    };
    db.movements.unshift(movement);
};

export const addShip = async (shipData: Omit<Ship, 'id'>): Promise<Ship> => {
    await simulateDelay();
    const db = getDatabase();
    
    // Create new Trip
    const newTrip: Trip = {
        id: `trip-${Date.now()}`,
        shipId: '', // Will be set below
        portId: shipData.portId,
        arrivalTimestamp: shipData.eta,
        departureTimestamp: null,
        status: TripStatus.ACTIVE,
        vesselName: shipData.name,
        vesselImo: shipData.imo,
    };
    
    const newShip: Ship = {
        ...shipData,
        id: `ship-${Date.now()}`,
        currentTripId: newTrip.id,
    };
    newTrip.shipId = newShip.id;

    db.ships.push(newShip);
    db.trips.push(newTrip);
    createMovement(db, newShip, MovementEventType.CREATED, { message: `Vessel ${newShip.name} was registered in the system.` });
    saveDatabase(db);
    return newShip;
};

export const updateShip = async (id: string, shipData: Ship): Promise<Ship> => {
    await simulateDelay();
    const db = getDatabase();
    const index = db.ships.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Ship not found.');
    const oldShip = { ...db.ships[index] };
    db.ships[index] = { ...oldShip, ...shipData };
    const updatedShip = db.ships[index];

    // Status Change
    if (oldShip.status !== updatedShip.status) {
        createMovement(db, updatedShip, MovementEventType.STATUS_CHANGE, {
            message: `Status changed from ${oldShip.status} to ${updatedShip.status}.`,
            fromStatus: oldShip.status,
            status: updatedShip.status
        });
        if (updatedShip.status === ShipStatus.LEFT_PORT) {
            updatedShip.departureDate = new Date().toISOString();
            const trip = db.trips.find(t => t.id === updatedShip.currentTripId);
            if (trip) {
                trip.status = TripStatus.COMPLETED;
                trip.departureTimestamp = updatedShip.departureDate;
            }
            updatedShip.currentTripId = undefined; // Clear trip ID on departure
        }
    }
    
    // Berth Assignment Change
    const oldBerths = JSON.stringify((oldShip.berthIds || []).sort());
    const newBerths = JSON.stringify((updatedShip.berthIds || []).sort());
    if (oldBerths !== newBerths) {
        const berthNames = (ids: string[]) => ids.map(id => db.berths.find(b => b.id === id)?.name).filter(Boolean);
        createMovement(db, updatedShip, MovementEventType.BERTH_ASSIGNMENT, {
            message: `Berth assignment changed from ${berthNames(oldShip.berthIds).join(', ') || 'None'} to ${berthNames(updatedShip.berthIds).join(', ') || 'None'}.`,
            fromBerthIds: oldShip.berthIds,
            berthIds: updatedShip.berthIds,
            fromBerthNames: berthNames(oldShip.berthIds),
            berthNames: berthNames(updatedShip.berthIds),
            pilotId: updatedShip.pilotId,
        });
    }

    // Pilot Assignment Change
    if (oldShip.pilotId !== updatedShip.pilotId) {
         createMovement(db, updatedShip, MovementEventType.PILOT_ASSIGNMENT, {
            message: `Pilot changed from ${db.users.find(u=>u.id === oldShip.pilotId)?.name || 'None'} to ${db.users.find(u=>u.id === updatedShip.pilotId)?.name || 'None'}.`,
            fromPilotId: oldShip.pilotId,
            pilotId: updatedShip.pilotId,
        });
    }

    // Agent Assignment Change
    if (oldShip.agentId !== updatedShip.agentId) {
        createMovement(db, updatedShip, MovementEventType.AGENT_ASSIGNMENT, {
            message: `Agent changed from ${db.users.find(u=>u.id === oldShip.agentId)?.name || 'None'} to ${db.users.find(u=>u.id === updatedShip.agentId)?.name || 'None'}.`,
            fromAgentId: oldShip.agentId,
            agentId: updatedShip.agentId,
        });
    }

    saveDatabase(db);
    return updatedShip;
};

export const deleteShip = async (portId: string, shipId: string): Promise<void> => {
    await simulateDelay();
    const db = getDatabase();
    db.ships = db.ships.filter(s => s.id !== shipId);
    db.movements = db.movements.filter(m => m.shipId !== shipId);
    saveDatabase(db);
};

// --- Trips ---
export const getTripsForPort = async (portId: string): Promise<Trip[]> => {
    await simulateDelay();
    return getDatabase().trips.filter(t => t.portId === portId);
};

export const updateTrip = async (id: string, tripData: Trip): Promise<Trip> => {
    await simulateDelay();
    const db = getDatabase();
    const index = db.trips.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Trip not found.');
    db.trips[index] = { ...db.trips[index], ...tripData };
    saveDatabase(db);
    return db.trips[index];
};


// --- Movements / History ---
export const getHistoryForPort = async (portId: string): Promise<ShipMovement[]> => {
    await simulateDelay();
    return getDatabase().movements.filter(m => m.portId === portId);
};

export const getShipHistory = async (portId: string, shipId: string): Promise<ShipMovement[]> => {
    await simulateDelay();
    return getDatabase().movements.filter(m => m.shipId === shipId);
};

// --- AIS ---
export const updateShipFromAIS = async (aisData: AisData): Promise<Ship> => {
    await simulateDelay(50); // AIS updates should be fast
    const db = getDatabase();
    
    let ship = db.ships.find(s => s.imo === aisData.imo);

    if (ship) { // Update existing ship
        const oldStatus = ship.status;
        ship.lat = aisData.lat ?? ship.lat;
        ship.lon = aisData.lon ?? ship.lon;
        ship.heading = aisData.heading ?? ship.heading;
        ship.name = aisData.name ?? ship.name;
        ship.type = aisData.type ?? ship.type;
        if (aisData.status && aisData.status !== ship.status) {
            ship.status = aisData.status;
            createMovement(db, ship, MovementEventType.STATUS_CHANGE, {
                message: `Status updated from AIS: ${oldStatus} to ${ship.status}.`,
                fromStatus: oldStatus,
                status: ship.status
            });
        }
        createMovement(db, ship, MovementEventType.AIS_UPDATE, { message: 'Received AIS position update.' });
    } else { // Create new ship from AIS data
         // Ensure we have a name before creating
        if (!aisData.name) throw new Error("Cannot create ship from AIS without a name.");
        
        const newTrip: Trip = {
            id: `trip-${Date.now()}`, shipId: '', portId: aisData.portId,
            arrivalTimestamp: new Date().toISOString(), departureTimestamp: null,
            status: TripStatus.ACTIVE, vesselName: aisData.name, vesselImo: aisData.imo,
        };
        
        const newShip: Ship = {
            id: `ship-${Date.now()}`,
            portId: aisData.portId,
            imo: aisData.imo,
            name: aisData.name,
            type: aisData.type || 'Unknown',
            status: ShipStatus.APPROACHING,
            lat: aisData.lat,
            lon: aisData.lon,
            heading: aisData.heading,
            currentTripId: newTrip.id,
            // Defaults for new ships
            length: 150, draft: 8, flag: 'N/A',
            eta: new Date().toISOString(),
            etd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            berthIds: [],
            hasDangerousGoods: false,
        };
        newTrip.shipId = newShip.id;
        db.ships.push(newShip);
        db.trips.push(newTrip);
        createMovement(db, newShip, MovementEventType.CREATED, { message: `Vessel ${newShip.name} registered via AIS feed.` });
        ship = newShip;
    }
    
    saveDatabase(db);
    return ship;
};