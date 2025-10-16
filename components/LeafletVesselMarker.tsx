import React, { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';
import type { Ship } from '../types';
import { ShipStatus, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import ShipIcon from './icons/ShipIcon';
import AnchorIcon from './icons/AnchorIcon';
import TankerIcon from './icons/TankerIcon';
import CargoShipIcon from './icons/CargoShipIcon';

interface LeafletVesselMarkerProps {
    ship: Ship;
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
        ? AnchorIcon 
        : getShipTypeIcon(ship.type);
        
    // Use a prominent red stroke for the marker if it carries dangerous goods
    const dangerousGoodsStrokeClass = ship.hasDangerousGoods ? 'stroke-red-500' : color.border;

    return (
        // The drop shadow is applied via an inline style because Tailwind's filter classes won't be in the static HTML passed to Leaflet.
        <div style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
                {/* Main pointer shape */}
                <path 
                    d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26s16-16 16-26C32 7.163 24.837 0 16 0z" 
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


const LeafletVesselMarker: React.FC<LeafletVesselMarkerProps> = ({ ship }) => {
    const { currentUser } = useAuth();
    const { actions } = usePort();
    const canModify = useMemo(() => currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR, [currentUser.role]);

    const vesselIcon = useMemo(() => {
        const iconHtml = ReactDOMServer.renderToString(<VesselIcon ship={ship} />);
        return L.divIcon({
            html: iconHtml,
            className: 'leaflet-vessel-icon', // Use a custom class to remove default leaflet styles
            iconSize: [32, 42],
            iconAnchor: [16, 42], // Anchor at the bottom tip of the pointer
        });
    }, [ship]);

    if (!ship.lat || !ship.lon) return null;

    return (
        <Marker
            position={[ship.lat, ship.lon]}
            icon={vesselIcon}
            eventHandlers={{
                click: () => {
                    if (canModify) {
                        actions.openModal({ type: 'shipForm', ship });
                    }
                },
            }}
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