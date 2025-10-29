import L from 'leaflet';
import type { Ship, Berth, AisData } from '../types';
import { ShipStatus, BerthType } from '../types';
import { calculateDistanceNM, calculateBearing, toRad, toDeg, destinationPoint } from '../utils/geolocation';

const SIMULATION_INTERVAL_S = 7;
const PORT_EXIT_DISTANCE_NM = 20;
// Increased probability to generate a new vessel roughly every minute
const NEW_VESSEL_PROBABILITY = 0.12; 

const sampleVessels = [
    { name: 'Odyssey', type: 'Container Ship', callSign: 'A8CS5' },
    { name: 'Voyager', type: 'Bulk Carrier', callSign: 'V7HP9' },
    { name: 'Helios', type: 'Tanker', callSign: '3FBP8' },
    { name: 'Neptune', type: 'Cargo Ship', callSign: '9V7823' },
    { name: 'Stardust', type: 'LNG Tanker', callSign: '9HA5120' },
    { name: 'Aurora', type: 'Cruise Ship', callSign: 'C6FN7' },
];

const knotsToDegreesPerSecond = (knots: number): number => {
    const metersPerSecond = knots * 0.514444;
    const metersPerDegree = 111320; // Approximate meters per degree of latitude
    return metersPerSecond / metersPerDegree;
};

export const runAisSimulationStep = (
    allShips: Ship[], 
    allBerths: Berth[],
    portId: string,
    portCenter: { lat: number, lon: number }
): AisData[] => {
    const activeShips = allShips.filter(s => s.status !== ShipStatus.LEFT_PORT && s.lat && s.lon);
    const updatedShipData: AisData[] = [];

    // --- New Vessel Generation ---
    if (Math.random() < NEW_VESSEL_PROBABILITY) {
        const existingImos = new Set(allShips.map(s => s.imo));
        let newImo: string;
        do {
            newImo = Math.floor(1000000 + Math.random() * 9000000).toString();
        } while (existingImos.has(newImo));

        const template = sampleVessels[Math.floor(Math.random() * sampleVessels.length)];
        
        const bearingToPortDegrees = Math.random() * 360;
        const startBearingDegrees = (bearingToPortDegrees + 180) % 360; // Start from opposite direction
        const distanceNm = 15 + Math.random() * 5; // Start 15-20 NM away
        
        // FIX: Convert bearing from degrees to radians before passing to destinationPoint function.
        const startBearingRadians = toRad(startBearingDegrees);
        const [startLat, startLon] = destinationPoint(portCenter.lat, portCenter.lon, distanceNm * 1852, startBearingRadians);

        const newVesselAisData: AisData = {
            imo: newImo,
            portId: portId,
            name: template.name,
            callSign: template.callSign,
            type: template.type,
            status: ShipStatus.APPROACHING,
            lat: startLat,
            lon: startLon,
            heading: (toDeg(calculateBearing(startLat, startLon, portCenter.lat, portCenter.lon)) + 360) % 360,
        };

        updatedShipData.push(newVesselAisData);
        console.log(`[SIM] Generating new vessel: ${template.name} (IMO: ${newImo}) for port ${portId}`);
    }


    activeShips.forEach(ship => {
        let updatedShip = { ...ship };
        
        // FIX: This logic was flawed. It should use the passed `portCenter` for the current port.
        // The previous logic could pick an arbitrary port's center if there were no anchorages defined.
        const shipPortCenter = portCenter;

        // --- Status-based Logic ---
        switch (updatedShip.status) {
            case ShipStatus.APPROACHING:
                if (!updatedShip.targetLat || !updatedShip.targetLon) {
                    // Assign a target anchorage if none exists
                    const shipPortAnchorages = allBerths.filter(b => b.portId === ship.portId && b.type === BerthType.ANCHORAGE);
                    if (shipPortAnchorages.length > 0) {
                        const targetAnchorage = shipPortAnchorages[Math.floor(Math.random() * shipPortAnchorages.length)];
                        const center = L.polygon(targetAnchorage.geometry!).getBounds().getCenter();
                        updatedShip.targetLat = center.lat;
                        updatedShip.targetLon = center.lng;
                    }
                }

                if (updatedShip.targetLat && updatedShip.targetLon) {
                    const distanceToTarget = calculateDistanceNM(updatedShip.lat!, updatedShip.lon!, updatedShip.targetLat, updatedShip.targetLon);
                    if (distanceToTarget < 0.5) {
                        updatedShip.status = ShipStatus.ANCHORED;
                        updatedShip.targetLat = undefined;
                        updatedShip.targetLon = undefined;
                    }
                }
                break;
            
            case ShipStatus.DEPARTING:
                if (!updatedShip.targetLat || !updatedShip.targetLon) {
                    const bearingFromPort = calculateBearing(shipPortCenter.lat, shipPortCenter.lon, updatedShip.lat!, updatedShip.lon!);
                    const exitPoint = destinationPoint(shipPortCenter.lat, shipPortCenter.lon, PORT_EXIT_DISTANCE_NM * 1852, bearingFromPort);
                    updatedShip.targetLat = exitPoint[0];
                    updatedShip.targetLon = exitPoint[1];
                }

                const distanceToPort = calculateDistanceNM(updatedShip.lat!, updatedShip.lon!, shipPortCenter.lat, shipPortCenter.lon);
                if (distanceToPort > PORT_EXIT_DISTANCE_NM) {
                    updatedShip.status = ShipStatus.LEFT_PORT;
                }
                break;

            case ShipStatus.ANCHORED:
                // Small drift
                updatedShip.lat! += (Math.random() - 0.5) * 0.0001;
                updatedShip.lon! += (Math.random() - 0.5) * 0.0001;
                if (Math.random() < 0.01) {
                    updatedShip.status = ShipStatus.DEPARTING;
                }
                break;
            
            case ShipStatus.DOCKED:
                 // Minimal drift
                updatedShip.lat! += (Math.random() - 0.5) * 0.00001;
                updatedShip.lon! += (Math.random() - 0.5) * 0.00001;
                 if (Math.random() < 0.005) {
                    updatedShip.status = ShipStatus.DEPARTING;
                    updatedShip.berthIds = [];
                }
                break;
        }

        // --- Movement Logic ---
        let currentSpeed = updatedShip.speed || 10;
        
        // Simple Collision Avoidance
        for (const otherShip of activeShips) {
            if (otherShip.id === updatedShip.id || !otherShip.lat || !otherShip.lon) continue;
            
            const distanceToOther = calculateDistanceNM(updatedShip.lat!, updatedShip.lon!, otherShip.lat, otherShip.lon);
            if (distanceToOther < 0.5) { // Check within 0.5 NM
                const bearingToOther = (toDeg(calculateBearing(updatedShip.lat!, updatedShip.lon!, otherShip.lat, otherShip.lon)) + 360) % 360;
                const headingDiff = Math.abs(bearingToOther - (updatedShip.heading || 0));
                if (headingDiff < 30 || headingDiff > 330) { // If other ship is in front
                    currentSpeed *= 0.5; // Slow down
                    break;
                }
            }
        }

        if (updatedShip.targetLat && updatedShip.targetLon) {
            const heading = updatedShip.heading ?? 0;
            const rateOfTurn = updatedShip.rateOfTurn ?? 5; // degrees per minute
            const maxTurnPerStep = (rateOfTurn / 60) * SIMULATION_INTERVAL_S;
            
            const targetBearing = (toDeg(calculateBearing(updatedShip.lat!, updatedShip.lon!, updatedShip.targetLat, updatedShip.targetLon)) + 360) % 360;
            let bearingDiff = targetBearing - heading;

            // Normalize difference to -180 to 180
            if (bearingDiff > 180) bearingDiff -= 360;
            if (bearingDiff < -180) bearingDiff += 360;

            const turn = Math.max(-maxTurnPerStep, Math.min(maxTurnPerStep, bearingDiff));
            updatedShip.heading = (heading + turn + 360) % 360;

            const distancePerStep = knotsToDegreesPerSecond(currentSpeed) * SIMULATION_INTERVAL_S;
            const headingRad = toRad(updatedShip.heading);
            updatedShip.lat! += distancePerStep * Math.cos(headingRad);
            updatedShip.lon! += distancePerStep * Math.sin(headingRad);
        }

        updatedShipData.push({
            imo: updatedShip.imo,
            portId: updatedShip.portId,
            callSign: updatedShip.callSign,
            lat: updatedShip.lat,
            lon: updatedShip.lon,
            heading: updatedShip.heading,
            status: updatedShip.status !== ship.status ? updatedShip.status : undefined,
        });
    });

    return updatedShipData;
};