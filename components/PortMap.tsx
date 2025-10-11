
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Ship, Berth, Port } from '../types';
import { ShipStatus } from '../types';
import Vessel from './Vessel';
import PortCenterIcon from './icons/PortCenterIcon';
import ZoomInIcon from './icons/ZoomInIcon';
import ZoomOutIcon from './icons/ZoomOutIcon';
import FilterIcon from './icons/FilterIcon';

const FILTERABLE_STATUSES: ShipStatus[] = [
    ShipStatus.APPROACHING,
    ShipStatus.DOCKED,
    ShipStatus.ANCHORED,
    ShipStatus.DEPARTING,
];

interface PortMapProps {
  ships: Ship[];
  berths: Berth[];
  onSelectShip: (ship: Ship) => void;
  onSelectBerth: (berth: Berth) => void;
  selectedPort: Port;
}

const PortMap: React.FC<PortMapProps> = ({ ships, berths, onSelectShip, onSelectBerth, selectedPort }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<ShipStatus>>(
      new Set(FILTERABLE_STATUSES)
  );

  // All ships that are currently active in the port, used for state calculations (e.g., berth occupancy).
  const allActiveShips = useMemo(() => {
    return ships.filter(s => s.status !== ShipStatus.LEFT_PORT);
  }, [ships]);

  // Ships that are visible on the map after applying filters.
  const filteredActiveShips = useMemo(() => {
    return allActiveShips.filter(s => statusFilters.has(s.status));
  }, [allActiveShips, statusFilters]);

  const locatedShips = filteredActiveShips.filter(s => s.lat !== undefined && s.lon !== undefined);
  const dockedShips = locatedShips.filter(s => s.status === ShipStatus.DOCKED && s.berthIds.length > 0);
  const movingShips = locatedShips.filter(s => s.status !== ShipStatus.DOCKED || s.berthIds.length === 0);
  const unlocatedShips = filteredActiveShips.filter(s => s.lat === undefined || s.lon === undefined);
  
  const berthMap = useMemo(() => new Map(berths.map(b => [b.id, b])), [berths]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (container) {
        const updateSize = () => {
            setMapSize({ width: container.clientWidth, height: container.clientHeight });
        };
        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }
  }, []);

  // Click outside handler to close the filter popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
            setIsFilterOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.2));
  
  const handleFilterChange = (status: ShipStatus) => {
    setStatusFilters(prev => {
        const newFilters = new Set(prev);
        if (newFilters.has(status)) {
            newFilters.delete(status);
        } else {
            newFilters.add(status);
        }
        return newFilters;
    });
  };

  const selectAllFilters = () => setStatusFilters(new Set(FILTERABLE_STATUSES));
  const deselectAllFilters = () => setStatusFilters(new Set());


  // --- Dynamic Map Scaling & Projection Logic ---
  // Define the radius of the map view in nautical miles. This determines the default zoom level.
  // Set to 3.0 to ensure the entire port geometry is visible by default.
  const VIEW_RADIUS_NM = 3.0;

  // Determine the scale based on the smaller dimension of the map container.
  const effectiveMapSize = Math.min(mapSize.width, mapSize.height);

  // Calculate the base number of pixels that represent one nautical mile.
  const basePixelsPerNm = (effectiveMapSize > 0) ? (effectiveMapSize / 2) / VIEW_RADIUS_NM : 0;

  // Apply the user-controlled zoom level to the base scale.
  const pixelsPerNm = basePixelsPerNm * zoomLevel;
  
  // The proximity circle is always 2 NM.
  const proximityRadiusPx = 2 * pixelsPerNm;

  // --- Geographic Projection Constants ---
  const NM_PER_DEG_LAT = 60.0;
  const portLatRad = selectedPort.lat * (Math.PI / 180);
  // The distance for a degree of longitude shrinks with latitude (Mercator projection adjustment).
  const NM_PER_DEG_LON = NM_PER_DEG_LAT * Math.cos(portLatRad);

  // --- Final Conversion Factors ---
  // These factors convert a change in degrees (lat/lon) directly to a change in pixels on the screen.
  const pixelsPerDegLat = NM_PER_DEG_LAT * pixelsPerNm;
  const pixelsPerDegLon = NM_PER_DEG_LON * pixelsPerNm;


  const getBerthAngle = (berth: Berth): number => {
    if (!berth.geometry || berth.geometry.length < 2) return 0;
    const [p1_lat, p1_lon] = berth.geometry[0];
    const [p2_lat, p2_lon] = berth.geometry[berth.geometry.length -1]; // Use last point for longer berths
    
    const deltaY = -(p2_lat - p1_lat);
    const deltaX = (p2_lon - p1_lon);
    
    const angleRad = Math.atan2(deltaY * pixelsPerDegLat, deltaX * pixelsPerDegLon);
    return angleRad * (180 / Math.PI);
  };

  const getBerthCenter = (berth: Berth): [number, number] | null => {
    if (!berth.geometry || berth.geometry.length === 0) return null;
    let avgLat = 0, avgLon = 0;
    berth.geometry.forEach(([lat, lon]) => {
        avgLat += lat;
        avgLon += lon;
    });
    return [avgLat / berth.geometry.length, avgLon / berth.geometry.length];
  }

  const backgroundStyle: React.CSSProperties = selectedPort.mapImage
    ? { backgroundImage: `url(${selectedPort.mapImage})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: 0.6 }
    : { backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwIEwxMCAwIE0wIDYwIEw2MCAwIE00MCAxMDAgTDEwMCA0MCBNOTAIDEwMCBMMTAwIDkwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+")', opacity: 0.1 };


  return (
    <div className="bg-gray-800 rounded-lg h-full flex flex-col md:flex-row gap-4 p-4">
      {/* Map Area */}
      <div ref={mapContainerRef} className="flex-1 bg-gray-900/50 rounded-lg overflow-hidden relative border border-gray-700 min-h-[400px] md:min-h-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cover bg-center"
          style={backgroundStyle}
        ></div>
        
        {/* Port Name & Filter Display */}
        <div className="absolute top-4 left-4 flex items-start gap-3 z-20">
            <div className="bg-gray-900/70 px-3 py-2 rounded-lg shadow-lg">
                <h2 className="text-lg font-bold text-white tracking-wider">{selectedPort.name}</h2>
                <p className="text-xs text-cyan-300">Port Operations Map</p>
            </div>
            <div className="relative" ref={filterRef}>
                 <button 
                    onClick={() => setIsFilterOpen(prev => !prev)}
                    className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 shadow-lg transition-colors" 
                    aria-label="Filter vessels"
                 >
                    <FilterIcon className="w-5 h-5" />
                </button>
                {isFilterOpen && (
                     <div className="absolute top-full mt-2 w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3">
                        <h4 className="font-bold text-sm mb-2">Filter by Status</h4>
                        <div className="space-y-2">
                             {FILTERABLE_STATUSES.map(status => (
                                <label key={status} className="flex items-center text-sm text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={statusFilters.has(status)}
                                        onChange={() => handleFilterChange(status)}
                                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                                    />
                                    <span className="ml-2">{status}</span>
                                </label>
                            ))}
                        </div>
                        <div className="border-t border-gray-600 mt-3 pt-2 flex justify-between">
                            <button onClick={selectAllFilters} className="text-xs text-cyan-400 hover:underline">All</button>
                            <button onClick={deselectAllFilters} className="text-xs text-cyan-400 hover:underline">None</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
          <button onClick={handleZoomIn} className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 shadow-lg transition-colors" aria-label="Zoom in">
            <ZoomInIcon className="w-5 h-5" />
          </button>
          <button onClick={handleZoomOut} className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 shadow-lg transition-colors" aria-label="Zoom out">
            <ZoomOutIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Proximity Circle */}
        <div
          className="absolute top-1/2 left-1/2 border-2 border-dashed border-yellow-500/50 rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${proximityRadiusPx * 2}px`,
            height: `${proximityRadiusPx * 2}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 px-2 text-xs text-yellow-400">2 NM</span>
        </div>
        
         {/* Geometry Layers */}
        {mapSize.width > 0 && (
            <svg className="absolute top-0 left-0 w-full h-full" style={{ transformOrigin: 'center center', zIndex: 5 }}>
                 {/* Port Boundary */}
                 {selectedPort.geometry && (
                    <g transform={`translate(${mapSize.width / 2}, ${mapSize.height / 2})`}>
                        <polygon
                            points={selectedPort.geometry.map(([lat, lon]) => {
                                const pointX = (lon - selectedPort.lon) * pixelsPerDegLon;
                                const pointY = -(lat - selectedPort.lat) * pixelsPerDegLat;
                                return `${pointX},${pointY}`;
                            }).join(' ')}
                            className="fill-cyan-500/10 stroke-cyan-300"
                            strokeWidth="1.5"
                            strokeDasharray="8,8"
                            style={{ vectorEffect: 'non-scaling-stroke' }}
                        >
                            <title>{selectedPort.name} Boundary</title>
                        </polygon>
                    </g>
                )}
                 {/* Berth Polygons */}
                 <g transform={`translate(${mapSize.width / 2}, ${mapSize.height / 2})`}>
                    {berths.map(berth => {
                        if (!berth.geometry) return null;

                        const points = berth.geometry.map(([lat, lon]) => {
                            const pointX = (lon - selectedPort.lon) * pixelsPerDegLon;
                            const pointY = -(lat - selectedPort.lat) * pixelsPerDegLat;
                            return `${pointX},${pointY}`;
                        }).join(' ');

                        const occupyingShip = allActiveShips.find(s => s.berthIds.includes(berth.id));
                        const isOccupied = !!occupyingShip;

                        return (
                            <polygon
                                key={berth.id}
                                points={points}
                                onClick={() => onSelectBerth(berth)}
                                className={`transition-colors duration-300 cursor-pointer ${isOccupied ? 'fill-emerald-500/30 stroke-emerald-400 hover:fill-emerald-500/50' : 'fill-cyan-500/30 stroke-cyan-400 hover:fill-cyan-500/50'}`}
                                strokeWidth="1.5"
                                style={{ vectorEffect: 'non-scaling-stroke' }}
                            >
                                <title>
                                    {berth.name}{isOccupied ? ` - Occupied by ${occupyingShip.name}` : ' - Available'}
                                </title>
                            </polygon>
                        );
                    })}
                </g>
            </svg>
        )}

        {/* Port Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" title={`${selectedPort.name} (Center)`}>
          <PortCenterIcon className="w-8 h-8 text-cyan-400" />
        </div>

        {/* Moving Ships */}
        {movingShips.map(ship => {
          if (ship.lat === undefined || ship.lon === undefined) return null;
          
          const delta_lat_px = (ship.lat - selectedPort.lat) * pixelsPerDegLat;
          const delta_lon_px = (ship.lon - selectedPort.lon) * pixelsPerDegLon;

          return (
            <div
              key={ship.id}
              className="absolute top-1/2 left-1/2 transition-all duration-[3000ms] ease-linear z-10"
              style={{
                transform: `translate(calc(-50% + ${delta_lon_px}px), calc(-50% - ${delta_lat_px}px))`
              }}
            >
              <Vessel ship={ship} onClick={() => onSelectShip(ship)} displayMode="map" />
            </div>
          );
        })}
        
         {/* Docked Ships */}
        {dockedShips.map(ship => {
          const primaryBerth = berthMap.get(ship.berthIds[0]);
          if (!primaryBerth) return null;
          
          const berthCenter = getBerthCenter(primaryBerth);
          if (!berthCenter) return null;
          
          const berthAngle = getBerthAngle(primaryBerth);
          const [centerLat, centerLon] = berthCenter;

          const delta_lat_px = (centerLat - selectedPort.lat) * pixelsPerDegLat;
          const delta_lon_px = (centerLon - selectedPort.lon) * pixelsPerDegLon;
          
          // Offset the ship slightly perpendicular to the berth so it's not overlapping
          const offsetAngleRad = (berthAngle + 90) * (Math.PI / 180);
          const offsetPx = 15 * zoomLevel; // Make offset scale with zoom
          const offsetX = Math.cos(offsetAngleRad) * offsetPx;
          const offsetY = Math.sin(offsetAngleRad) * offsetPx;

          return (
             <div
              key={ship.id}
              className="absolute top-1/2 left-1/2 transition-all duration-300 ease-out z-10"
              style={{
                transform: `translate(calc(-50% + ${delta_lon_px + offsetX}px), calc(-50% - ${delta_lat_px - offsetY}px)) rotate(${berthAngle}deg)`
              }}
            >
              <Vessel ship={ship} onClick={() => onSelectShip(ship)} displayMode="map" pixelsPerNm={pixelsPerNm} />
            </div>
          );
        })}
      </div>

      {/* Side Panel for Berths & Unlocated Ships */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex-1 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-2">Berths</h3>
            <ul className="space-y-1 overflow-y-auto text-sm">
                {berths.map(berth => {
                    const occupyingShip = allActiveShips.find(s => s.berthIds.includes(berth.id));
                    return (
                        <li 
                            key={berth.id} 
                            className="p-2 rounded bg-gray-700/50 cursor-pointer hover:bg-gray-700"
                            onClick={() => onSelectBerth(berth)}
                        >
                            <p className="font-semibold text-cyan-300">{berth.name}</p>
                            <p className={`text-xs ${occupyingShip ? 'text-green-400' : 'text-gray-400'}`}>
                                {occupyingShip ? `Occupied: ${occupyingShip.name}` : 'Available'}
                            </p>
                        </li>
                    )
                })}
            </ul>
        </div>
        {unlocatedShips.length > 0 && (
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2">Unlocated Vessels</h3>
                <ul className="space-y-2 overflow-y-auto">
                    {unlocatedShips.map(ship => (
                        <li key={ship.id}>
                            <Vessel ship={ship} onClick={() => onSelectShip(ship)} displayMode="list" />
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};

export default PortMap;