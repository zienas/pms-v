import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import type { Ship, Berth, Port } from '../types';
import { ShipStatus } from '../types';
import { usePort } from '../context/PortContext';
import FlameIcon from './icons/FlameIcon';
import LeafletVesselMarker from './LeafletVesselMarker';
import PortCenterIcon from './icons/PortCenterIcon';
import SunIcon from './icons/SunIcon';
import SunsetIcon from './icons/SunsetIcon';
import MoonIcon from './icons/MoonIcon';
import Squares2x2Icon from './icons/Squares2x2Icon';

const FILTERABLE_STATUSES: ShipStatus[] = [ShipStatus.APPROACHING, ShipStatus.DOCKED, ShipStatus.ANCHORED, ShipStatus.DEPARTING];

type MapTheme = 'day' | 'dusk' | 'night';

interface MapControllerProps {
  center: [number, number];
  zoom: number;
  theme: MapTheme;
  setTheme: (theme: MapTheme) => void;
}

// Helper component to control map view and add custom controls
const MapController: React.FC<MapControllerProps> = ({ center, zoom, theme, setTheme }) => {
  const map = useMap();

  // This effect handles view changes when the port changes, and fixes tile rendering issues.
  useEffect(() => {
    map.flyTo(center, zoom);
    
    // A small timeout allows the DOM to update before Leaflet recalculates the size,
    // especially important after a smooth `flyTo` animation.
    const timer = setTimeout(() => {
        map.invalidateSize();
    }, 400);

    return () => clearTimeout(timer);
    // FIX: Depend on primitive lat/lon values, not the array reference.
  }, [center[0], center[1], zoom, map]);

  const resetView = () => {
    map.flyTo(center, zoom);
  };

  const themeOptions: { name: MapTheme; icon: React.ElementType; title: string }[] = [
    { name: 'day', icon: SunIcon, title: 'Day Mode' },
    { name: 'dusk', icon: SunsetIcon, title: 'Dusk Mode' },
    { name: 'night', icon: MoonIcon, title: 'Night Mode' },
  ];

  return (
    <div className="leaflet-top leaflet-right p-2">
        <div className="leaflet-control leaflet-bar bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-md shadow-lg overflow-hidden">
            {/* Reset View Button */}
            <a href="#" role="button" aria-label="Reset View" title="Reset View" onClick={(e) => { e.preventDefault(); resetView(); }} className="flex items-center justify-center w-8 h-8 text-white hover:bg-gray-700/80 transition-colors">
                <PortCenterIcon className="w-5 h-5" />
            </a>

            {/* Theme Buttons */}
            {themeOptions.map(option => {
                const Icon = option.icon;
                const isActive = theme === option.name;
                return (
                    <a href="#" key={option.name} role="button" aria-label={option.title} title={option.title} onClick={(e) => { e.preventDefault(); setTheme(option.name); }} className={`flex items-center justify-center w-8 h-8 transition-colors border-t border-gray-700 ${isActive ? 'bg-cyan-600 text-white' : 'text-white hover:bg-gray-700/80'}`}>
                        <Icon className="w-5 h-5" />
                    </a>
                );
            })}
        </div>
    </div>
  );
}

// FIX: Define PortMapProps interface
interface PortMapProps {
    ships: Ship[];
    berths: Berth[];
    selectedPort: Port;
}

const PortMap: React.FC<PortMapProps> = ({ ships, berths, selectedPort }) => {
  const { actions } = usePort();
  const [statusFilters, setStatusFilters] = useState<Set<ShipStatus>>(new Set(FILTERABLE_STATUSES));
  const [theme, setTheme] = useState<MapTheme>('day');

  const themes = {
    night: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    dusk: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    day: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  };

  const allActiveShips = useMemo(() => ships.filter(s => s.status !== ShipStatus.LEFT_PORT), [ships]);
  const filteredShips = useMemo(() => allActiveShips.filter(s => statusFilters.has(s.status)), [allActiveShips, statusFilters]);

  const handleFilterChange = (status: ShipStatus) => {
    setStatusFilters(prev => {
        const newFilters = new Set(prev);
        newFilters.has(status) ? newFilters.delete(status) : newFilters.add(status);
        return newFilters;
    });
  };
  
  const mapCenter: [number, number] = [selectedPort.lat, selectedPort.lon];
  const mapZoom = 13;

  const mapContainerStyle: React.CSSProperties = {
    height: '100%',
    width: '100%',
    backgroundColor: theme === 'day' ? '#f0f0f0' : '#374151',
  };

  return (
    <div className="bg-gray-800 rounded-lg h-full flex flex-col md:flex-row gap-4 p-4">
      {/* Set z-index to 0 to create a new stacking context, ensuring modals appear on top */}
      <div className="flex-1 rounded-lg overflow-hidden relative border border-gray-700 min-h-[400px] md:min-h-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={mapContainerStyle}
        >
          <MapController center={mapCenter} zoom={mapZoom} theme={theme} setTheme={setTheme} />
          <TileLayer
            key={theme}
            attribution={themes[theme].attribution}
            url={themes[theme].url}
          />
          
          {/* Port Boundary */}
          {selectedPort.geometry && (
            <Polygon
              positions={selectedPort.geometry}
              pathOptions={{ color: '#22D3EE', weight: 1.5, opacity: 0.8, fillColor: '#06B6D4', fillOpacity: 0.1 }}
            />
          )}
          
          {/* Berth Polygons */}
          {berths.map(berth => {
            if (!berth.geometry) return null;
            const occupyingShip = allActiveShips.find(s => s.berthIds.includes(berth.id));
            let pathOptions = { color: '#06B6D4', weight: 1.5, opacity: 0.8, fillColor: '#06B6D4', fillOpacity: 0.3 }; // Available
            if (occupyingShip) {
                if (occupyingShip.hasDangerousGoods) {
                    pathOptions = { color: '#F87171', weight: 1.5, opacity: 0.8, fillColor: '#EF4444', fillOpacity: 0.4 }; // Occupied with DG
                } else {
                    pathOptions = { color: '#34D399', weight: 1.5, opacity: 0.8, fillColor: '#10B981', fillOpacity: 0.3 }; // Occupied
                }
            }
            return (
              <Polygon
                key={berth.id}
                positions={berth.geometry}
                pathOptions={pathOptions}
                eventHandlers={{ click: () => actions.openModal({ type: 'berthDetail', berth }) }}
              />
            );
          })}

          {/* Vessel Markers */}
          {filteredShips.filter(s => s.lat && s.lon).map(ship => (
              <LeafletVesselMarker key={ship.id} ship={ship} />
          ))}

        </MapContainer>
      </div>

      <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex-1 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-2">Berths</h3>
            <ul className="space-y-1 overflow-y-auto text-sm">
                {berths.map(berth => {
                    const occupyingShip = allActiveShips.find(s => s.berthIds.includes(berth.id));
                    const hasDangerousGoods = occupyingShip?.hasDangerousGoods;
                    return (
                        <li key={berth.id} className={`p-2 rounded cursor-pointer transition-colors ${hasDangerousGoods ? 'bg-red-900/40 hover:bg-red-900/60' : 'bg-gray-700/50 hover:bg-gray-700'}`} onClick={() => actions.openModal({ type: 'berthDetail', berth })}>
                            <p className="font-semibold text-cyan-300">{berth.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                {hasDangerousGoods && <FlameIcon className="w-3 h-3 text-red-400 flex-shrink-0" title="Carrying Dangerous Goods" />}
                                <p className={`text-xs ${occupyingShip ? (hasDangerousGoods ? 'text-red-300' : 'text-green-400') : 'text-gray-400'}`}>
                                    {occupyingShip ? `Occupied: ${occupyingShip.name}` : 'Available'}
                                </p>
                            </div>
                        </li>
                    );
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