import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Ship, Berth, Port } from '../types';
import { ShipStatus } from '../types';
import Vessel from './Vessel';
import PortCenterIcon from './icons/PortCenterIcon';
import ZoomInIcon from './icons/ZoomInIcon';
import ZoomOutIcon from './icons/ZoomOutIcon';
import { usePort } from '../context/PortContext';

const FILTERABLE_STATUSES: ShipStatus[] = [ShipStatus.APPROACHING, ShipStatus.DOCKED, ShipStatus.ANCHORED, ShipStatus.DEPARTING];

interface PortMapProps {
  ships: Ship[];
  berths: Berth[];
  selectedPort: Port;
}

const PortMap: React.FC<PortMapProps> = ({ ships, berths, selectedPort }) => {
  const { actions } = usePort();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [statusFilters, setStatusFilters] = useState<Set<ShipStatus>>(new Set(FILTERABLE_STATUSES));

  const allActiveShips = useMemo(() => ships.filter(s => s.status !== ShipStatus.LEFT_PORT), [ships]);
  const filteredShips = useMemo(() => allActiveShips.filter(s => statusFilters.has(s.status)), [allActiveShips, statusFilters]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => setMapSize({ width: container.clientWidth, height: container.clientHeight }));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { pixelsPerDegLat, pixelsPerDegLon, pixelsPerNm } = useMemo(() => {
    const VIEW_RADIUS_NM = 3.0;
    const effectiveMapSize = Math.min(mapSize.width, mapSize.height);
    const effectivePixelsPerNm = ((effectiveMapSize / 2) / VIEW_RADIUS_NM) * zoomLevel;
    const NM_PER_DEG_LAT = 60.0;
    const portLatRad = (selectedPort.lat || 0) * (Math.PI / 180);
    const NM_PER_DEG_LON = NM_PER_DEG_LAT * Math.cos(portLatRad);
    return {
        pixelsPerNm: effectivePixelsPerNm,
        pixelsPerDegLat: NM_PER_DEG_LAT * effectivePixelsPerNm,
        pixelsPerDegLon: NM_PER_DEG_LON * effectivePixelsPerNm,
    };
  }, [mapSize, zoomLevel, selectedPort.lat]);
  
  const handleFilterChange = (status: ShipStatus) => {
    setStatusFilters(prev => {
        const newFilters = new Set(prev);
        newFilters.has(status) ? newFilters.delete(status) : newFilters.add(status);
        return newFilters;
    });
  };

  const getBerthAngle = (berth: Berth): number => {
    if (!berth.geometry || berth.geometry.length < 2) return 0;
    const [p1_lat, p1_lon] = berth.geometry[0];
    const [p2_lat, p2_lon] = berth.geometry[berth.geometry.length -1];
    const angleRad = Math.atan2(-(p2_lat - p1_lat) * pixelsPerDegLat, (p2_lon - p1_lon) * pixelsPerDegLon);
    return angleRad * (180 / Math.PI);
  };

  const getBerthCenter = (berth: Berth): [number, number] | null => {
    if (!berth.geometry || berth.geometry.length === 0) return null;
    const avgLat = berth.geometry.reduce((sum, p) => sum + p[0], 0) / berth.geometry.length;
    const avgLon = berth.geometry.reduce((sum, p) => sum + p[1], 0) / berth.geometry.length;
    return [avgLat, avgLon];
  }
  
  const backgroundStyle = useMemo(() => selectedPort.mapImage ? { backgroundImage: `url(${selectedPort.mapImage})`, opacity: 0.6 } : { opacity: 0.1 }, [selectedPort.mapImage]);

  return (
    <div className="bg-gray-800 rounded-lg h-full flex flex-col md:flex-row gap-4 p-4">
      <div ref={mapContainerRef} className="flex-1 bg-gray-900/50 rounded-lg overflow-hidden relative border border-gray-700 min-h-[400px] md:min-h-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cover bg-center" style={backgroundStyle}></div>
        
        {/* UI Overlays */}
        <div className="absolute top-4 left-4 z-20"><h2 className="text-lg font-bold text-white bg-gray-900/70 px-3 py-2 rounded-lg">{selectedPort.name}</h2></div>
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
          <button onClick={() => setZoomLevel(z => Math.min(z * 1.2, 5))} className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600"><ZoomInIcon className="w-5 h-5" /></button>
          <button onClick={() => setZoomLevel(z => Math.max(z / 1.2, 0.2))} className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600"><ZoomOutIcon className="w-5 h-5" /></button>
        </div>
        
        {/* Proximity Circle */}
        <div className="absolute top-1/2 left-1/2 border-2 border-dashed border-yellow-500/50 rounded-full" style={{ width: `${4 * pixelsPerNm}px`, height: `${4 * pixelsPerNm}px`, transform: 'translate(-50%, -50%)' }}><span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 px-2 text-xs text-yellow-400">2 NM</span></div>
        
         {/* Geometry & Vessels */}
        {mapSize.width > 0 && (
            <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 5 }}>
                 {selectedPort.geometry && <polygon points={selectedPort.geometry.map(([lat, lon]) => `${(lon - selectedPort.lon) * pixelsPerDegLon + mapSize.width/2},${-(lat - selectedPort.lat) * pixelsPerDegLat + mapSize.height/2}`).join(' ')} className="fill-cyan-500/10 stroke-cyan-300" strokeWidth="1.5" strokeDasharray="8,8" style={{ vectorEffect: 'non-scaling-stroke' }} />}
                 {berths.map(berth => {
                    if (!berth.geometry) return null;
                    const occupyingShip = allActiveShips.find(s => s.berthIds.includes(berth.id));
                    return <polygon key={berth.id} points={berth.geometry.map(([lat, lon]) => `${(lon - selectedPort.lon) * pixelsPerDegLon + mapSize.width/2},${-(lat - selectedPort.lat) * pixelsPerDegLat + mapSize.height/2}`).join(' ')} onClick={() => actions.openModal({ type: 'berthDetail', berth })} className={`transition-colors cursor-pointer ${occupyingShip ? 'fill-emerald-500/30 stroke-emerald-400 hover:fill-emerald-500/50' : 'fill-cyan-500/30 stroke-cyan-400 hover:fill-cyan-500/50'}`} strokeWidth="1.5" style={{ vectorEffect: 'non-scaling-stroke' }}><title>{berth.name}{occupyingShip ? ` - Occupied by ${occupyingShip.name}` : ' - Available'}</title></polygon>
                 })}
            </svg>
        )}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" title={selectedPort.name}><PortCenterIcon className="w-8 h-8 text-cyan-400" /></div>

        {filteredShips.filter(s => s.lat && s.lon).map(ship => {
          let transform = '';
          if (ship.status === ShipStatus.DOCKED && ship.berthIds.length > 0) {
              const primaryBerth = berths.find(b => b.id === ship.berthIds[0]);
              const berthCenter = primaryBerth ? getBerthCenter(primaryBerth) : null;
              if (berthCenter) {
                  const berthAngle = primaryBerth ? getBerthAngle(primaryBerth) : 0;
                  const [centerLat, centerLon] = berthCenter;
                  const offsetX = Math.cos((berthAngle + 90) * (Math.PI / 180)) * 15 * zoomLevel;
                  const offsetY = Math.sin((berthAngle + 90) * (Math.PI / 180)) * 15 * zoomLevel;
                  transform = `translate(calc(-50% + ${(centerLon - selectedPort.lon) * pixelsPerDegLon + offsetX}px), calc(-50% - ${(centerLat - selectedPort.lat) * pixelsPerDegLat - offsetY}px)) rotate(${berthAngle}deg)`;
              }
          } else {
              transform = `translate(calc(-50% + ${(ship.lon - selectedPort.lon) * pixelsPerDegLon}px), calc(-50% - ${(ship.lat - selectedPort.lat) * pixelsPerDegLat}px))`;
          }
          return <div key={ship.id} className="absolute top-1/2 left-1/2 transition-all duration-[3000ms] ease-linear z-10" style={{ transform }}><Vessel ship={ship} onClick={() => actions.openModal({ type: 'shipForm', ship })} displayMode="map" pixelsPerNm={pixelsPerNm} /></div>
        })}
      </div>

      <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex-1 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-2">Berths</h3>
            <ul className="space-y-1 overflow-y-auto text-sm">
                {berths.map(berth => {
                    const occupyingShip = allActiveShips.find(s => s.berthIds.includes(berth.id));
                    return <li key={berth.id} className="p-2 rounded bg-gray-700/50 cursor-pointer hover:bg-gray-700" onClick={() => actions.openModal({ type: 'berthDetail', berth })}><p className="font-semibold text-cyan-300">{berth.name}</p><p className={`text-xs ${occupyingShip ? 'text-green-400' : 'text-gray-400'}`}>{occupyingShip ? `Occupied: ${occupyingShip.name}` : 'Available'}</p></li>
                })}
            </ul>
        </div>
        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-2">Vessel Filter</h3>
            <div className="grid grid-cols-2 gap-2">
                 {FILTERABLE_STATUSES.map(status => (
                    <label key={status} className="flex items-center text-sm text-gray-300 cursor-pointer"><input type="checkbox" checked={statusFilters.has(status)} onChange={() => handleFilterChange(status)} className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded" /><span className="ml-2">{status}</span></label>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PortMap);
