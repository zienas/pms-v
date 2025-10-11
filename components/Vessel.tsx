import * as React from 'react';
import type { Ship } from '../types';
import { ShipStatus, UserRole } from '../types';
import ShipIcon from './icons/ShipIcon';
import FlameIcon from './icons/FlameIcon';
import AnchorIcon from './icons/AnchorIcon';
import { useAuth } from '../context/AuthContext';

// --- PROPS ---
interface VesselProps {
  ship: Ship;
  onClick: () => void;
  displayMode?: 'map' | 'list';
  pixelsPerNm?: number;
}

// --- STYLING ---
// A more structured color scheme for maintainability
const statusColors: { [key in ShipStatus]: { base: string; hover: string; border: string; text: string } } = {
  [ShipStatus.APPROACHING]: { base: 'bg-orange-500/80', hover: 'hover:bg-orange-500', border: 'border-orange-300', text: 'text-white' },
  [ShipStatus.DOCKED]: { base: 'bg-yellow-500/80', hover: 'hover:bg-yellow-500', border: 'border-yellow-300', text: 'text-white' },
  [ShipStatus.DEPARTING]: { base: 'bg-sky-500/80', hover: 'hover:bg-sky-500', border: 'border-sky-300', text: 'text-white' },
  [ShipStatus.ANCHORED]: { base: 'bg-violet-500/80', hover: 'hover:bg-violet-500', border: 'border-violet-300', text: 'text-white' },
  [ShipStatus.LEFT_PORT]: { base: 'bg-slate-600/80', hover: 'hover:bg-slate-600', border: 'border-slate-500', text: 'text-white' },
};

// --- SUB-COMPONENTS ---

// Common tooltip for map vessels to reduce duplication
const MapTooltip: React.FC<{ ship: Ship }> = ({ ship }) => (
    <div className="absolute bottom-full mb-2 w-max bg-gray-900 text-white text-xs rounded py-1 px-2 border border-gray-600 shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100 transition-all duration-200 ease-out">
        <p><strong>Name:</strong> {ship.name}</p>
        <p><strong>IMO:</strong> {ship.imo}</p>
        <p><strong>Status:</strong> {ship.status}</p>
        {ship.hasDangerousGoods && <p className="text-red-400 font-bold">Warning: Dangerous Goods</p>}
    </div>
);

// Common dangerous goods indicator
const DangerousGoodsIndicator: React.FC<{ placement: 'icon' | 'rectangle' }> = ({ placement }) => {
    const isIcon = placement === 'icon';
    const positionClasses = isIcon
        ? 'absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3'
        : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    const iconSize = isIcon ? 'w-4 h-4' : 'w-5 h-5';

    return (
        <div className={positionClasses} title="Carrying Dangerous Goods">
            <FlameIcon className={`${iconSize} text-red-400 drop-shadow-lg [filter:drop-shadow(0_0_3px_rgb(239_68_68))]`} />
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75 -z-10"></div>
        </div>
    );
};

// Renders the circular icon for moving or anchored vessels on the map.
const MapVesselIcon: React.FC<{ ship: Ship; onClick: React.MouseEventHandler; canModify: boolean }> = ({ ship, onClick, canModify }) => {
    const color = statusColors[ship.status] || statusColors[ShipStatus.LEFT_PORT];
    const IconComponent = ship.status === ShipStatus.ANCHORED ? AnchorIcon : ShipIcon;
    const cursorClass = canModify ? 'cursor-pointer' : 'cursor-default';

    return (
        <div
            onClick={canModify ? onClick : undefined}
            className={`group relative flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2 transition-transform duration-200 ease-in-out group-hover:scale-125 ${color.base} ${color.border} ${cursorClass}`}
            title={ship.name}
        >
            <IconComponent className={`w-4 h-4 ${color.text}`} />
            {ship.hasDangerousGoods && <DangerousGoodsIndicator placement="icon" />}
            <MapTooltip ship={ship} />
        </div>
    );
};

// Renders the scaled rectangle for docked vessels, ensuring it reflects the vessel's actual length.
const MapVesselRectangle: React.FC<{ ship: Ship; onClick: React.MouseEventHandler; canModify: boolean; pixelsPerNm: number }> = ({ ship, onClick, canModify, pixelsPerNm }) => {
    const NM_PER_METER = 1 / 1852;
    const shipLengthPx = ship.length * NM_PER_METER * pixelsPerNm;
    // Ensure a minimum width for visibility at low zoom levels, while maintaining a realistic aspect ratio.
    const shipWidthPx = Math.max(8, shipLengthPx / 6);
    
    const color = statusColors[ship.status] || statusColors[ShipStatus.LEFT_PORT];
    const cursorClass = canModify ? 'cursor-pointer' : 'cursor-default';

    return (
        <div
            onClick={canModify ? onClick : undefined}
            className={`group relative flex items-center justify-center rounded-sm shadow-lg border origin-center ${color.base} ${color.border} ${cursorClass}`}
            style={{ width: `${shipLengthPx}px`, height: `${shipWidthPx}px` }}
        >
            {ship.hasDangerousGoods && <DangerousGoodsIndicator placement="rectangle" />}
            <MapTooltip ship={ship} />
        </div>
    );
};

// Renders a compact view for the "Unlocated Vessels" list panel.
const ListVesselItem: React.FC<{ ship: Ship; onClick: React.MouseEventHandler; canModify: boolean }> = ({ ship, onClick, canModify }) => {
    const color = statusColors[ship.status] || statusColors[ShipStatus.LEFT_PORT];
    const cursorClass = canModify ? 'cursor-pointer hover:scale-105' : 'cursor-default';
    
    return (
        <div
            onClick={canModify ? onClick : undefined}
            className={`group relative p-2 rounded-md shadow-lg transition-all duration-200 ease-in-out transform border ${color.base} ${color.border} ${color.hover} ${cursorClass}`}
            style={{ minWidth: '120px' }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center truncate">
                    <ShipIcon className="w-4 h-4 mr-2 text-white/80 flex-shrink-0" />
                    <p className="text-xs font-bold text-white truncate">{ship.name}</p>
                </div>
                {ship.hasDangerousGoods && (
                    <div className="relative flex-shrink-0 ml-1" title="Carrying Dangerous Goods">
                        <FlameIcon className="w-4 h-4 text-red-400" />
                        <div className="absolute top-0 left-0 w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                )}
            </div>
            <div className="absolute hidden group-hover:block bottom-full mb-2 w-max bg-gray-900 text-white text-xs rounded py-1 px-2 border border-gray-600 shadow-xl z-10">
                <p><strong>IMO:</strong> {ship.imo}</p>
                <p><strong>Type:</strong> {ship.type}</p>
                <p><strong>Status:</strong> {ship.status}</p>
                {ship.hasDangerousGoods && <p className="text-red-400 font-bold">Warning: Dangerous Goods</p>}
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---
// This component acts as a controller, dispatching to the appropriate sub-component
// based on the display mode and vessel status.
const Vessel: React.FC<VesselProps> = ({ ship, onClick, displayMode = 'list', pixelsPerNm }) => {
    const { currentUser } = useAuth();

    const canModify = React.useMemo(() => {
        return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR;
    }, [currentUser.role]);
    
    // Wrap the onClick to enforce permissions centrally.
    const handleClick = React.useCallback(() => {
        if (canModify) {
            onClick();
        }
    }, [canModify, onClick]);

    if (displayMode === 'map') {
        // Render a scaled rectangle for docked vessels if zoom level is sufficient.
        if (ship.status === ShipStatus.DOCKED && pixelsPerNm && pixelsPerNm > 0) {
            return <MapVesselRectangle ship={ship} onClick={handleClick} canModify={canModify} pixelsPerNm={pixelsPerNm} />;
        }
        // Otherwise, render a standard icon for all other vessels on the map.
        return <MapVesselIcon ship={ship} onClick={handleClick} canModify={canModify} />;
    }

    // Default to 'list' view for side panels, etc.
    return <ListVesselItem ship={ship} onClick={handleClick} canModify={canModify} />;
};

export default React.memo(Vessel);