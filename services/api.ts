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
        logoImage: 'data:image/png;base64,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',
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
        { id: uuid(), name: 'Admin User', role: UserRole.ADMIN, password: 'password', forcePasswordChange: false },
        { id: uuid(), name: 'SG Operator', role: UserRole.OPERATOR, password: 'password', portId: portId1, forcePasswordChange: true },
        { id: uuid(), name: 'RT Operator', role: UserRole.OPERATOR, password: 'password', portId: portId2, forcePasswordChange: true },
        { id: uuid(), name: 'Capt. Ahab (SG)', role: UserRole.CAPTAIN, password: 'password', portId: portId1, forcePasswordChange: true },
        { id: uuid(), name: 'Maritime Agent (SG)', role: UserRole.AGENT, password: 'password', portId: portId1, forcePasswordChange: true },
        { id: uuid(), name: 'John Smith (Pilot)', role: UserRole.PILOT, password: 'password', portId: portId1, forcePasswordChange: true },
        { id: uuid(), name: 'Jane Doe (Pilot)', role: UserRole.PILOT, password: 'password', portId: portId1, forcePasswordChange: true },
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
    const newUser: User = {
        ...userData,
        id: uuid(),
        forcePasswordChange: userData.role !== UserRole.ADMIN,
    };
    db.users.push(newUser);
    saveDB(db);
    return newUser;
};

export const updateUser = async (id: string, userData: User): Promise<User> => {
    await delay(300);
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error("User not found.");
    
    const userToUpdate = { ...db.users[userIndex], ...userData };
    // If password is being changed by an admin, force a reset on next login (unless it's the admin themselves)
    if (userData.password && userData.password.trim() !== '' && userToUpdate.role !== UserRole.ADMIN) {
        userToUpdate.forcePasswordChange = true;
    }

    db.users[userIndex] = userToUpdate;
    saveDB(db);
    return db.users[userIndex];
};

export const updateOwnPassword = async (userId: string, newPassword: string): Promise<User> => {
    await delay(300);
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found.");
    
    db.users[userIndex].password = newPassword;
    db.users[userIndex].forcePasswordChange = false;

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