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
        logoImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAd8SURBVHhe7Zt7bFzVFYC/8zkf82C/nSRJ2pZkSVK0dZtWqEALFRQk2oqgH/iBEUE08w9EQLwoooiKigTzL0T0DxB9QPTPEgQRlVgkKsdKbdvWpG3StE3btE3btGnaJI3t+ZxzZufOnXN2pG3Sh/6kZ+bdc8859/zO3DmzQf/0p9p7T28Wpws/fPgw7dq1c+WDDz7Q5cuXb2nRo0cPX7p0qSuVSqlUKuVbXFxcVVVVxQULFjRixAh/++239fvvv3/++ecvW7as27Ztq7y8vL9fvnzZtm3bLl269M6dO+vXr1+xYsX79+83NTU1Njb+9NNPDx8+3N7eXldXV1dXl5OTU1paunfv3sOHD1epVCoVCoVCoVDod+DBgweff/75JUuWvHr1amVlZUVFRWVlZQUFBbm5uWVlZQUFBf39/QUFBQUFBaWlpQUFBRs3bty5c2dtbW1tbe327dv19fVtbW1tbW319fXff/+9qqqqioqKysrKqqqqqqqqKioqBgYGJiYmpqamVlZWpqamJkyYMHbs2MbGxoaGhvz8/IaGhvXr13/88cdTp06tra1tampqampqZWWloaGhtbW1ra2toaGhtbW1paWloaGhoKCgqampqamppaWltbW1ra2toaGhpaWloaGhpaWloaGhoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgo... (base64 image data)',
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

let berths: { [portId: string]: Berth[] } = {
    'port-sg': [
        { id: 'berth-sg-1', portId: 'port-sg', name: 'Tanjong Pagar 1', type: BerthType.QUAY, maxLength: 350, maxDraft: 15, equipment: ['Crane', 'Water'], quayId: 'quay-tp', positionOnQuay: 1, geometry: [[1.26, 103.82], [1.261, 103.821]] },
        { id: 'berth-sg-2', portId: 'port-sg', name: 'Tanjong Pagar 2', type: BerthType.QUAY, maxLength: 350, maxDraft: 15, equipment: ['Crane', 'Fuel'], quayId: 'quay-tp', positionOnQuay: 2, geometry: [[1.261, 103.821], [1.262, 103.822]] },
        { id: 'berth-sg-3', portId: 'port-sg', name: 'Anchorage A', type: BerthType.ANCHORAGE, maxLength: 500, maxDraft: 20, equipment: [], quayId: 'anchorage-east', positionOnQuay: 1, geometry: [[1.24, 103.83], [1.241, 103.831]] },
    ],
    'port-rt': [
        { id: 'berth-rt-1', portId: 'port-rt', name: 'Euromax 1', type: BerthType.QUAY, maxLength: 400, maxDraft: 16, equipment: ['Crane', 'Power'], quayId: 'quay-em', positionOnQuay: 1 },
        { id: 'berth-rt-2', portId: 'port-rt', name: 'Euromax 2', type: BerthType.QUAY, maxLength: 400, maxDraft: 16, equipment: ['Crane', 'Power'], quayId: 'quay-em', positionOnQuay: 2 },
    ]
};

// FIX: Completed ship objects with all required properties.
let ships: { [portId: string]: Ship[] } = {
    'port-sg': [
        { id: 'ship-1', portId: 'port-sg', name: 'MV Voyager', imo: '9336913', type: 'Container Ship', length: 300, draft: 14, flag: 'Singapore', eta: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), etd: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), status: ShipStatus.APPROACHING, berthIds: [], pilotId: 'user-5', agentId: 'user-7', hasDangerousGoods: false, lat: 1.23, lon: 103.80, currentTripId: 'trip-1' },
        { id: 'ship-2', portId: 'port-sg', name: 'MT Phoenix', imo: '9217630', type: 'Oil Tanker', length: 250, draft: 12, flag: 'Panama', eta: new Date(Date.now() + 4 * 3600 * 1000).toISOString(), etd: new Date(Date.now() + 48 * 3600 * 1000).toISOString(), status: ShipStatus.ANCHORED, berthIds: ['berth-sg-3'], hasDangerousGoods: true, lat: 1.24, lon: 103.83, currentTripId: 'trip-2' },
        { id: 'ship-3', portId: 'port-sg', name: 'SS Pioneer', imo: '9786232', type: 'Bulk Carrier', length: 220, draft: 11, flag: 'Liberia', eta: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), etd: new Date(Date.now() + 12 * 3600 * 1000).toISOString(), status: ShipStatus.DOCKED, berthIds: ['berth-sg-1'], hasDangerousGoods: false, currentTripId: 'trip-3' },
    ],
    'port-rt': [
        { id: 'ship-4', portId: 'port-rt', name: 'CMA CGM Titan', imo: '9450657', type: 'Container Ship', length: 365, draft: 15.5, flag: 'Malta', eta: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), etd: new Date(Date.now() + 36 * 3600 * 1000).toISOString(), status: ShipStatus.DOCKED, berthIds: ['berth-rt-1'], pilotId: 'user-6', agentId: 'user-4', hasDangerousGoods: false, currentTripId: 'trip-4' },
    ]
};

let trips: { [portId: string]: Trip[] } = {
    'port-sg': [
        { id: 'trip-1', portId: 'port-sg', shipId: 'ship-1', arrivalTimestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), departureTimestamp: null, status: TripStatus.ACTIVE, vesselName: 'MV Voyager', vesselImo: '9336913', agentId: 'user-7', pilotId: 'user-5' },
        { id: 'trip-2', portId: 'port-sg', shipId: 'ship-2', arrivalTimestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), departureTimestamp: null, status: TripStatus.ACTIVE, vesselName: 'MT Phoenix', vesselImo: '9217630', agentId: 'user-7', pilotId: 'user-5' },
        { id: 'trip-3', portId: 'port-sg', shipId: 'ship-3', arrivalTimestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), departureTimestamp: null, status: TripStatus.ACTIVE, vesselName: 'SS Pioneer', vesselImo: '9786232', agentId: 'user-7' },
        { id: 'trip-1-old', portId: 'port-sg', shipId: 'ship-1', arrivalTimestamp: new Date(Date.now() - 120 * 3600 * 1000).toISOString(), departureTimestamp: new Date(Date.now() - 96 * 3600 * 1000).toISOString(), status: TripStatus.COMPLETED, vesselName: 'MV Voyager', vesselImo: '9336913' },
    ],
    'port-rt': [
        { id: 'trip-4', portId: 'port-rt', shipId: 'ship-4', arrivalTimestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), departureTimestamp: null, status: TripStatus.ACTIVE, vesselName: 'CMA CGM Titan', vesselImo: '9450657', agentId: 'user-4', pilotId: 'user-6' },
    ]
};

let shipMovements: { [portId: string]: ShipMovement[] } = {
    'port-sg': [
        { id: 'mov-1', portId: 'port-sg', shipId: 'ship-1', tripId: 'trip-1', eventType: MovementEventType.CREATED, timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), details: { message: 'Vessel MV Voyager registered for port entry.' } },
        { id: 'mov-2', portId: 'port-sg', shipId: 'ship-2', tripId: 'trip-2', eventType: MovementEventType.CREATED, timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), details: { message: 'Vessel MT Phoenix registered for port entry.' } },
        { id: 'mov-3', portId: 'port-sg', shipId: 'ship-2', tripId: 'trip-2', eventType: MovementEventType.BERTH_ASSIGNMENT, timestamp: new Date(Date.now() - 7 * 3600 * 1000).toISOString(), details: { message: 'Assigned to Anchorage A.', berthIds: ['berth-sg-3'], berthNames: ['Anchorage A'] } },
        { id: 'mov-4', portId: 'port-sg', shipId: 'ship-3', tripId: 'trip-3', eventType: MovementEventType.BERTH_ASSIGNMENT, timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), details: { message: 'Assigned to Tanjong Pagar 1.', berthIds: ['berth-sg-1'], berthNames: ['Tanjong Pagar 1'] } },
    ],
    'port-rt': [
        { id: 'mov-5', portId: 'port-rt', shipId: 'ship-4', tripId: 'trip-4', eventType: MovementEventType.BERTH_ASSIGNMENT, timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), details: { message: 'Assigned to Euromax 1.', berthIds: ['berth-rt-1'], berthNames: ['Euromax 1'] } },
    ]
};

// --- Helper Functions ---
const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const createMovement = (portId: string, shipId: string, tripId: string, eventType: MovementEventType, details: ShipMovement['details']): ShipMovement => {
    return { id: createId('mov'), portId, shipId, tripId, eventType, timestamp: new Date().toISOString(), details };
};

const addMovement = (movement: ShipMovement) => {
    if (!shipMovements[movement.portId]) shipMovements[movement.portId] = [];
    shipMovements[movement.portId].push(movement);
};


// --- API Functions ---

// --- User API ---
export const getUsers = async (): Promise<User[]> => {
    return Promise.resolve(users.map(({ password, ...user }) => user)); // Don't send password to client
};

export const loginUser = async (name: string, password_provided: string, portId: string): Promise<User> => {
    const user = users.find(u => u.name === name);
    if (!user || user.password !== password_provided) {
        throw new Error('Invalid username or password.');
    }
    if (user.role !== UserRole.ADMIN && user.portId !== portId) {
        throw new Error('User not authorized for this port.');
    }

    const portName = ports.find(p => p.id === portId)?.name || 'N/A';
    const historyEntry: LoginHistoryEntry = {
        id: createId('log'), userId: user.id, userName: user.name, portId, portName, timestamp: new Date().toISOString()
    };
    loginHistory.push(historyEntry);
    const { password, ...userToReturn } = user;
    return Promise.resolve(userToReturn);
};

export const logoutUser = async (userId: string): Promise<void> => {
    const lastLogin = loginHistory.slice().reverse().find(h => h.userId === userId && !h.logoutTimestamp);
    if (lastLogin) {
        lastLogin.logoutTimestamp = new Date().toISOString();
    }
    return Promise.resolve();
};

export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    const newUser: User = { ...userData, id: createId('user') };
    users.push(newUser);
    return Promise.resolve(newUser);
};

export const updateUser = async (id: string, userData: User): Promise<User> => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('User not found');
    
    // Don't overwrite password if it's not provided
    const newPassword = userData.password ? userData.password : users[userIndex].password;
    users[userIndex] = { ...users[userIndex], ...userData, password: newPassword };

    return Promise.resolve(users[userIndex]);
};

export const deleteUser = async (id: string): Promise<void> => {
    users = users.filter(u => u.id !== id);
    return Promise.resolve();
};

export const getLoginHistory = async (): Promise<LoginHistoryEntry[]> => {
    return Promise.resolve(loginHistory);
};

// --- Port API ---
export const getPorts = async (): Promise<Port[]> => {
    return Promise.resolve(ports);
};

export const addPort = async (portData: Omit<Port, 'id'>): Promise<Port> => {
    const newPort = { ...portData, id: createId('port') };
    ports.push(newPort);
    ships[newPort.id] = [];
    berths[newPort.id] = [];
    trips[newPort.id] = [];
    shipMovements[newPort.id] = [];
    return Promise.resolve(newPort);
};

export const updatePort = async (id: string, portData: Port): Promise<Port> => {
    const portIndex = ports.findIndex(p => p.id === id);
    if (portIndex === -1) throw new Error('Port not found');
    ports[portIndex] = { ...ports[portIndex], ...portData };
    return Promise.resolve(ports[portIndex]);
};

export const deletePort = async (id: string): Promise<void> => {
    ports = ports.filter(p => p.id !== id);
    delete ships[id];
    delete berths[id];
    delete trips[id];
    delete shipMovements[id];
    return Promise.resolve();
};

// --- Berth API ---
export const getBerths = async (portId: string): Promise<Berth[]> => {
    return Promise.resolve(berths[portId] || []);
};

export const getAllBerths = async (): Promise<Berth[]> => {
    return Promise.resolve(Object.values(berths).flat());
};

export const addBerth = async (portId: string, berthData: Omit<Berth, 'id' | 'portId'>): Promise<Berth> => {
    const newBerth = { ...berthData, id: createId('berth'), portId };
    if (!berths[portId]) berths[portId] = [];
    berths[portId].push(newBerth);
    return Promise.resolve(newBerth);
};

export const updateBerth = async (portId: string, id: string, berthData: Berth): Promise<Berth> => {
    const portBerths = berths[portId];
    if (!portBerths) throw new Error('Port not found');
    const berthIndex = portBerths.findIndex(b => b.id === id);
    if (berthIndex === -1) throw new Error('Berth not found');
    portBerths[berthIndex] = { ...portBerths[berthIndex], ...berthData };
    return Promise.resolve(portBerths[berthIndex]);
};

export const deleteBerth = async (portId: string, berthId: string): Promise<void> => {
    if (berths[portId]) {
        berths[portId] = berths[portId].filter(b => b.id !== berthId);
    }
    return Promise.resolve();
};

// --- Ship API ---
export const getShips = async (portId: string): Promise<Ship[]> => {
    return Promise.resolve(ships[portId] || []);
};

export const getAllShips = async (): Promise<Ship[]> => {
    return Promise.resolve(Object.values(ships).flat());
};

export const addShip = async (shipData: Omit<Ship, 'id'>): Promise<Ship> => {
    const newShip: Ship = { ...shipData, id: createId('ship') };
    if (!ships[shipData.portId]) ships[shipData.portId] = [];

    // Create a new trip for this ship
    const newTrip: Trip = {
        id: createId('trip'),
        shipId: newShip.id,
        portId: newShip.portId,
        arrivalTimestamp: new Date().toISOString(),
        departureTimestamp: null,
        status: TripStatus.ACTIVE,
        vesselName: newShip.name,
        vesselImo: newShip.imo,
        agentId: newShip.agentId,
        pilotId: newShip.pilotId,
    };
    newShip.currentTripId = newTrip.id;
    ships[shipData.portId].push(newShip);

    if (!trips[newShip.portId]) trips[newShip.portId] = [];
    trips[newShip.portId].push(newTrip);

    addMovement(createMovement(newShip.portId, newShip.id, newTrip.id, MovementEventType.CREATED, { message: `Vessel ${newShip.name} registered for port entry.` }));

    return Promise.resolve(newShip);
};

export const updateShip = async (id: string, shipData: Ship): Promise<Ship> => {
    const portShips = ships[shipData.portId];
    if (!portShips) throw new Error('Port not found for ship');
    const shipIndex = portShips.findIndex(s => s.id === id);
    if (shipIndex === -1) throw new Error('Ship not found');

    const oldShip = portShips[shipIndex];
    // Create movement logs for changes
    if (oldShip.status !== shipData.status) {
        addMovement(createMovement(shipData.portId, id, shipData.currentTripId!, MovementEventType.STATUS_CHANGE, { message: `Status changed from ${oldShip.status} to ${shipData.status}.`, fromStatus: oldShip.status, status: shipData.status }));
    }
    if (JSON.stringify(oldShip.berthIds.sort()) !== JSON.stringify(shipData.berthIds.sort())) {
        const berthNames = shipData.berthIds.map(bId => berths[shipData.portId].find(b => b.id === bId)?.name || bId).join(', ');
        addMovement(createMovement(shipData.portId, id, shipData.currentTripId!, MovementEventType.BERTH_ASSIGNMENT, { message: `Berth assignment changed to ${berthNames}.`, fromBerthIds: oldShip.berthIds, berthIds: shipData.berthIds, berthNames: berthNames.split(', ') }));
    }
    // ... add more movement checks for pilot, agent etc.

    portShips[shipIndex] = { ...oldShip, ...shipData };

    // Update associated trip
    const trip = trips[shipData.portId]?.find(t => t.id === shipData.currentTripId);
    if (trip) {
        trip.status = shipData.status === ShipStatus.LEFT_PORT ? TripStatus.COMPLETED : TripStatus.ACTIVE;
        if (shipData.status === ShipStatus.LEFT_PORT && !trip.departureTimestamp) {
            trip.departureTimestamp = new Date().toISOString();
        }
        trip.pilotId = shipData.pilotId;
        trip.agentId = shipData.agentId;
    }

    return Promise.resolve(portShips[shipIndex]);
};

export const deleteShip = async (portId: string, shipId: string): Promise<void> => {
    if (ships[portId]) {
        ships[portId] = ships[portId].filter(s => s.id !== shipId);
    }
    return Promise.resolve();
};

export const updateShipFromAIS = async (aisData: AisData): Promise<void> => {
    const portShips = ships[aisData.portId];
    if (!portShips) return;
    const shipIndex = portShips.findIndex(s => s.imo === aisData.imo);
    if (shipIndex !== -1) {
        const ship = portShips[shipIndex];
        if (aisData.lat) ship.lat = aisData.lat;
        if (aisData.lon) ship.lon = aisData.lon;
        if (aisData.status) ship.status = aisData.status;
        if (aisData.name && !ship.name) ship.name = aisData.name;
        if (aisData.type && !ship.type) ship.type = aisData.type;
        addMovement(createMovement(ship.portId, ship.id, ship.currentTripId!, MovementEventType.AIS_UPDATE, { message: `Received AIS position update.` }));
    } else {
        // Optionally, create a new ship if it doesn't exist.
        // For simplicity, we'll only update existing ships in this simulation.
    }
    return Promise.resolve();
};

// --- Trip & History API ---
export const getTripsForPort = async (portId: string): Promise<Trip[]> => {
    const portTrips = trips[portId] || [];
    // Enrich with latest data
    const enrichedTrips = portTrips.map(trip => {
        const ship = ships[portId]?.find(s => s.id === trip.shipId);
        return {
            ...trip,
            vesselName: ship?.name || trip.vesselName,
            vesselImo: ship?.imo || trip.vesselImo,
            agentId: ship?.agentId || trip.agentId,
            pilotId: ship?.pilotId || trip.pilotId,
        }
    });
    return Promise.resolve(enrichedTrips);
};

export const updateTrip = async (id: string, tripData: Trip): Promise<Trip> => {
    const portTrips = trips[tripData.portId];
    if (!portTrips) throw new Error('Port not found');
    const tripIndex = portTrips.findIndex(t => t.id === id);
    if (tripIndex === -1) throw new Error('Trip not found');
    
    portTrips[tripIndex] = { ...portTrips[tripIndex], ...tripData };
    
    // Also update the ship with new personnel assignments
    const ship = ships[tripData.portId]?.find(s => s.id === tripData.shipId);
    if (ship && ship.currentTripId === id) {
        ship.agentId = tripData.agentId;
        ship.pilotId = tripData.pilotId;
    }

    return Promise.resolve(portTrips[tripIndex]);
};

export const getShipHistory = async (portId: string, shipId: string): Promise<ShipMovement[]> => {
    const history = shipMovements[portId] || [];
    return Promise.resolve(history.filter(m => m.shipId === shipId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
};

export const getHistoryForPort = async (portId: string): Promise<ShipMovement[]> => {
    return Promise.resolve(shipMovements[portId] || []);
};
