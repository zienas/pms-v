import React, { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import * as L from 'leaflet';
import ReactDOMServer from 'react-dom/server';
import type { Ship } from '../types';
import { ShipStatus, UserRole, InteractionEventType } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import ShipIcon from './icons/ShipIcon';
import BerthIcon from './icons/BerthIcon';
import TankerIcon from './icons/TankerIcon';
import CargoShipIcon from './icons/CargoShipIcon';
import { calculateBearing, toDeg } from '../utils/geolocation';
import { useLogger } from '../context/InteractionLoggerContext';

// FIX: Augment Leaflet's MarkerOptions to include properties from the leaflet-rotatedmarker plugin,
// which are passed down by React-Leaflet's Marker component. By augmenting the L namespace directly,
// we avoid module resolution issues that can occur with `declare module 'leaflet'`.
declare global {
    namespace L {
        interface MarkerOptions {
            rotationAngle?: number;
            rotationOrigin?: string;
        }
    }
}


interface LeafletVesselMarkerProps {
    ship: Ship;
    isInteractive: boolean;
}

const getShipTypeIcon = (shipType: string): React.ElementType => {
    const lowerType = shipType.toLowerCase();
    if (lowerType.includes('tanker')) {
        return TankerIcon;
    }
    if (lowerType.includes('container')) {
        return ShipIcon;
    }
    if (lowerType.includes('cargo') || lowerType.includes('bulk')) {
        return CargoShipIcon;
    }
    return ShipIcon; // Default fallback
};

// A modern, SVG-based map marker component.
const VesselIcon: React.FC<{ ship: Ship }> = ({ ship }) => {
    // Using brighter, more distinct Tailwind colors for SVG fills and strokes
    const statusColors: Record<ShipStatus, { base: string; border: string; text: string }> = {
        [ShipStatus.APPROACHING]: { base: 'fill-amber-500', border: 'stroke-amber-200', text: 'text-white' },
        [ShipStatus.DOCKED]: { base: 'fill-emerald-500', border: 'stroke-emerald-200', text: 'text-white' },
        [ShipStatus.DEPARTING]: { base: 'fill-sky-500', border: 'stroke-sky-200', text: 'text-white' },
        [ShipStatus.ANCHORED]: { base: 'fill-violet-500', border: 'stroke-violet-200', text: 'text-white' },
        [ShipStatus.LEFT_PORT]: { base: 'fill-slate-500', border: 'stroke-slate-300', text: 'text-white' },
    };

    const color = statusColors[ship.status] || statusColors[ShipStatus.LEFT_PORT];
    
    // The icon now represents status (anchored) or vessel type.
    const IconComponent = ship.status === ShipStatus.ANCHORED 
        ? BerthIcon 
        : getShipTypeIcon(ship.type);
        
    // Use a prominent red stroke for the marker if it carries dangerous goods
    const dangerousGoodsStrokeClass = ship.hasDangerousGoods ? 'stroke-red-500' : color.border;

    return (
        // The drop shadow is applied via an inline style because Tailwind's filter classes won't be in the static HTML passed to Leaflet.
        <div style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
                {/* Main pointer shape - updated to a ship hull shape */}
                <path 
                    d="M16 42 L0 30 V0 H32 V30 Z" 
                    className={`${color.base} ${dangerousGoodsStrokeClass}`}
                    strokeWidth="2"
                />
                {/* Inner icon (ship type or anchor) */}
                <g transform="translate(8 8)">
                    <IconComponent className={color.text} width="16" height="16" />
                </g>
            </svg>
        </div>
    );
};

const DockedVesselIcon: React.FC<{ ship: Ship }> = ({ ship }) => {
    const statusColors: Record<ShipStatus, { base: string; border: string; text: string }> = {
        [ShipStatus.APPROACHING]: { base: 'fill-amber-500', border: 'stroke-amber-200', text: 'text-white' },
        [ShipStatus.DOCKED]: { base: 'fill-emerald-500', border: 'stroke-emerald-200', text: 'text-white' },
        [ShipStatus.DEPARTING]: { base: 'fill-sky-500', border: 'stroke-sky-200', text: 'text-white' },
        [ShipStatus.ANCHORED]: { base: 'fill-violet-500', border: 'stroke-violet-200', text: 'text-white' },
        [ShipStatus.LEFT_PORT]: { base: 'fill-slate-500', border: 'stroke-slate-300', text: 'text-white' },
    };
    const color = statusColors[ship.status] || statusColors[ShipStatus.LEFT_PORT];
    const dangerousGoodsStrokeClass = ship.hasDangerousGoods ? 'stroke-red-500' : color.border;
    const IconComponent = getShipTypeIcon(ship.type);

    return (
        <div style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 16" width="50" height="16">
                <rect 
                    x="1" y="1" 
                    width="48" height="14" 
                    rx="2"
                    className={`${color.base} ${dangerousGoodsStrokeClass}`}
                    strokeWidth="2"
                />
                <g transform="translate(17 0)">
                     <IconComponent className={color.text} width="16" height="16" />
                </g>
            </svg>
        </div>
    );
};


const LeafletVesselMarker: React.FC<LeafletVesselMarkerProps> = ({ ship, isInteractive }) => {
    const { actions, state } = usePort();
    const { log } = useLogger();
    const { berths } = state;

    const rotationAngle = useMemo(() => {
        // Prioritize live heading data for moving vessels
        if (ship.status !== ShipStatus.DOCKED && ship.heading !== undefined) {
            return ship.heading;
        }

        // For docked ships, calculate rotation from berth geometry
        if (ship.status === ShipStatus.DOCKED && ship.berthIds.length > 0) {
            const primaryBerth = berths.find(b => b.id === ship.berthIds[0]);
            if (primaryBerth && primaryBerth.geometry && primaryBerth.geometry.length >= 2) {
                const p1 = primaryBerth.geometry[0];
                const p2 = primaryBerth.geometry[1];
                const bearingRad = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
                // Convert radians to degrees and normalize to 0-360
                return (toDeg(bearingRad) + 360) % 360;
            }
        }
        
        // Default: no rotation
        return 0;
    }, [ship, berths]);

    const vesselIcon = useMemo(() => {
        const isDocked = ship.status === ShipStatus.DOCKED;
        const iconHtml = ReactDOMServer.renderToString(
            isDocked ? <DockedVesselIcon ship={ship} /> : <VesselIcon ship={ship} />
        );
        return L.divIcon({
            html: iconHtml,
            className: 'leaflet-vessel-icon', // Use a custom class to remove default leaflet styles
            iconSize: isDocked ? [50, 16] : [32, 42],
            iconAnchor: isDocked ? [25, 8] : [16, 42], // Anchor center for rectangle, bottom tip for pointer
        });
    }, [ship]);

    if (!ship.lat || !ship.lon) return null;

    const handleVesselClick = () => {
        // FIX: Removed 'shipId' property which is not part of the LogDetails type. 'targetId' is sufficient.
        log(InteractionEventType.MAP_INTERACTION, {
            action: 'Click Vessel',
            targetId: ship.id,
            value: ship.name,
            message: `User clicked on vessel "${ship.name}" (ID: ${ship.id}) on the map.`
        });
        actions.openModal({ type: 'shipForm', ship });
    };

    const eventHandlers = isInteractive ? {
        click: handleVesselClick,
    } : {};

    return (
        <Marker
            position={[ship.lat, ship.lon]}
            icon={vesselIcon}
            rotationAngle={rotationAngle}
            rotationOrigin="center center"
            eventHandlers={eventHandlers}
        >
            <Tooltip>
                <div className="text-sm">
                    <p className="font-bold">{ship.name}</p>
                    <p>Type: {ship.type}</p>
                    <p>Status: {ship.status}</p>
                    {ship.hasDangerousGoods && <p className="text-red-500 font-bold">Warning: Dangerous Goods</p>}
                </div>
            </Tooltip>
        </Marker>
    );
};

// Add styles to disable default Leaflet icon styling and add a hover effect
const styleId = 'leaflet-vessel-icon-style';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
    .leaflet-vessel-icon {
      background: transparent;
      border: none;
      transition: transform 0.2s ease-in-out;
    }
    .leaflet-marker-icon.leaflet-vessel-icon:hover {
      transform: scale(1.1);
    }
    `;
    document.head.appendChild(style);
}

export default LeafletVesselMarker;