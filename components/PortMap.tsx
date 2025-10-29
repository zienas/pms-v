import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, useMapEvents } from 'react-leaflet';
import type { Ship, Berth, Port } from '../types';
import { ShipStatus, InteractionEventType, UserRole } from '../types';
import { usePort } from '../context/PortContext';
import FlameIcon from './icons/FlameIcon';
import LeafletVesselMarker from './LeafletVesselMarker';
import PortCenterIcon from './icons/PortCenterIcon';
import SunIcon from './icons/SunIcon';
import SunsetIcon from './icons/SunsetIcon';
import MoonIcon from './icons/MoonIcon';
import Squares2x2Icon from './icons/Squares2x2Icon';
import { useLogger } from '../context/InteractionLoggerContext';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const FILTERABLE_STATUSES: ShipStatus[] = [ShipStatus.APPROACHING, ShipStatus.DOCKED, ShipStatus.ANCHORED, ShipStatus.DEPARTING];

const MapLoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 bg-gray-800/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-3 text-gray-300">Loading map data...</p>
        </div>
    </div>
);


const statusColors: Record<ShipStatus, string> = {
  [ShipStatus.APPROACHING]: 'bg-amber-500',
  [ShipStatus.DOCKED]: 'bg-emerald-500',
  [ShipStatus.DEPARTING]: 'bg-sky-500',
  [ShipStatus.ANCHORED]: 'bg-violet-500',
  [ShipStatus.LEFT_PORT]: 'bg-slate-500',
};

type MapTheme = 'day' | 'dusk' | 'night';

interface MapControllerProps {
  center: [number, number];
  zoom: number;
  theme: MapTheme;
  onThemeChange: (theme: MapTheme) => void;
  focusedVesselId: string | null;
  ships: Ship[];
}

// Helper component to control map view and add custom controls
const MapController: React.FC<MapControllerProps> = ({ center, zoom, theme, onThemeChange, focusedVesselId, ships }) => {
  const map = useMap();
  const { log } = useLogger();
  const { actions } = usePort();

  // This effect handles view changes when the port changes, and fixes tile rendering issues.
  useEffect(() => {
    // Only fly to the default center if we are not currently trying to focus on a specific vessel
    if (!focusedVesselId) {
        map.flyTo(center, zoom);
    }
    
    const timer = setTimeout(() => {
        map.invalidateSize();
    }, 400);

    return () => clearTimeout(timer);
  }, [center[0], center[1], zoom, map]);

  // Effect to handle focusing on a specific vessel from another view
  useEffect(() => {
    if (focusedVesselId) {
        const vesselToFocus = ships.find(s => s.id === focusedVesselId);
        if (vesselToFocus && vesselToFocus.lat && vesselToFocus.lon) {
            map.flyTo([vesselToFocus.lat, vesselToFocus.lon], 16, { animate: true, duration: 1 });
            actions.setFocusedVesselId(null); // Reset focus state
        } else if (vesselToFocus) {
            toast.error(`Vessel "${vesselToFocus.name}" has no position data to focus on.`);
            actions.setFocusedVesselId(null);
        } else {
            // Vessel not found (maybe stale state), just clear it
            actions.setFocusedVesselId(null);
        }
    }
  }, [focusedVesselId, ships, map, actions]);


  useMapEvents({
      zoomend: (e) => {
          log(InteractionEventType.MAP_INTERACTION, { action: 'Zoom', value: e.target.getZoom() });
      },
      dragend: () => {
          log(InteractionEventType.MAP_INTERACTION, { action: 'Pan' });
      }
  });


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
                    <a href="#" key={option.name} role="button" aria-label={option.title} title={option.title} onClick={(e) => { e.preventDefault(); onThemeChange(option.name); }} className={`flex items-center justify-center w-8 h-8 transition-colors border-t border-gray-700 ${isActive ? 'bg-cyan-600 text-white' : 'text-white hover:bg-gray-700/80'}`}>
                        <Icon className="w-5 h-5" />
                    </a>
                );
            })}
        </div>
    </div>
  );
}

interface PortMapProps {
    ships: Ship[];
    berths: Berth[];
    selectedPort: Port;
    isLoading: boolean;
}

const PortMap: React.FC<PortMapProps> = ({ ships, berths, selectedPort, isLoading }) => {
  const { actions, state } = usePort();
  const { focusedVesselId } = state;
  const { currentUser } = useAuth();
  const { log } = useLogger();
  const [statusFilters, setStatusFilters] = useState<Set<ShipStatus>>(new Set(FILTERABLE_STATUSES));
  
  const theme = selectedPort.mapTheme || 'day';
  const mapZoom = selectedPort.defaultZoom || 13;

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
  const isInteractive = currentUser?.role !== UserRole.AGENT;

  const handleFilterChange = (status: ShipStatus) => {
    setStatusFilters(prev => {
        const newFilters = new Set(prev);
        newFilters.has(status) ? newFilters.delete(status) : newFilters.add(status);
        return newFilters;
    });
  };
  
  const handleThemeChange = (newTheme: MapTheme) => {
    if (selectedPort) {
        toast.success(`Map theme set to ${newTheme}`);
        actions.updatePort(selectedPort.id, { ...selectedPort, mapTheme: newTheme });
    }
  };

  const handleBerthClick = (berth: Berth) => {
    log(InteractionEventType.MAP_INTERACTION, {
        action: 'Click Berth',
        targetId: berth.id,
        value: { name: berth.name, berthId: berth.id },
        message: `User clicked on berth polygon "${berth.name}" (ID: ${berth.id}) on the map.`
    });
    actions.openModal({ type: 'berthDetail', berth });
  };

  const mapCenter: [number, number] = [selectedPort.lat, selectedPort.lon];

  const mapContainerStyle: React.CSSProperties = {
    height: '100%',
    width: '100%',
    backgroundColor: theme === 'day' ? '#f0f0f0' : '#374151',
  };

  return (
    <div data-component="port-map" className="bg-gray-800 rounded-lg h-full flex flex-col md:flex-row gap-4 p-4">
      {/* Set z-index to 0 to create a new stacking context, ensuring modals appear on top */}
      <div className="flex-1 rounded-lg overflow-hidden relative border border-gray-700 min-h-[400px] md:min-h-0 z-0">
        {isLoading && <MapLoadingSpinner />}
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={mapContainerStyle}
        >
          <MapController 
            center={mapCenter} 
            zoom={mapZoom} 
            theme={theme} 
            onThemeChange={handleThemeChange} 
            focusedVesselId={focusedVesselId}
            ships={ships}
          />
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
                eventHandlers={isInteractive ? { click: () => handleBerthClick(berth) } : {}}
              />
            );
          })}

          {/* Vessel Markers */}
          {filteredShips.filter(s => s.lat && s.lon).map(ship => (
              <LeafletVesselMarker key={ship.id} ship={ship} isInteractive={isInteractive} />
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
                        <li key={berth.id} className={`p-2 rounded transition-colors ${isInteractive ? 'cursor-pointer' : ''} ${hasDangerousGoods ? 'bg-red-900/40 hover:bg-red-900/60' : 'bg-gray-700/50 hover:bg-gray-700'}`} onClick={() => isInteractive && actions.openModal({ type: 'berthDetail', berth })}>
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
                    <label key={status} className="flex items-center text-sm text-gray-300 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={statusFilters.has(status)} 
                            onChange={() => handleFilterChange(status)} 
                            className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-offset-gray-900 focus:ring-cyan-500"
                        />
                        <span className={`w-3 h-3 rounded-full ml-2 ${statusColors[status]}`}></span>
                        <span className="ml-1.5">{status}</span>
                    </label>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PortMap);