import type { Port, Ship } from '../types';
import { ShipStatus } from '../types';
import { calculateDistanceNM } from '../utils/geolocation';

// --- Simulation Data ---
const SHIP_NAMES = [
  "Wanderer", "Odyssey", "Pioneer", "Stardust", "Neptune's Pride", "Triton", "Sea Serpent", "Galleon's Ghost",
  "Ironclad", "Leviathan", "Kraken's Fury", "Abyss", "Horizon", "Comet", "Stellar", "Cosmos", "Galaxy",
];

const SHIP_TYPES = [
    "Container Ship", "Bulk Carrier", "Tanker", "Ro-Ro", "LNG Carrier", "Crude Oil Tanker"
];

const FLAGS = [ "Panama", "Liberia", "Marshall Islands", "Hong Kong", "Singapore", "Malta", "Bahamas", "Greece", "China", "Cyprus"];


// --- Helper Functions ---

// Get a random element from an array
const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Generate a random number between min and max (inclusive)
const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};


// --- Simulation Logic ---

/**
 * Creates a brand new ship with random properties, positioned at a distance from a port.
 */
const createNewShip = (ports: Port[]): Omit<Ship, 'id'> => {
    const port = getRandom(ports);

    // Create the ship at a random point between 10-20 NM away from its destination port
    const angle = Math.random() * 2 * Math.PI;
    const distanceNM = 10 + Math.random() * 10;
    const distanceKm = distanceNM * 1.852;
    const earthRadiusKm = 6371;
    const lat1Rad = port.lat * (Math.PI / 180);
    const lon1Rad = port.lon * (Math.PI / 180);
    
    const lat2Rad = Math.asin(Math.sin(lat1Rad) * Math.cos(distanceKm / earthRadiusKm) + Math.cos(lat1Rad) * Math.sin(distanceKm / earthRadiusKm) * Math.cos(angle));
    const lon2Rad = lon1Rad + Math.atan2(Math.sin(angle) * Math.sin(distanceKm / earthRadiusKm) * Math.cos(lat1Rad), Math.cos(distanceKm / earthRadiusKm) - Math.sin(lat1Rad) * Math.sin(lat2Rad));

    return {
        portId: port.id,
        name: `MV ${getRandom(SHIP_NAMES)}`,
        imo: getRandomInt(9000000, 9999999).toString(),
        type: getRandom(SHIP_TYPES),
        length: getRandomInt(150, 400),
        draft: getRandomInt(8, 16),
        flag: getRandom(FLAGS),
        eta: new Date(Date.now() + getRandomInt(1, 24) * 3600000).toISOString(),
        etd: new Date(Date.now() + getRandomInt(25, 72) * 3600000).toISOString(),
        status: ShipStatus.APPROACHING, // Start as approaching
        berthIds: [],
        hasDangerousGoods: Math.random() < 0.15,
        lat: lat2Rad * (180 / Math.PI),
        lon: lon2Rad * (180 / Math.PI),
    };
};

/**
 * Tries to update an existing ship's status based on more realistic rules.
 */
const updateExistingShip = (allShips: Ship[], allPorts: Port[]): Ship | null => {
    const updatableShips = allShips.filter(ship => 
        // Simulator can move ships that are approaching or change status of those departing
        ship.status === ShipStatus.DEPARTING || (ship.status === ShipStatus.APPROACHING && ship.lat && ship.lon)
    );

    if (updatableShips.length === 0) {
        return null;
    }

    const shipToUpdate = { ...getRandom(updatableShips) };
    const port = allPorts.find(p => p.id === shipToUpdate.portId);

    if (!port) return null;

    if (shipToUpdate.status === ShipStatus.APPROACHING && shipToUpdate.lat && shipToUpdate.lon) {
        const distance = calculateDistanceNM(shipToUpdate.lat, shipToUpdate.lon, port.lat, port.lon);
        // If very close, move to anchorage
        if (distance < 0.5) {
             shipToUpdate.status = ShipStatus.ANCHORED;
        } else {
            // Otherwise, move it 20% of the remaining distance closer to the port
            const moveFraction = 0.20;
            shipToUpdate.lat += (port.lat - shipToUpdate.lat) * moveFraction;
            shipToUpdate.lon += (port.lon - shipToUpdate.lon) * moveFraction;
        }
    } else if (shipToUpdate.status === ShipStatus.DEPARTING) {
        shipToUpdate.status = ShipStatus.LEFT_PORT;
        shipToUpdate.berthIds = [];
        shipToUpdate.departureDate = new Date().toISOString();
    } else {
        return null;
    }
    
    return shipToUpdate;
};


/**
 * Runs a single step of the AIS simulation.
 * It will randomly decide to either create a new ship or update an existing one.
 */
export const runAisUpdateStep = (ports: Port[], allShips: Ship[]): { newShip?: Omit<Ship, 'id'>, updatedShip?: Ship } => {
    // Simple chance mechanism: 20% chance to create a new ship, otherwise try to update one.
    const actionChance = Math.random();

    if (actionChance < 0.2 && ports.length > 0) {
        // Create a new ship
        const newShip = createNewShip(ports);
        console.log(`[AIS SIM] New vessel detected: ${newShip.name} for ${newShip.portId}`);
        return { newShip };
    } else {
        // Try to update an existing ship
        const updatedShip = updateExistingShip(allShips, ports);
        if (updatedShip) {
            console.log(`[AIS SIM] Status update for ${updatedShip.name}: now ${updatedShip.status} at [${updatedShip.lat?.toFixed(4)}, ${updatedShip.lon?.toFixed(4)}]`);
            return { updatedShip };
        }
    }
    
    // No action taken in this step
    return {};
};