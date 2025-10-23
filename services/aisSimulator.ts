import L from 'leaflet';
import type { Ship, Berth, AisData } from '../types';
import { ShipStatus, BerthType } from '../types';
import { calculateDistanceNM, calculateBearing, toRad, toDeg, destinationPoint } from '../utils/geolocation';

const SIMULATION_INTERVAL_S = 7;
const PORT_EXIT_DISTANCE_NM = 20;

const knotsToDegreesPerSecond = (knots: number): number => {
    const metersPerSecond = knots * 0.514444;
    const metersPerDegree = 111320; // Approximate meters per degree of latitude
    return metersPerSecond / metersPerDegree;
};

export const runAisSimulationStep = (allShips: Ship[], allBerths: Berth[]): AisData[] => {
    const activeShips = allShips.filter(s => s.status !== ShipStatus.LEFT_PORT && s.lat && s.lon);
    const updatedShipData: AisData[] = [];

    activeShips.forEach(ship => {
        let updatedShip = { ...ship };
        
        const portBerths = allBerths.filter(b => b.portId === ship.portId);
        const portAnchorages = portBerths.filter(b => b.type === BerthType.ANCHORAGE);
        const portCenter = { lat: portAnchorages[0]?.geometry?.[0]?.[0] || 1.26, lon: portAnchorages[0]?.geometry?.[0]?.[1] || 103.82 }; // Fallback

        // --- Status-based Logic ---
        switch (updatedShip.status) {
            case ShipStatus.APPROACHING:
                if (!updatedShip.targetLat || !updatedShip.targetLon) {
                    // Assign a target anchorage if none exists
                    if (portAnchorages.length > 0) {
                        const targetAnchorage = portAnchorages[Math.floor(Math.random() * portAnchorages.length)];
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
                    const bearingFromPort = calculateBearing(portCenter.lat, portCenter.lon, updatedShip.lat!, updatedShip.lon!);
                    const exitPoint = destinationPoint(portCenter.lat, portCenter.lon, PORT_EXIT_DISTANCE_NM * 1852, bearingFromPort);
                    updatedShip.targetLat = exitPoint[0];
                    updatedShip.targetLon = exitPoint[1];
                }

                const distanceToPort = calculateDistanceNM(updatedShip.lat!, updatedShip.lon!, portCenter.lat, portCenter.lon);
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
            lat: updatedShip.lat,
            lon: updatedShip.lon,
            heading: updatedShip.heading,
            status: updatedShip.status !== ship.status ? updatedShip.status : undefined,
        });
    });

    return updatedShipData;
};
