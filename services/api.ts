// services/api.ts
// This file simulates a backend API using the browser's localStorage.
// It now includes a built-in seeding mechanism for a default port and admin user.

import {
  Ship, Berth, Port, User, ShipMovement, LoginHistoryEntry, Trip, AisData,
  UserRole, ShipStatus, BerthType, MovementEventType, TripStatus
} from '../types';

const DB_KEY = 'pms_database';

// --- DATABASE SIMULATION (localStorage) ---

// Helper to get the database from localStorage
function getDb() {
  try {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
      const db = JSON.parse(data);
      // Ensure all keys exist to prevent runtime errors on schema updates
      return {
        ports: [], ships: [], berths: [], users: [], trips: [], movements: [], loginHistory: [],
        ...db,
      };
    }
  } catch (e) {
    console.error("Failed to parse localStorage data:", e);
  }
  // Return a default empty structure if localStorage is empty or corrupt
  return { ports: [], ships: [], berths: [], users: [], trips: [], movements: [], loginHistory: [] };
}

// Helper to save the database to localStorage
function saveDb(db: any) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Failed to save data to localStorage:", e);
  }
}

// --- PASSWORD HASHING SIMULATION ---
// In a real backend, you would use a library like bcryptjs.
// This is a simple, non-secure simulation for demonstration purposes.
const hashPassword = (password: string) => `hashed$${password.split('').reverse().join('')}`;
const comparePassword = (password: string, hash: string) => hash === `hashed$${password.split('').reverse().join('')}`;


// --- INITIALIZE & SEED DATABASE ---
let db = getDb();

// Seed data if the database is empty (e.g., first run)
if (!db.ports || db.ports.length === 0) {
  console.log("No ports found in localStorage. Seeding initial built-in data.");

  const BUILT_IN_PORT_ID = 'port-sg';
  const BUILT_IN_ADMIN_ID = 'user-admin-01';

  const defaultPort: Port = {
    id: BUILT_IN_PORT_ID,
    name: "Port of Singapore (Demo)",
    lat: 1.2647,
    lon: 103.8225,
    geometry: [
      [1.25, 103.8], [1.28, 103.8], [1.28, 103.85], [1.25, 103.85]
    ],
  };

  const defaultAdmin: User = {
    id: BUILT_IN_ADMIN_ID,
    name: 'admin',
    role: UserRole.ADMIN,
    password: hashPassword('password'),
    forcePasswordChange: false, // Admin does not need to change password
  };
  
  const defaultOperator: User = {
    id: 'user-op-01',
    name: 'operator',
    role: UserRole.OPERATOR,
    password: hashPassword('password'),
    portId: BUILT_IN_PORT_ID,
    forcePasswordChange: true,
  };
  
  const defaultSupervisor: User = {
    id: 'user-sup-01',
    name: 'supervisor',
    role: UserRole.SUPERVISOR,
    password: hashPassword('password'),
    portId: BUILT_IN_PORT_ID,
    forcePasswordChange: true,
  };

  db.ports = [defaultPort];
  db.users = [defaultAdmin, defaultOperator, defaultSupervisor];
  
  // Initialize other tables to prevent errors on a fresh start
  db.berths = [];
  db.ships = [];
  db.trips = [];
  db.movements = [];
  db.loginHistory = [];

  saveDb(db);
}

// Simple unique ID generator for simulation
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- API IMPLEMENTATION ---

// --- User & Auth ---

export const getUsers = async (): Promise<User[]> => {
  await delay(100);
  // Never send password hashes/strings to the client part of the application
  return db.users.map(({ password, ...user }) => user) as User[];
};

export const loginUser = async (name: string, password_provided: string, portId: string): Promise<User> => {
  await delay(500);
  const user = db.users.find(u => u.name === name);
  
  if (!user || !comparePassword(password_provided, user.password!)) {
    throw new Error('Invalid username or password.');
  }

  // Admins can log into any port context; other users must be assigned to the selected port.
  if (user.role !== UserRole.ADMIN && user.portId !== portId) {
    throw new Error('User not assigned to this port.');
  }
  
  const loginEntry: LoginHistoryEntry = {
    id: newId('login'),
    userId: user.id,
    userName: user.name,
    portId: portId,
    portName: db.ports.find(p => p.id === portId)?.name || 'Admin View',
    timestamp: new Date().toISOString(),
  };
  db.loginHistory.unshift(loginEntry); // Add to the top of the list
  saveDb(db);

  const { password, ...userToReturn } = user;
  return userToReturn as User;
};

export const logoutUser = async (userId: string): Promise<void> => {
    await delay(100);
    const lastLogin = db.loginHistory
      .find(entry => entry.userId === userId && !entry.logoutTimestamp);
  
    if (lastLogin) {
      lastLogin.logoutTimestamp = new Date().toISOString();
      saveDb(db);
    }
};

export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    await delay(300);
    if (!userData.password) throw new Error("Password is required for new users.");
    const newUser: User = { 
        ...userData, 
        id: newId('user'), 
        forcePasswordChange: true,
        password: hashPassword(userData.password) 
    };
    db.users.push(newUser);
    saveDb(db);
    const { password, ...userToReturn } = newUser;
    return userToReturn as User;
};

export const updateUser = async (id: string, userData: User): Promise<User> => {
    await delay(300);
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error("User not found");
  
    const existingUser = db.users[userIndex];
    
    // Admins can reset passwords, which should force a change for non-admin roles.
    let forcePasswordChange = existingUser.forcePasswordChange;
    if (userData.password && userData.role !== UserRole.ADMIN) {
        forcePasswordChange = true;
    }
    
    // If a new password is provided, hash it. Otherwise, keep the existing one.
    const password = userData.password ? hashPassword(userData.password) : existingUser.password;

    db.users[userIndex] = { ...existingUser, ...userData, password, forcePasswordChange };
    saveDb(db);
    
    const { password: _, ...userToReturn } = db.users[userIndex];
    return userToReturn as User;
};

export const updateOwnPassword = async (userId: string, newPassword: string): Promise<User> => {
    await delay(300);
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");

    db.users[userIndex].password = hashPassword(newPassword);
    db.users[userIndex].forcePasswordChange = false; // The flag is now cleared
    saveDb(db);
    
    const { password, ...userToReturn } = db.users[userIndex];
    return userToReturn as User;
};

export const deleteUser = async (id: string): Promise<void> => {
    await delay(300);
    db.users = db.users.filter(u => u.id !== id);
    saveDb(db);
};

export const getLoginHistory = async (): Promise<LoginHistoryEntry[]> => {
    await delay(100);
    return [...db.loginHistory].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// --- Ports ---

export const getPorts = async (): Promise<Port[]> => { await delay(100); return db.ports; };

export const addPort = async (portData: Omit<Port, 'id'>): Promise<Port> => {
    await delay(200);
    const newPort: Port = { ...portData, id: newId('port') };
    db.ports.push(newPort);
    saveDb(db);
    return newPort;
};

export const updatePort = async (id: string, portData: Port): Promise<Port> => {
    await delay(200);
    const index = db.ports.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Port not found');
    db.ports[index] = { ...db.ports[index], ...portData };
    saveDb(db);
    return db.ports[index];
};

export const deletePort = async (id: string): Promise<void> => {
    await delay(200);
    db.ports = db.ports.filter(p => p.id !== id);
    db.berths = db.berths.filter(b => b.portId !== id);
    db.ships = db.ships.filter(s => s.portId !== id);
    db.trips = db.trips.filter(t => t.portId !== id);
    db.movements = db.movements.filter(m => m.portId !== id);
    saveDb(db);
};

// --- Berths ---

export const getAllBerths = async (): Promise<Berth[]> => { await delay(100); return db.berths; };
export const getBerths = async (portId: string): Promise<Berth[]> => { await delay(100); return db.berths.filter(b => b.portId === portId); };

export const addBerth = async (portId: string, berthData: Omit<Berth, 'id' | 'portId'>): Promise<Berth> => {
    await delay(200);
    const newBerth: Berth = { ...berthData, id: newId('berth'), portId };
    db.berths.push(newBerth);
    saveDb(db);
    return newBerth;
};

export const updateBerth = async (portId: string, id: string, berthData: Berth): Promise<Berth> => {
    await delay(200);
    const index = db.berths.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Berth not found');
    db.berths[index] = { ...db.berths[index], ...berthData };
    saveDb(db);
    return db.berths[index];
};

export const deleteBerth = async (portId: string, berthId: string): Promise<void> => {
    await delay(200);
    db.berths = db.berths.filter(b => b.id !== berthId);
    db.ships.forEach(ship => { ship.berthIds = ship.berthIds.filter(id => id !== berthId); });
    saveDb(db);
};

// --- Ships & Movements ---

const createMovement = (ship: Ship, eventType: MovementEventType, details: string, changes: Partial<ShipMovement['details']> = {}) => {
  if (!ship.currentTripId) {
      console.warn("Attempted to create a movement for a ship with no current trip ID:", ship.name);
      return;
  }
  const movement: ShipMovement = {
    id: newId('mov'), shipId: ship.id, portId: ship.portId, tripId: ship.currentTripId,
    eventType, timestamp: new Date().toISOString(), details: { message: details, ...changes },
  };
  db.movements.push(movement);
};

export const getAllShips = async (): Promise<Ship[]> => { await delay(50); return db.ships; };
export const getShips = async (portId: string): Promise<Ship[]> => { await delay(100); return db.ships.filter(s => s.portId === portId); };

export const addShip = async (shipData: Omit<Ship, 'id'>): Promise<Ship> => {
    await delay(200);
    const newTrip: Trip = {
        id: newId('trip'), shipId: '', portId: shipData.portId,
        arrivalTimestamp: shipData.eta, departureTimestamp: null, status: TripStatus.ACTIVE,
    };
    const newShip: Ship = { ...shipData, id: newId('ship'), currentTripId: newTrip.id };
    newTrip.shipId = newShip.id;
    
    db.ships.push(newShip);
    db.trips.push(newTrip);

    createMovement(newShip, MovementEventType.CREATED, `Vessel ${newShip.name} registered.`);
    if (newShip.berthIds.length > 0) createMovement(newShip, MovementEventType.BERTH_ASSIGNMENT, `Assigned to berths: ${newShip.berthIds.map(id => db.berths.find(b => b.id === id)?.name).join(', ')}.`, { berthIds: newShip.berthIds, berthNames: newShip.berthIds.map(id => db.berths.find(b => b.id === id)?.name) });
    
    saveDb(db);
    return newShip;
};

export const updateShip = async (id: string, shipData: Ship): Promise<Ship> => {
    await delay(200);
    const index = db.ships.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Ship not found');
    const oldShip = { ...db.ships[index] };
    db.ships[index] = { ...oldShip, ...shipData };
    const newShip = db.ships[index];
    
    if (oldShip.status !== newShip.status) createMovement(newShip, MovementEventType.STATUS_CHANGE, `Status changed from ${oldShip.status} to ${newShip.status}.`, { fromStatus: oldShip.status, status: newShip.status });
    if (JSON.stringify(oldShip.berthIds.sort()) !== JSON.stringify(newShip.berthIds.sort())) createMovement(newShip, MovementEventType.BERTH_ASSIGNMENT, `Berth changed.`, { fromBerthIds: oldShip.berthIds, berthIds: newShip.berthIds, fromBerthNames: oldShip.berthIds.map(id => db.berths.find(b => b.id === id)?.name), berthNames: newShip.berthIds.map(id => db.berths.find(b => b.id === id)?.name) });
    if (oldShip.pilotId !== newShip.pilotId) createMovement(newShip, MovementEventType.PILOT_ASSIGNMENT, `Pilot changed.`, { fromPilotId: oldShip.pilotId, pilotId: newShip.pilotId });
    if (oldShip.agentId !== newShip.agentId) createMovement(newShip, MovementEventType.AGENT_ASSIGNMENT, `Agent changed.`, { fromAgentId: oldShip.agentId, agentId: newShip.agentId });

    if (newShip.status === ShipStatus.LEFT_PORT && oldShip.status !== ShipStatus.LEFT_PORT) {
        const trip = db.trips.find(t => t.id === newShip.currentTripId);
        if (trip) {
            trip.status = TripStatus.COMPLETED;
            trip.departureTimestamp = new Date().toISOString();
        }
        newShip.currentTripId = undefined;
    }

    saveDb(db);
    return newShip;
};

export const deleteShip = async (portId: string, shipId: string): Promise<void> => {
    await delay(200);
    db.ships = db.ships.filter(s => s.id !== shipId);
    db.trips = db.trips.filter(t => t.shipId !== shipId);
    db.movements = db.movements.filter(m => m.shipId !== shipId);
    saveDb(db);
};

export const updateShipFromAIS = async (aisData: AisData): Promise<Ship> => {
    await delay(50);
    let ship = db.ships.find(s => s.imo === aisData.imo && s.portId === aisData.portId);
    if (ship) {
        ship.lat = aisData.lat ?? ship.lat;
        ship.lon = aisData.lon ?? ship.lon;
        ship.heading = aisData.heading ?? ship.heading;
        if(aisData.status && ship.status !== aisData.status) {
            ship.status = aisData.status;
            createMovement(ship, MovementEventType.STATUS_CHANGE, `Status changed from ${ship.status} to ${aisData.status} via AIS.`, { fromStatus: ship.status, status: aisData.status });
        }
        createMovement(ship, MovementEventType.AIS_UPDATE, `Received AIS position update.`);
    } else {
        const newTrip: Trip = { id: newId('trip'), shipId: '', portId: aisData.portId, arrivalTimestamp: new Date().toISOString(), departureTimestamp: null, status: TripStatus.ACTIVE };
        const newShip: Ship = {
            id: newId('ship'), portId: aisData.portId, imo: aisData.imo, name: aisData.name || `Vessel ${aisData.imo}`,
            type: aisData.type || 'Unknown', length: 100, draft: 5, flag: 'N/A',
            eta: new Date().toISOString(), etd: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            status: ShipStatus.APPROACHING, berthIds: [], hasDangerousGoods: false, lat: aisData.lat, lon: aisData.lon,
            heading: aisData.heading,
            currentTripId: newTrip.id,
        };
        newTrip.shipId = newShip.id;
        db.ships.push(newShip);
        db.trips.push(newTrip);
        createMovement(newShip, MovementEventType.CREATED, `Vessel ${newShip.name} created from AIS feed.`);
        ship = newShip;
    }
    saveDb(db);
    return ship;
};

// --- History & Trips ---

export const getShipHistory = async (portId: string, shipId: string): Promise<ShipMovement[]> => { await delay(100); return [...db.movements.filter(m => m.shipId === shipId)].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); };
export const getHistoryForPort = async (portId: string): Promise<ShipMovement[]> => { await delay(100); return db.movements.filter(m => m.portId === portId); };

export const getTripsForPort = async (portId: string): Promise<Trip[]> => { 
    await delay(100); 
    return db.trips.filter(t => t.portId === portId).map(trip => {
        const ship = db.ships.find(s => s.id === trip.shipId);
        return {
            ...trip,
            vesselName: ship?.name || 'Unknown',
            vesselImo: ship?.imo || 'N/A',
        };
    });
};

export const updateTrip = async (id: string, tripData: Trip): Promise<Trip> => {
    await delay(200);
    const index = db.trips.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Trip not found');
    const oldTrip = { ...db.trips[index] };
    db.trips[index] = { ...oldTrip, ...tripData };
    const newTrip = db.trips[index];

    // Also update ship if agent/pilot changed on trip
    const ship = db.ships.find(s => s.id === newTrip.shipId);
    if(ship) {
        if(oldTrip.agentId !== newTrip.agentId) ship.agentId = newTrip.agentId;
        if(oldTrip.pilotId !== newTrip.pilotId) ship.pilotId = newTrip.pilotId;
    }

    saveDb(db);
    // Return enriched trip data
    const shipInfo = db.ships.find(s => s.id === newTrip.shipId);
    return {
        ...newTrip,
        vesselName: shipInfo?.name || 'Unknown',
        vesselImo: shipInfo?.imo || 'N/A',
    };
};