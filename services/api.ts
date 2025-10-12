
import type { Ship, Berth, ShipMovement, Port, User, LoginHistoryEntry, AisData, Trip } from '../types';
import { ShipStatus, BerthType, MovementEventType, UserRole, TripStatus } from '../types';

// This file simulates a backend API. In a real application, these functions
// would make HTTP requests to a server.

let ports: Port[] = [
    { 
        id: 'port-sg', 
        name: 'Port of Singapore', 
        lat: 1.2647, 
        lon: 103.8225, 
        mapImage: undefined,
        logoImage: undefined,
        geometry: [
            [1.25, 103.81],
            [1.28, 103.81],
            [1.28, 103.84],
            [1.25, 103.84]
        ] 
    },
    { 
        id: 'port-rt', 
        name: 'Port of Rotterdam', 
        lat: 51.9479, 
        lon: 4.1523, 
        mapImage: undefined,
        logoImage: undefined,
        geometry: [
            [51.93, 4.13],
            [51.96, 4.13],
            [51.96, 4.17],
            [51.93, 4.17]
        ]
    },
];

let users: User[] = [
  { id: 'user-1', name: 'Alice (Admin)', role: UserRole.ADMIN, password: 'password' },
  { id: 'user-2', name: 'Bob (Operator)', role: UserRole.OPERATOR, portId: 'port-sg', password: 'password' },
  { id: 'user-3', name: 'Charlie (Captain)', role: UserRole.CAPTAIN, portId: 'port-sg', password: 'password' },
  { id: 'user-4', name: 'Diana (Agent)', role: UserRole.AGENT, portId: 'port-rt', password: 'password' },
  { id: 'user-5', name: 'Eve (Pilot)', role: UserRole.PILOT, portId: 'port-sg', password: 'password' },
  { id: 'user-6', name: 'Frank (Pilot)', role: UserRole.PILOT, portId: 'port-rt', password: 'password' },
  { id: 'user-7', name: 'Grace (Agent)', role: UserRole.AGENT, portId: 'port-sg', password: 'password' },
];

let loginHistory: LoginHistoryEntry[] = [];

let ships: { [portId: string]: Ship[] } = {
    'port-sg': [
      { id: 'ship-1', portId: 'port-sg', name: 'MV Voyager', imo: '9336913', type: 'Container Ship', length: 300, draft: 14.5, flag: 'Panama', eta: new Date(Date.now() - 3600000).toISOString(), etd: new Date(Date.now() + 86400000).toISOString(), status: ShipStatus.DOCKED, berthIds: ['berth-2-sg'], departureDate: undefined, pilotId: 'user-5', agentId: 'user-7', hasDangerousGoods: false, lat: 1.264, lon: 103.822 },
      { id: 'ship-2', portId: 'port-sg', name: 'Oceanic Pearl', imo: '9237128', type: 'Bulk Carrier', length: 190, draft: 10.5, flag: 'Liberia', eta: new Date(Date.now() + 7200000).toISOString(), etd: new Date(Date.now() + 2 * 86400000).toISOString(), status: ShipStatus.APPROACHING, berthIds: [], departureDate: undefined, hasDangerousGoods: false, lat: 1.15, lon: 103.85 },
      { id: 'ship-3', portId: 'port-sg', name: 'Gas Innovator', imo: '9734125', type: 'LNG Tanker', length: 290, draft: 12, flag: 'Malta', eta: new Date(Date.now() - 7200000).toISOString(), etd: new Date(Date.now() + 3600000).toISOString(), status: ShipStatus.DEPARTING, berthIds: ['berth-1a-sg', 'berth-1b-sg'], departureDate: undefined, hasDangerousGoods: true, lat: 1.26, lon: 103.82 },
    ],
    'port-rt': [
        { id: 'ship-4', portId: 'port-rt', name: 'Wanderlust', imo: '9125432', type: 'Cruise Ship', length: 220, draft: 8, flag: 'Bahamas', eta: new Date(Date.now() + 4 * 86400000).toISOString(), etd: new Date(Date.now() + 5 * 86400000).toISOString(), status: ShipStatus.APPROACHING, berthIds: [], departureDate: undefined, pilotId: 'user-6', hasDangerousGoods: false, lat: 51.9, lon: 4.0 },
        { id: 'ship-5', portId: 'port-rt', name: 'Maersk Titan', imo: '9876543', type: 'Container Ship', length: 240, draft: 11.5, flag: 'Denmark', eta: new Date(Date.now() + 10800000).toISOString(), etd: new Date(Date.now() + 3 * 86400000).toISOString(), status: ShipStatus.ANCHORED, berthIds: ['anchorage-1-rt'], departureDate: undefined, hasDangerousGoods: false, lat: 51.94, lon: 4.15 },
    ]
};

let berths: { [portId: string]: Berth[] } = {
    'port-sg': [
      { id: 'berth-1a-sg', portId: 'port-sg', name: 'Quay 1 - Berth A', type: BerthType.BERTH, maxLength: 150, maxDraft: 12, equipment: ['Crane A', 'Crane B'], quayId: 'quay-1', positionOnQuay: 1, 
        geometry: [[1.2650, 103.8230], [1.2652, 103.8230], [1.2652, 103.8235], [1.2650, 103.8235]] },
      { id: 'berth-1b-sg', portId: 'port-sg', name: 'Quay 1 - Berth B', type: BerthType.BERTH, maxLength: 150, maxDraft: 11, equipment: ['Crane C'], quayId: 'quay-1', positionOnQuay: 2,
        geometry: [[1.2650, 103.8235], [1.2652, 103.8235], [1.2652, 103.8240], [1.2650, 103.8240]] },
      { id: 'berth-2-sg', portId: 'port-sg', name: 'Quay 2', type: BerthType.QUAY, maxLength: 400, maxDraft: 15, equipment: ['Crane D', 'Crane E', 'Crane F'], quayId: 'quay-2', positionOnQuay: 1,
        geometry: [[1.2640, 103.8210], [1.2642, 103.8210], [1.2642, 103.8220], [1.2640, 103.8220]] },
    ],
    'port-rt': [
        { id: 'anchorage-1-rt', portId: 'port-rt', name: 'Anchorage Zone 1', type: BerthType.ANCHORAGE, maxLength: 1000, maxDraft: 20, equipment: [], quayId: 'anchorage', positionOnQuay: 1 },
        { id: 'berth-1-rt', portId: 'port-rt', name: 'Maasvlakte Quay 1', type: BerthType.QUAY, maxLength: 500, maxDraft: 18, equipment: ['Gantry Crane 1', 'Gantry Crane 2'], quayId: 'maasvlakte', positionOnQuay: 1,
        geometry: [[51.9500, 4.1500], [51.9502, 4.1500], [51.9502, 4.1510], [51.9500, 4.1510]] },
    ]
};

let trips: Trip[] = [];
let shipHistory: { [portId: string]: ShipMovement[] } = {
    'port-sg': [],
    'port-rt': [],
};
let tripCounter = 0; // Ensures unique IDs even if generated in the same millisecond

const logMovement = (portId: string, shipId: string, tripId: string, eventType: MovementEventType, details: ShipMovement['details']) => {
    if (!shipHistory[portId]) shipHistory[portId] = [];
    const movement: ShipMovement = {
        id: `hist-${Date.now()}-${Math.random()}`,
        portId,
        shipId,
        tripId,
        eventType,
        timestamp: new Date().toISOString(),
        details,
    };
    shipHistory[portId].push(movement);
};

const createNewTrip = (ship: Ship): Trip => {
    const newTrip: Trip = {
        id: `trip-${Date.now()}-${tripCounter++}`,
        shipId: ship.id,
        portId: ship.portId,
        arrivalTimestamp: new Date().toISOString(),
        departureTimestamp: null,
        status: TripStatus.ACTIVE,
        agentId: ship.agentId,
        pilotId: ship.pilotId,
    };
    trips.push(newTrip);
    return newTrip;
};

// Pre-populate history and trips for initial data
Object.keys(ships).forEach(portId => {
    if (ships[portId]) {
        ships[portId].forEach(ship => {
            const initialTrip = createNewTrip(ship);
            ship.currentTripId = initialTrip.id;
            
            logMovement(portId, ship.id, initialTrip.id, MovementEventType.CREATED, { message: 'Vessel registered in system.', pilotId: ship.pilotId, agentId: ship.agentId });
            if(ship.berthIds.length > 0 && berths[portId]) {
                const assignedBerths = berths[portId].filter(b => ship.berthIds.includes(b.id));
                logMovement(portId, ship.id, initialTrip.id, MovementEventType.BERTH_ASSIGNMENT, { berthIds: ship.berthIds, berthNames: assignedBerths.map(b => b.name), message: `Assigned to ${assignedBerths.map(b => b.name).join(', ')}`, pilotId: ship.pilotId, agentId: ship.agentId });
            }
        });
    }
});


const simulateLatency = (ms: number) => new Promise(res => setTimeout(res, ms));

// USER MANAGEMENT
export const loginUser = async (name: string, password_provided: string, portId: string): Promise<User> => {
    await simulateLatency(400);
    const user = users.find(u => u.name === name);
    if (user && user.password === password_provided) {
        const port = ports.find(p => p.id === portId);
        if (port) {
            loginHistory.push({
                id: `login-${Date.now()}`,
                userId: user.id,
                userName: user.name,
                portId: port.id,
                portName: port.name,
                timestamp: new Date().toISOString()
            });
        }
        const { password, ...userToReturn } = user;
        return JSON.parse(JSON.stringify(userToReturn));
    }
    throw new Error('Invalid username or password');
};

export const logoutUser = async (userId: string): Promise<void> => {
    await simulateLatency(200);
    const lastLogin = loginHistory
        .filter(entry => entry.userId === userId && !entry.logoutTimestamp)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (lastLogin) {
        lastLogin.logoutTimestamp = new Date().toISOString();
    }
};


export const getUsers = async (): Promise<User[]> => {
    await simulateLatency(200);
    // Never send passwords over the wire
    return JSON.parse(JSON.stringify(users.map(({ password, ...user }) => user)));
}

export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    await simulateLatency(300);
    if (!userData.password) throw new Error("Password is required for new users.");
    const newUser: User = { ...userData, id: `user-${Date.now()}` };
    users.push(newUser);
    const { password, ...userToReturn } = newUser;
    return userToReturn;
};

export const updateUser = async (id: string, updatedUser: User): Promise<User> => {
    await simulateLatency(300);
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
        // If password is blank, keep the old one
        if (!updatedUser.password) {
            updatedUser.password = users[index].password;
        }
        users[index] = updatedUser;
        const { password, ...userToReturn } = updatedUser;
        return userToReturn;
    }
    throw new Error('User not found');
};

export const deleteUser = async (id: string): Promise<{ id: string }> => {
    await simulateLatency(300);
    users = users.filter(u => u.id !== id);
    return { id };
};


// PORT MANAGEMENT
export const getPorts = async (): Promise<Port[]> => {
    await simulateLatency(200);
    return JSON.parse(JSON.stringify(ports));
};

export const addPort = async (portData: Omit<Port, 'id'>): Promise<Port> => {
    await simulateLatency(300);
    const newPort: Port = { ...portData, id: `port-${Date.now()}` };
    ports.push(newPort);
    // Initialize empty arrays for ships, berths, and history for the new port
    ships[newPort.id] = [];
    berths[newPort.id] = [];
    shipHistory[newPort.id] = [];
    return JSON.parse(JSON.stringify(newPort));
};

export const updatePort = async (id: string, updatedPort: Port): Promise<Port> => {
    await simulateLatency(300);
    const index = ports.findIndex(p => p.id === id);
    if (index !== -1) {
        ports[index] = updatedPort;
        return JSON.parse(JSON.stringify(updatedPort));
    }
    throw new Error('Port not found');
};

export const deletePort = async (id: string): Promise<{ id: string }> => {
    await simulateLatency(500);
    ports = ports.filter(p => p.id !== id);
    // Also delete associated data
    delete ships[id];
    delete berths[id];
    delete shipHistory[id];
    // Reassign users from deleted port
    users = users.map(u => u.portId === id ? { ...u, portId: undefined } : u);
    return { id };
};


// SHIP MANAGEMENT
export const getShips = async (portId: string): Promise<Ship[]> => {
    await simulateLatency(500);
    return JSON.parse(JSON.stringify(ships[portId] || []));
};

export const getAllShips = async (): Promise<Ship[]> => {
    await simulateLatency(300);
    const all = Object.values(ships).flat();
    return JSON.parse(JSON.stringify(all));
}

export const addShip = async (shipData: Omit<Ship, 'id'>): Promise<Ship> => {
    await simulateLatency(400);
    const { portId } = shipData;
    if (!ships[portId]) {
        ships[portId] = [];
    }
    const shipId = `ship-${Date.now()}`;
    const newShip: Ship = { ...shipData, id: shipId };
    const newTrip = createNewTrip(newShip);
    newShip.currentTripId = newTrip.id;

    ships[portId].push(newShip);
    const userMap = new Map(users.map(u => [u.id, u.name]));

    // Log vessel creation
    logMovement(portId, newShip.id, newTrip.id, MovementEventType.CREATED, { message: 'Vessel registered in system.' });
    
    // Log initial berth assignment if any
    if (newShip.berthIds.length > 0) {
        const assignedBerths = (berths[portId] || []).filter(b => newShip.berthIds.includes(b.id));
        logMovement(portId, newShip.id, newTrip.id, MovementEventType.BERTH_ASSIGNMENT, { 
            berthIds: newShip.berthIds, 
            berthNames: assignedBerths.map(b => b.name), 
            message: `Assigned to ${assignedBerths.map(b => b.name).join(', ')}.`,
            pilotId: newShip.pilotId,
            agentId: newShip.agentId,
        });
    }

    // Log initial pilot assignment if any
    if (newShip.pilotId) {
        const pilotName = userMap.get(newShip.pilotId) || 'Unknown';
        logMovement(portId, newShip.id, newTrip.id, MovementEventType.PILOT_ASSIGNMENT, {
            pilotId: newShip.pilotId,
            message: `Pilot ${pilotName} assigned upon registration.`
        });
    }

    // Log initial agent assignment if any
    if (newShip.agentId) {
        const agentName = userMap.get(newShip.agentId) || 'Unknown';
        logMovement(portId, newShip.id, newTrip.id, MovementEventType.AGENT_ASSIGNMENT, {
            agentId: newShip.agentId,
            message: `Maritime Agent ${agentName} assigned upon registration.`
        });
    }

    return JSON.parse(JSON.stringify(newShip));
};

export const updateShip = async (id: string, updatedShip: Ship): Promise<Ship> => {
    await simulateLatency(400);
    const { portId } = updatedShip;
    if (!ships[portId]) throw new Error('Port not found for ship update');

    const shipIndex = ships[portId].findIndex(s => s.id === id);
    if (shipIndex === -1) throw new Error('Ship not found');

    const originalShip = ships[portId][shipIndex];
    let currentTripIdForLogging = originalShip.currentTripId;

    // --- Trip Lifecycle Management ---
    const wasLeft = originalShip.status === ShipStatus.LEFT_PORT;
    const isNowActive = updatedShip.status !== ShipStatus.LEFT_PORT;
    const isNowLeft = updatedShip.status === ShipStatus.LEFT_PORT;

    // Case 1: Ship has returned to port after leaving. Create a new trip.
    if (wasLeft && isNowActive) {
        const newTrip = createNewTrip(updatedShip);
        updatedShip.currentTripId = newTrip.id;
        currentTripIdForLogging = newTrip.id;
    }

    // Case 2: Ship is now leaving the port. Complete the current trip.
    if (!wasLeft && isNowLeft) {
        const currentTrip = trips.find(t => t.id === originalShip.currentTripId);
        if (currentTrip) {
            currentTrip.status = TripStatus.COMPLETED;
            currentTrip.departureTimestamp = new Date().toISOString();
        }
        updatedShip.currentTripId = undefined; // Ship has no active trip
    }
    
    const currentTrip = trips.find(t => t.id === currentTripIdForLogging);
    
    if (currentTrip) {
      currentTrip.agentId = updatedShip.agentId;
      currentTrip.pilotId = updatedShip.pilotId;
    }

    if (!currentTripIdForLogging) {
        console.warn(`Could not find an active trip for ship ${id} during an update. This may happen if a departed ship is being updated.`);
        if(isNowActive) {
            const newTrip = createNewTrip(updatedShip);
            updatedShip.currentTripId = newTrip.id;
            currentTripIdForLogging = newTrip.id;
        } else {
             currentTripIdForLogging = `trip-orphan-${Date.now()}`;
        }
    }


    // Log status change
    if (originalShip.status !== updatedShip.status) {
        logMovement(portId, id, currentTripIdForLogging, MovementEventType.STATUS_CHANGE, { 
            fromStatus: originalShip.status, 
            status: updatedShip.status, 
            pilotId: updatedShip.pilotId,
            agentId: updatedShip.agentId,
            message: `Status changed from ${originalShip.status} to ${updatedShip.status}.` 
        });
    }

    // Log berth assignment change
    const originalBerths = originalShip.berthIds.slice().sort().join(',');
    const updatedBerths = updatedShip.berthIds.slice().sort().join(',');
    if (originalBerths !== updatedBerths) {
        const originalBerthNames = (berths[portId] || []).filter(b => originalShip.berthIds.includes(b.id)).map(b => b.name);
        const updatedBerthNames = (berths[portId] || []).filter(b => updatedShip.berthIds.includes(b.id)).map(b => b.name);
        logMovement(portId, id, currentTripIdForLogging, MovementEventType.BERTH_ASSIGNMENT, { 
            fromBerthIds: originalShip.berthIds,
            fromBerthNames: originalBerthNames,
            berthIds: updatedShip.berthIds,
            berthNames: updatedBerthNames,
            pilotId: updatedShip.pilotId,
            agentId: updatedShip.agentId,
            message: `Berth assignment changed from ${originalBerthNames.join(', ') || 'Unassigned'} to ${updatedBerthNames.join(', ') || 'Unassigned'}.` 
        });
    }

    // Log pilot change
    if (originalShip.pilotId !== updatedShip.pilotId) {
        const userMap = new Map(users.map(u => [u.id, u.name]));
        const fromPilotName = originalShip.pilotId ? userMap.get(originalShip.pilotId) || 'Unknown' : 'None';
        const toPilotName = updatedShip.pilotId ? userMap.get(updatedShip.pilotId) || 'Unknown' : 'None';
        logMovement(portId, id, currentTripIdForLogging, MovementEventType.PILOT_ASSIGNMENT, {
            fromPilotId: originalShip.pilotId,
            pilotId: updatedShip.pilotId,
            message: `Pilot assignment updated. Previous pilot: ${fromPilotName}. New pilot: ${toPilotName}.`
        });
    }
    
    // Log agent change
    if (originalShip.agentId !== updatedShip.agentId) {
        const userMap = new Map(users.map(u => [u.id, u.name]));
        const fromAgentName = originalShip.agentId ? userMap.get(originalShip.agentId) || 'Unknown' : 'None';
        const toAgentName = updatedShip.agentId ? userMap.get(updatedShip.agentId) || 'Unknown' : 'None';
        logMovement(portId, id, currentTripIdForLogging, MovementEventType.AGENT_ASSIGNMENT, {
            fromAgentId: originalShip.agentId,
            agentId: updatedShip.agentId,
            message: `Agent assignment updated. Previous agent: ${fromAgentName}. New agent: ${toAgentName}.`
        });
    }

    ships[portId][shipIndex] = updatedShip;
    return JSON.parse(JSON.stringify(updatedShip));
};

export const deleteShip = async (portId: string, id: string): Promise<{ id: string }> => {
    await simulateLatency(400);
    if (!ships[portId]) throw new Error('Port not found for ship deletion');
    ships[portId] = ships[portId].filter(s => s.id !== id);
    return { id };
};

export const updateTrip = async (id: string, updatedTripData: Trip): Promise<Trip> => {
    await simulateLatency(300);
    const tripIndex = trips.findIndex(t => t.id === id);
    if (tripIndex === -1) throw new Error('Trip not found');

    const originalTrip = trips[tripIndex];
    const updatedTrip = { ...originalTrip, ...updatedTripData };
    trips[tripIndex] = updatedTrip;
    
    // Data Consistency: If this trip is a vessel's CURRENT trip,
    // update the agent/pilot on the ship record too.
    const portId = updatedTrip.portId;
    if (ships[portId]) {
        const shipIndex = ships[portId].findIndex(s => s.currentTripId === id);
        if (shipIndex !== -1) {
            ships[portId][shipIndex].agentId = updatedTrip.agentId;
            ships[portId][shipIndex].pilotId = updatedTrip.pilotId;
        }
    }

    // The API returns the raw trip object, without enriched fields
    const { vesselName, vesselImo, ...rawTrip } = updatedTrip;
    return JSON.parse(JSON.stringify(rawTrip));
};

// BERTH MANAGEMENT
export const getBerths = async (portId: string): Promise<Berth[]> => {
    await simulateLatency(300);
    return JSON.parse(JSON.stringify(berths[portId] || []));
};

export const getAllBerths = async (): Promise<Berth[]> => {
    await simulateLatency(250);
    const all = Object.values(berths).flat();
    return JSON.parse(JSON.stringify(all));
}

export const addBerth = async (portId: string, berthData: Omit<Berth, 'id' | 'portId'>): Promise<Berth> => {
    await simulateLatency(300);
    if (!berths[portId]) {
        berths[portId] = [];
    }
    const newBerth: Berth = { ...berthData, id: `berth-${Date.now()}`, portId };
    berths[portId].push(newBerth);
    return JSON.parse(JSON.stringify(newBerth));
};

export const updateBerth = async (portId: string, id: string, updatedBerth: Berth): Promise<Berth> => {
    await simulateLatency(300);
    if (!berths[portId]) throw new Error('Port not found for berth update');
    const index = berths[portId].findIndex(b => b.id === id);
    if (index !== -1) {
        berths[portId][index] = { ...updatedBerth, portId };
        return JSON.parse(JSON.stringify(berths[portId][index]));
    }
    throw new Error('Berth not found');
};

export const deleteBerth = async (portId: string, id: string): Promise<{ id: string }> => {
    await simulateLatency(300);
    if (!berths[portId]) throw new Error('Port not found for berth deletion');
    berths[portId] = berths[portId].filter(b => b.id !== id);
    // Also remove this berth from any ship that has it assigned
    if(ships[portId]){
        ships[portId] = ships[portId].map(ship => ({
            ...ship,
            berthIds: ship.berthIds.filter(bId => bId !== id),
        }));
    }
    return { id };
};


// HISTORY, TRIPS & LOGS
export const getTripsForPort = async (portId: string): Promise<Trip[]> => {
    await simulateLatency(400);
    const portTrips = trips.filter(t => t.portId === portId);
    
    // Enrich trip data with vessel info
    const allShipsForPort = ships[portId] || [];
    const shipMap = new Map(allShipsForPort.map(s => [s.id, s]));

    const enrichedTrips = portTrips.map(trip => {
        const ship = shipMap.get(trip.shipId);
        return {
            ...trip,
            vesselName: ship?.name || 'Unknown Vessel',
            vesselImo: ship?.imo || 'N/A',
        };
    });

    return JSON.parse(JSON.stringify(enrichedTrips));
};

export const getShipHistory = async (portId: string, shipId: string): Promise<ShipMovement[]> => {
    await simulateLatency(600);
    const history = (shipHistory[portId] || []).filter(h => h.shipId === shipId);
    // Return sorted by most recent first
    return JSON.parse(JSON.stringify(history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())));
};

export const getHistoryForPort = async (portId: string): Promise<ShipMovement[]> => {
    await simulateLatency(700);
    const history = shipHistory[portId] || [];
    // Return sorted by most recent first
    return JSON.parse(JSON.stringify(history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())));
};

export const getLoginHistory = async (): Promise<LoginHistoryEntry[]> => {
    await simulateLatency(400);
    return JSON.parse(JSON.stringify(loginHistory));
}

export const updateShipFromAIS = async (aisData: AisData): Promise<Ship | null> => {
    await simulateLatency(100);
    const { portId, imo } = aisData;
    let shipToUpdate: Ship | undefined;
    let originalPortId: string | undefined;

    // Find the ship across all ports by IMO
    for (const pId in ships) {
        const foundShip = ships[pId].find(s => s.imo === imo);
        if (foundShip) {
            shipToUpdate = foundShip;
            originalPortId = pId;
            break;
        }
    }
    
    if (shipToUpdate && originalPortId) {
        // Update existing ship
        const updatedShip: Ship = { ...shipToUpdate };
        let hasChanged = false;

        if (aisData.name && aisData.name !== updatedShip.name) {
            updatedShip.name = aisData.name;
            hasChanged = true;
        }
        if (aisData.type && aisData.type !== updatedShip.type) {
            updatedShip.type = aisData.type;
            hasChanged = true;
        }
        if (aisData.status && aisData.status !== updatedShip.status) {
            updatedShip.status = aisData.status;
            hasChanged = true;
        }
        // ... could add lat/lon updates here too

        if (hasChanged) {
            const tripId = updatedShip.currentTripId || `trip-ais-orphan-${Date.now()}`;
            logMovement(portId, updatedShip.id, tripId, MovementEventType.AIS_UPDATE, {
                message: `Vessel data updated via AIS. Name: ${updatedShip.name}, Status: ${updatedShip.status}`
            });
            // Update the ship in the original port's list
            ships[originalPortId] = ships[originalPortId].map(s => s.id === updatedShip.id ? updatedShip : s);
            return updatedShip;
        }
        return null; // No changes
    } else {
        // Create new ship if it doesn't exist
        if (aisData.name) {
            const newShipData: Omit<Ship, 'id'> = {
                portId,
                name: aisData.name,
                imo: aisData.imo,
                type: aisData.type || 'Unknown',
                status: aisData.status || ShipStatus.APPROACHING,
                length: 0, // Should be updated by a subsequent AIS message
                draft: 0,
                flag: 'Unknown',
                eta: new Date().toISOString(),
                etd: new Date(Date.now() + 86400000).toISOString(),
                berthIds: [],
                hasDangerousGoods: false
            };
            return addShip(newShipData);
        }
    }
    return null;
};
