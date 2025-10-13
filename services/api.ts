
import {
    Ship, Berth, Port, User, ShipMovement, LoginHistoryEntry, Trip, AisData,
    ShipStatus, BerthType, UserRole, MovementEventType, TripStatus
} from '../types';

// --- DATABASE SIMULATION ---

const uuid = () => `id-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;

interface Database {
    ports: Port[];
    berths: Berth[];
    ships: Ship[];
    users: User[];
    shipMovements: ShipMovement[];
    loginHistory: LoginHistoryEntry[];
    trips: Trip[];
}

const DB_KEY = 'pms_database';

const getDB = (): Database => {
    try {
        const data = localStorage.getItem(DB_KEY);
        if (data) return JSON.parse(data);
    } catch (error) { console.error("Failed to read from localStorage", error); }
    return { ports: [], berths: [], ships: [], users: [], shipMovements: [], loginHistory: [], trips: [] };
};

const saveDB = (db: Database) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (error) { console.error("Failed to save to localStorage", error); }
};

const seedData = () => {
    let db = getDB();
    if (db.ports.length > 0) return;

    console.log("Seeding initial database...");

    const portId1 = 'port-sg';
    const port1: Port = {
        id: portId1,
        name: 'Port of Singapore',
        lat: 1.264722,
        lon: 103.8225,
        geometry: [[1.27, 103.81], [1.275, 103.83], [1.26, 103.84], [1.25, 103.82]],
        logoImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBmaWxsPSIjRkYyNDFEMiIgZD0iTTUwIDBDMjIuNCAwIDAgMjIuNCAwIDUwczIyLjQgNTAgNTAgNTBzNTAtMjIuNCA1MC01MFM3Ny42IDAgNTAgMHptMCA5MC45QzI3LjUgOTAuOSAxMS40IDc0LjcgMTEuNCA1MFM3LjUgOS4xIDUwIDkuMXM4LjYgMTYuMSAzOC42IDQwLjlDODguNiA3NC43IDcyLjUgOTAuOSA1MCA5MC45eiIvPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik01MCAxMS40QzI4LjYgMTEuNCAxMS40IDI4LjYgMTEuNCA1MHMxNy4yIDM4LjYgMzguNiAzOC42UzI4LjYgODguNiA4OC42IDUwIDcxLjQgMTEuNCA1MCAxMS40em0wIDc1LjdjLTE4LjkgMC0zNC4yLTE1LjMtMzQuMi0zNC4yUzMxLjEgMTUuOCA1MCAxNS44czM0LjIgMTUuMyAzNC4yIDM0LjJTNjguOSA4Ny4xIDUwIDg3LjF6Ii8+PHBhdGggZmlsbD0iI0ZGMjQxRDIiIGQ9Ik01MCAyN2MyLjYgMCA0LjcgMi4xIDQuNyA0Ljczcy0yLjEgNC43My00LjcgNC43My00LjctMi4xLTQuNy00LjczIDIuMS00LjczIDQuNy00Ljczem0wIDExLjhjLTQgMC03LjIgMy4yLTYuOSA3LjNsLjcgOS43YzAgMS43IDEuNCAzLjEgMy4xIDMuMWg2LjJjMS43IDAgMy4xLTEuNCAzLjEtMy4xbC43LTkuN2MuMy00LjEtMi45LTcuMy02LjktNy4zeiIvPjwvc3ZnPg==',
    };
    const portId2 = 'port-rt';
     const port2: Port = {
        id: portId2,
        name: 'Port of Rotterdam',
        lat: 51.9472,
        lon: 4.1444,
    };
    db.ports.push(port1, port2);

    const users: User[] = [
        { id: uuid(), name: 'Admin User', role: UserRole.ADMIN, password: 'password' },
        { id: uuid(), name: 'SG Operator', role: UserRole.OPERATOR, password: 'password', portId: portId1 },
        { id: uuid(), name: 'RT Operator', role: UserRole.OPERATOR, password: 'password', portId: portId2 },
        { id: uuid(), name: 'Capt. Ahab (SG)', role: UserRole.CAPTAIN, password: 'password', portId: portId1 },
        { id: uuid(), name: 'Maritime Agent (SG)', role: UserRole.AGENT, password: 'password', portId: portId1 },
        { id: uuid(), name: 'John Smith (Pilot)', role: UserRole.PILOT, password: 'password', portId: portId1 },
        { id: uuid(), name: 'Jane Doe (Pilot)', role: UserRole.PILOT, password: 'password', portId: portId1 },
    ];
    db.users = users;

    const berths: Berth[] = [
        { id: 'berth-sg-1', portId: portId1, name: 'Tanjong Pagar 1', type: BerthType.BERTH, maxLength: 300, maxDraft: 15, equipment: ['Crane'], quayId: 'tanjong-pagar', positionOnQuay: 1, geometry: [[1.265, 103.821], [1.2655, 103.8215]] },
        { id: 'berth-sg-2', portId: portId1, name: 'Tanjong Pagar 2', type: BerthType.BERTH, maxLength: 300, maxDraft: 15, equipment: ['Crane'], quayId: 'tanjong-pagar', positionOnQuay: 2, geometry: [[1.2655, 103.8215], [1.266, 103.822]] },
        { id: 'anchor-sg-1', portId: portId1, name: 'Western Anchorage', type: BerthType.ANCHORAGE, maxLength: 500, maxDraft: 20, equipment: [], quayId: 'anchorage', positionOnQuay: 1 },
        { id: 'berth-rt-1', portId: portId2, name: 'Euromax Terminal 1', type: BerthType.QUAY, maxLength: 400, maxDraft: 18, equipment: ['Gantry Crane'], quayId: 'euromax', positionOnQuay: 1 },
    ];
    db.berths = berths;

    const ship1: Ship = { id: 'ship-1', portId: portId1, name: 'Evergreen', imo: '9811000', type: 'Container Ship', length: 350, draft: 14, flag: 'PA', eta: new Date().toISOString(), etd: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(), status: ShipStatus.APPROACHING, berthIds: [], hasDangerousGoods: false, lat: 1.24, lon: 103.85 };
    const ship2: Ship = { id: 'ship-2', portId: portId1, name: 'Maersk', imo: '9784561', type: 'Container Ship', length: 290, draft: 13, flag: 'DK', eta: new Date().toISOString(), etd: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), status: ShipStatus.DOCKED, berthIds: ['berth-sg-1'], hasDangerousGoods: true };
    db.ships.push(ship1, ship2);
    
    // Create initial trips for seeded ships
    [ship1, ship2].forEach(ship => {
        const trip: Trip = {
            id: uuid(), shipId: ship.id, portId: ship.portId,
            arrivalTimestamp: new Date().toISOString(), departureTimestamp: null,
            status: TripStatus.ACTIVE,
        };
        db.trips.push(trip);
        ship.currentTripId = trip.id;
        
        db.shipMovements.push({
            id: uuid(), shipId: ship.id, portId: ship.portId, tripId: trip.id,
            eventType: MovementEventType.CREATED, timestamp: new Date().toISOString(),
            details: { message: 'Vessel registered in system.' },
        });
    });
    
    saveDB(db);
};

seedData();

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const createShipMovement = (db: Database, oldShip: Ship | null, newShip: Ship, customMessage?: string): void => {
    const changes: string[] = [];
    let eventType: MovementEventType = MovementEventType.AIS_UPDATE;
    const details: ShipMovement['details'] = { message: '' };

    if (oldShip?.status !== newShip.status) {
        eventType = MovementEventType.STATUS_CHANGE;
        details.fromStatus = oldShip?.status;
        details.status = newShip.status;
        changes.push(`Status changed from ${oldShip?.status || 'N/A'} to ${newShip.status}.`);
    }
    if (JSON.stringify(oldShip?.berthIds.sort()) !== JSON.stringify(newShip.berthIds.sort())) {
        eventType = MovementEventType.BERTH_ASSIGNMENT;
        const berthMap = new Map(db.berths.map(b => [b.id, b.name]));
        details.fromBerthIds = oldShip?.berthIds;
        details.berthIds = newShip.berthIds;
        details.fromBerthNames = oldShip?.berthIds.map(id => berthMap.get(id) || id);
        details.berthNames = newShip.berthIds.map(id => berthMap.get(id) || id);
        changes.push(`Berth assignment changed.`);
    }
     if (oldShip?.pilotId !== newShip.pilotId) {
        eventType = MovementEventType.PILOT_ASSIGNMENT;
        details.fromPilotId = oldShip?.pilotId;
        details.pilotId = newShip.pilotId;
        changes.push(`Pilot assignment changed.`);
    }
     if (oldShip?.agentId !== newShip.agentId) {
        eventType = MovementEventType.AGENT_ASSIGNMENT;
        details.fromAgentId = oldShip?.agentId;
        details.agentId = newShip.agentId;
        changes.push(`Agent assignment changed.`);
    }

    if (changes.length === 0 && !customMessage) return;

    details.message = customMessage || changes.join(' ');
    db.shipMovements.push({
        id: uuid(), shipId: newShip.id, portId: newShip.portId, tripId: newShip.currentTripId!,
        eventType, timestamp: new Date().toISOString(), details,
    });
};

// --- API IMPLEMENTATION ---

export const getUsers = async (): Promise<User[]> => {
    await delay(200);
    return getDB().users;
};

export const loginUser = async (name: string, password_provided: string, portId: string): Promise<User> => {
    await delay(500);
    const db = getDB();
    const user = db.users.find(u => u.name === name);
    if (!user || user.password !== password_provided) throw new Error("Invalid credentials.");
    if (user.role !== UserRole.ADMIN && user.portId !== portId) throw new Error("User not assigned to this port.");
    
    const port = db.ports.find(p => p.id === portId);
    const historyEntry: LoginHistoryEntry = {
        id: uuid(), userId: user.id, userName: user.name, portId,
        portName: port?.name || 'N/A', timestamp: new Date().toISOString()
    };
    db.loginHistory.push(historyEntry);
    saveDB(db);

    return user;
};

export const logoutUser = async (userId: string): Promise<void> => {
    await delay(100);
    const db = getDB();
    const lastLogin = db.loginHistory.filter(h => h.userId === userId && !h.logoutTimestamp).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (lastLogin) {
        lastLogin.logoutTimestamp = new Date().toISOString();
        saveDB(db);
    }
};

export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    await delay(300);
    const db = getDB();
    const newUser: User = { ...userData, id: uuid() };
    db.users.push(newUser);
    saveDB(db);
    return newUser;
};

export const updateUser = async (id: string, userData: User): Promise<User> => {
    await delay(300);
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error("User not found.");
    db.users[userIndex] = { ...db.users[userIndex], ...userData };
    saveDB(db);
    return db.users[userIndex];
};

export const deleteUser = async (id: string): Promise<void> => {
    await delay(300);
    const db = getDB();
    db.users = db.users.filter(u => u.id !== id);
    saveDB(db);
};

export const getLoginHistory = async (): Promise<LoginHistoryEntry[]> => {
    await delay(400);
    return getDB().loginHistory;
};

export const getPorts = async (): Promise<Port[]> => {
    await delay(200);
    return getDB().ports;
};

export const addPort = async (portData: Omit<Port, 'id'>): Promise<Port> => {
    await delay(300);
    const db = getDB();
    const newPort: Port = { ...portData, id: uuid() };
    db.ports.push(newPort);
    saveDB(db);
    return newPort;
};

export const updatePort = async (id: string, portData: Port): Promise<Port> => {
    await delay(300);
    const db = getDB();
    const portIndex = db.ports.findIndex(p => p.id === id);
    if (portIndex === -1) throw new Error("Port not found.");
    db.ports[portIndex] = { ...db.ports[portIndex], ...portData };
    saveDB(db);
    return db.ports[portIndex];
};

export const deletePort = async (id: string): Promise<void> => {
    await delay(500);
    let db = getDB();
    db.ports = db.ports.filter(p => p.id !== id);
    db.berths = db.berths.filter(b => b.portId !== id);
    db.ships = db.ships.filter(s => s.portId !== id);
    db.trips = db.trips.filter(t => t.portId !== id);
    db.shipMovements = db.shipMovements.filter(m => m.portId !== id);
    saveDB(db);
};

export const getAllBerths = async (): Promise<Berth[]> => {
    await delay(200);
    return getDB().berths;
};

export const getBerths = async (portId: string): Promise<Berth[]> => {
    await delay(200);
    return getDB().berths.filter(b => b.portId === portId);
};

export const addBerth = async (portId: string, berthData: Omit<Berth, 'id' | 'portId'>): Promise<Berth> => {
    await delay(300);
    const db = getDB();
    const newBerth: Berth = { ...berthData, id: uuid(), portId };
    db.berths.push(newBerth);
    saveDB(db);
    return newBerth;
};

export const updateBerth = async (portId: string, id: string, berthData: Berth): Promise<Berth> => {
    await delay(300);
    const db = getDB();
    const berthIndex = db.berths.findIndex(b => b.id === id && b.portId === portId);
    if (berthIndex === -1) throw new Error("Berth not found.");
    db.berths[berthIndex] = { ...db.berths[berthIndex], ...berthData };
    saveDB(db);
    return db.berths[berthIndex];
};

export const deleteBerth = async (portId: string, berthId: string): Promise<void> => {
    await delay(300);
    const db = getDB();
    db.berths = db.berths.filter(b => b.id !== berthId);
    saveDB(db);
};

export const getAllShips = async(): Promise<Ship[]> => {
    await delay(100);
    return getDB().ships;
};

export const getShips = async (portId: string): Promise<Ship[]> => {
    await delay(300);
    return getDB().ships.filter(s => s.portId === portId);
};

export const addShip = async (shipData: Omit<Ship, 'id'>): Promise<Ship> => {
    await delay(300);
    const db = getDB();
    const newTrip: Trip = { id: uuid(), shipId: '', portId: shipData.portId, arrivalTimestamp: new Date().toISOString(), departureTimestamp: null, status: TripStatus.ACTIVE };
    const newShip: Ship = { ...shipData, id: uuid(), currentTripId: newTrip.id };
    newTrip.shipId = newShip.id;
    
    db.ships.push(newShip);
    db.trips.push(newTrip);
    createShipMovement(db, null, newShip, 'Vessel registered in system.');
    saveDB(db);
    return newShip;
};

export const updateShip = async (id: string, shipData: Ship): Promise<Ship> => {
    await delay(300);
    const db = getDB();
    const shipIndex = db.ships.findIndex(s => s.id === id);
    if (shipIndex === -1) throw new Error("Ship not found.");
    
    const oldShip = { ...db.ships[shipIndex] };
    db.ships[shipIndex] = { ...oldShip, ...shipData };
    const newShip = db.ships[shipIndex];

    createShipMovement(db, oldShip, newShip);
    
    // If ship has left, complete the trip
    if (newShip.status === ShipStatus.LEFT_PORT && oldShip.status !== ShipStatus.LEFT_PORT) {
        const trip = db.trips.find(t => t.id === newShip.currentTripId);
        if (trip) {
            trip.status = TripStatus.COMPLETED;
            trip.departureTimestamp = new Date().toISOString();
        }
    }

    saveDB(db);
    return newShip;
};

export const deleteShip = async (portId: string, shipId: string): Promise<void> => {
    await delay(300);
    const db = getDB();
    db.ships = db.ships.filter(s => s.id !== shipId);
    // Also remove associated trips and movements for cleanliness
    db.trips = db.trips.filter(t => t.shipId !== shipId);
    db.shipMovements = db.shipMovements.filter(m => m.shipId !== shipId);
    saveDB(db);
};

export const updateShipFromAIS = async (data: AisData): Promise<void> => {
    await delay(50);
    const db = getDB();
    let ship = db.ships.find(s => s.imo === data.imo && s.portId === data.portId);

    if (ship) {
        const oldShip = { ...ship };
        ship.lat = data.lat ?? ship.lat;
        ship.lon = data.lon ?? ship.lon;
        if (data.status) ship.status = data.status;
        if (data.name) ship.name = data.name;
        if (data.type) ship.type = data.type;
        createShipMovement(db, oldShip, ship, 'Received AIS update.');
    } else {
        const newShipData: Omit<Ship, 'id'> = {
            portId: data.portId,
            name: data.name || `Vessel ${data.imo}`,
            imo: data.imo,
            type: data.type || 'Unknown',
            length: 100, draft: 5, flag: 'N/A',
            eta: new Date().toISOString(),
            etd: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            status: data.status || ShipStatus.APPROACHING,
            berthIds: [],
            hasDangerousGoods: false,
            lat: data.lat, lon: data.lon,
        };
        const newTrip: Trip = { id: uuid(), shipId: '', portId: data.portId, arrivalTimestamp: new Date().toISOString(), departureTimestamp: null, status: TripStatus.ACTIVE };
        const newShip: Ship = { ...newShipData, id: uuid(), currentTripId: newTrip.id };
        newTrip.shipId = newShip.id;
        db.ships.push(newShip);
        db.trips.push(newTrip);
        createShipMovement(db, null, newShip, `Vessel ${newShip.name} created from AIS feed.`);
    }
    saveDB(db);
};

export const getShipHistory = async (portId: string, shipId: string): Promise<ShipMovement[]> => {
    await delay(400);
    return getDB().shipMovements.filter(m => m.portId === portId && m.shipId === shipId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getHistoryForPort = async (portId: string): Promise<ShipMovement[]> => {
    await delay(500);
    return getDB().shipMovements.filter(m => m.portId === portId);
};

export const getTripsForPort = async (portId: string): Promise<Trip[]> => {
    await delay(300);
    const db = getDB();
    const portTrips = db.trips.filter(t => t.portId === portId);
    
    // Enrich trips with vessel info for directory view
    const shipMap = new Map(db.ships.map(s => [s.id, s]));
    return portTrips.map(trip => {
        const ship = shipMap.get(trip.shipId);
        return {
            ...trip,
            vesselName: ship?.name || 'Unknown Vessel',
            vesselImo: ship?.imo || 'N/A',
            agentId: ship?.agentId,
            pilotId: ship?.pilotId,
        };
    });
};

export const updateTrip = async (id: string, tripData: Trip): Promise<Trip> => {
    await delay(300);
    const db = getDB();
    const tripIndex = db.trips.findIndex(t => t.id === id);
    if (tripIndex === -1) throw new Error("Trip not found.");
    
    db.trips[tripIndex] = { ...db.trips[tripIndex], ...tripData };

    // Also update pilot/agent on the ship record as it's the source of truth
    const ship = db.ships.find(s => s.id === tripData.shipId);
    if (ship) {
        ship.pilotId = tripData.pilotId;
        ship.agentId = tripData.agentId;
    }

    saveDB(db);
    return db.trips[tripIndex];
};
