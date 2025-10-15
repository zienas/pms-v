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
import FlameIcon from './icons/FlameIcon';

interface LeafletVesselMarkerProps {
    ship: Ship;
}

const statusColors: Record<ShipStatus, { base: string; border: string; text: string }> = {
  [ShipStatus.APPROACHING]: { base: 'bg-orange-500/80', border: 'border-orange-300', text: 'text-white' },
  [ShipStatus.DOCKED]: { base: 'bg-yellow-500/80', border: 'border-yellow-300', text: 'text-white' },
  [ShipStatus.DEPARTING]: { base: 'bg-sky-500/80', border: 'border-sky-300', text: 'text-white' },
  [ShipStatus.ANCHORED]: { base: 'bg-violet-500/80', border: 'border-violet-300', text: 'text-white' },
  [ShipStatus.LEFT_PORT]: { base: 'bg-slate-600/80', border: 'border-slate-500', text: 'text-white' },
};

// A simple component to be rendered to string for the icon
const VesselIcon: React.FC<{ ship: Ship }> = ({ ship }) => {
    const color = statusColors[ship.status] || statusColors[ShipStatus.LEFT_PORT];
    const IconComponent = ship.status === ShipStatus.ANCHORED ? AnchorIcon : ShipIcon;

    return (
        <div className={`flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2 transition-transform group-hover:scale-125 ${color.base} ${color.border}`}>
            <IconComponent className={`w-4 h-4 ${color.text}`} />
            {ship.hasDangerousGoods && (
                <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3" title="Carrying Dangerous Goods">
                    <FlameIcon className="w-4 h-4 text-red-400 drop-shadow-lg" />
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75 -z-10"></div>
                </div>
            )}
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
            iconSize: [28, 28],
            iconAnchor: [14, 14],
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
                    <p>Status: {ship.status}</p>
                    {ship.hasDangerousGoods && <p className="text-red-500 font-bold">Warning: Dangerous Goods</p>}
                </div>
            </Tooltip>
        </Marker>
    );
};

// Add a minimal style to disable default Leaflet icon styling on our custom divIcons
const style = document.createElement('style');
style.innerHTML = `
.leaflet-vessel-icon {
  background: transparent;
  border: none;
}
`;
document.head.appendChild(style);

export default LeafletVesselMarker;
