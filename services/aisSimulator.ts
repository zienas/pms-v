import { Ship, Port, ShipStatus, AisData } from '../types';
import { calculateDistanceNM } from '../utils/geolocation';

const MOVEMENT_SPEED_DEGREES = 0.005; // Approx speed in lat/lon degrees

// This function returns an object that can be passed to the updateShipFromAIS API
export const runAisUpdateStep = (ports: Port[], allShips: Ship[], pilotThreshold: number): { newShip?: Omit<Ship, 'id'>, updatedShip?: Ship } => {
    const activeShips = allShips.filter(s => s.status !== ShipStatus.LEFT_PORT && s.lat && s.lon);

    // Decision: Create a new ship or update an existing one?
    // Create if there are no active ships, or with a 10% chance if there are.
    const shouldCreateNewShip = (activeShips.length === 0 || Math.random() < 0.1) && ports.length > 0;

    if (shouldCreateNewShip) {
        const port = ports[Math.floor(Math.random() * ports.length)];
        const newShip: Omit<Ship, 'id'> = {
            portId: port.id,
            name: `Newcomer ${Math.floor(Math.random() * 1000)}`,
            imo: `${Math.floor(1000000 + Math.random() * 9000000)}`,
            type: 'Cargo',
            length: 150,
            draft: 8,
            flag: 'LR',
            eta: new Date().toISOString(),
            etd: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
            status: ShipStatus.APPROACHING,
            berthIds: [],
            hasDangerousGoods: Math.random() < 0.1,
            // Spawn outside the port
            lat: port.lat + (Math.random() > 0.5 ? 1 : -1) * (0.1 + Math.random() * 0.1),
            lon: port.lon + (Math.random() > 0.5 ? 1 : -1) * (0.1 + Math.random() * 0.1),
        };
        // The context will call api.updateShipFromAIS which handles creation
        return { updatedShip: { ...newShip, id: 'temp-id' } };
    }

    // If we didn't create a new ship, update an existing one.
    if (activeShips.length > 0) {
        const shipToUpdate = { ...activeShips[Math.floor(Math.random() * activeShips.length)] };
        const port = ports.find(p => p.id === shipToUpdate.portId);
        if (!port || shipToUpdate.lat === undefined || shipToUpdate.lon === undefined) return {};

        const distanceToPort = calculateDistanceNM(shipToUpdate.lat, shipToUpdate.lon, port.lat, port.lon);
        
        switch (shipToUpdate.status) {
            case ShipStatus.APPROACHING:
                // Move towards port
                if (distanceToPort > 0.1) {
                    const angle = Math.atan2(port.lat - shipToUpdate.lat, port.lon - shipToUpdate.lon);
                    shipToUpdate.lat += MOVEMENT_SPEED_DEGREES * Math.sin(angle);
                    shipToUpdate.lon += MOVEMENT_SPEED_DEGREES * Math.cos(angle);
                }
                // When within pilot threshold, it has a chance to move to anchorage. It doesn't auto-dock.
                if (distanceToPort < pilotThreshold) {
                    if (Math.random() > 0.7) { // 30% chance to move to anchorage
                        shipToUpdate.status = ShipStatus.ANCHORED;
                    }
                }
                break;
            case ShipStatus.ANCHORED:
                // Small random drift at anchorage, more than when docked
                shipToUpdate.lat += (Math.random() - 0.5) * 0.001;
                shipToUpdate.lon += (Math.random() - 0.5) * 0.001;
                if (Math.random() < 0.05) { // 5% chance to start departing
                    shipToUpdate.status = ShipStatus.DEPARTING;
                }
                break;
            case ShipStatus.DOCKED:
                 // Very small random drift while at berth
                shipToUpdate.lat += (Math.random() - 0.5) * 0.0001;
                shipToUpdate.lon += (Math.random() - 0.5) * 0.0001;

                const randomActionDocked = Math.random();
                if (randomActionDocked < 0.02) { // 2% chance to start departing
                    shipToUpdate.status = ShipStatus.DEPARTING;
                    shipToUpdate.berthIds = []; // Clear berths on departure
                } else if (randomActionDocked < 0.03) { // Additional 1% chance to move to anchorage
                    shipToUpdate.status = ShipStatus.ANCHORED;
                    shipToUpdate.berthIds = []; // Clear berths when moving to anchorage
                }
                break;
            case ShipStatus.DEPARTING:
                // Move away from port
                const angle = Math.atan2(port.lat - shipToUpdate.lat, port.lon - shipToUpdate.lon);
                shipToUpdate.lat -= MOVEMENT_SPEED_DEGREES * Math.sin(angle);
                shipToUpdate.lon -= MOVEMENT_SPEED_DEGREES * Math.cos(angle);
                if (distanceToPort > 10) {
                    shipToUpdate.status = ShipStatus.LEFT_PORT;
                }
                break;
        }
        return { updatedShip: shipToUpdate };
    }
    
    return {};
};