import React, { useMemo, useCallback, memo } from 'react';
import type { Ship } from '../types';
import { ShipStatus, UserRole } from '../types';
import ShipIcon from './icons/ShipIcon';
import FlameIcon from './icons/FlameIcon';
import AnchorIcon from './icons/AnchorIcon';
import { useAuth } from '../context/AuthContext';

interface VesselProps {
  ship: Ship;
  onClick: () => void;
  displayMode?: 'map' | 'list';
  pixelsPerNm?: number;
}

const statusColors: Record<ShipStatus, { base: string; hover: string; border: string; text: string }> = {
  [ShipStatus.APPROACHING]: { base: 'bg-orange-500/80', hover: 'hover:bg-orange-500', border: 'border-orange-300', text: 'text-white' },
  [ShipStatus.DOCKED]: { base: 'bg-yellow-500/80', hover: 'hover:bg-yellow-500', border: 'border-yellow-300', text: 'text-white' },
  [ShipStatus.DEPARTING]: { base: 'bg-sky-500/80', hover: 'hover:bg-sky-500', border: 'border-sky-300', text: 'text-white' },
  [ShipStatus.ANCHORED]: { base: 'bg-violet-500/80', hover: 'hover:bg-violet-500', border: 'border-violet-300', text: 'text-white' },
  [ShipStatus.LEFT_PORT]: { base: 'bg-slate-600/80', hover: 'hover:bg-slate-600', border: 'border-slate-500', text: 'text-white' },
};

const MapTooltip: React.FC<{ ship: Ship }> = memo(({ ship }) => (
    <div className="absolute bottom-full mb-2 w-max bg-gray-900 text-white text-xs rounded py-1 px-2 border border-gray-600 shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100 transition-all">
        <p><strong>{ship.name}</strong> ({ship.imo})</p>
        <p>Status: {ship.status}</p>
        {ship.hasDangerousGoods && <p className="text-red-400 font-bold">Warning: Dangerous Goods</p>}
    </div>
));

const DangerousGoodsIndicator: React.FC<{ placement: 'icon' | 'rectangle' }> = memo(({ placement }) => (
    <div className={`absolute ${placement === 'icon' ? 'top-0 right-0 transform translate-x-1/3 -translate-y-1/3' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`} title="Carrying Dangerous Goods">
        <FlameIcon className={`${placement === 'icon' ? 'w-4 h-4' : 'w-5 h-5'} text-red-400 drop-shadow-lg`} />
        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75 -z-10"></div>
    </div>
));

const MapVesselIcon: React.FC<{ ship: Ship; onClick: React.MouseEventHandler; canModify: boolean }> = memo(({ ship, onClick, canModify }) => {
    const color = statusColors[ship.status] || statusColors[ShipStatus.LEFT_PORT];
    const IconComponent = ship.status === ShipStatus.ANCHORED ? AnchorIcon : ShipIcon;
    return (
        <div onClick={canModify ? onClick : undefined} className={`group relative flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2 transition-transform group-hover:scale-125 ${color.base} ${color.border} ${canModify ? 'cursor-pointer' : ''}`} title={ship.name}>
            <IconComponent className={`w-4 h-4 ${color.text}`} />
            {ship.hasDangerousGoods && <DangerousGoodsIndicator placement="icon" />}
            <MapTooltip ship={ship} />
        </div>
    );
});

const MapVesselRectangle: React.FC<{ ship: Ship; onClick: React.MouseEventHandler; canModify: boolean; pixelsPerNm: number }> = memo(({ ship, onClick, canModify, pixelsPerNm }) => {
    const NM_PER_METER = 1 / 1852;
    const shipLengthPx = ship.length * NM_PER_METER * pixelsPerNm;
    const shipWidthPx = Math.max(8, shipLengthPx / 6);
    const color = statusColors[ship.status] || statusColors[ShipStatus.LEFT_PORT];
    return (
        <div onClick={canModify ? onClick : undefined} className={`group relative flex items-center justify-center rounded-sm shadow-lg border origin-center ${color.base} ${color.border} ${canModify ? 'cursor-pointer' : ''}`} style={{ width: `${shipLengthPx}px`, height: `${shipWidthPx}px` }}>
            {ship.hasDangerousGoods && <DangerousGoodsIndicator placement="rectangle" />}
            <MapTooltip ship={ship} />
        </div>
    );
});

const Vessel: React.FC<VesselProps> = ({ ship, onClick, displayMode = 'map', pixelsPerNm = 0 }) => {
    const { currentUser } = useAuth();
    const canModify = useMemo(() => currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR, [currentUser.role]);
    const handleClick = useCallback(() => { if (canModify) onClick(); }, [canModify, onClick]);

    if (displayMode === 'map') {
        if (ship.status === ShipStatus.DOCKED && pixelsPerNm > 0) {
            return <MapVesselRectangle ship={ship} onClick={handleClick} canModify={canModify} pixelsPerNm={pixelsPerNm} />;
        }
        return <MapVesselIcon ship={ship} onClick={handleClick} canModify={canModify} />;
    }
    return null; // List view was removed from PortMap for simplicity
};

export default memo(Vessel);