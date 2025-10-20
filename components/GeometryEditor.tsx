import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import type { Port } from '../types';
import { destinationPoint, calculateDistanceMeters } from '../utils/geolocation';

// Fix for default marker icon path issue with module bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons for the different points
const createPointIcon = (color: string) => new L.DivIcon({
    html: `<div class="bg-${color}-500 border-2 border-white rounded-full w-4 h-4 cursor-grab ring-2 ring-${color}-500 shadow-lg"></div>`,
    className: '', iconSize: [16, 16], iconAnchor: [8, 8]
});
const startIcon = createPointIcon('green');
const endIcon = createPointIcon('red');
const centerIcon = createPointIcon('blue');
const vertexIcon = new L.DivIcon({
    html: `<div class="bg-cyan-500 border-2 border-white rounded-full w-3 h-3 cursor-move ring-2 ring-cyan-500 shadow-lg"></div>`,
    className: '', iconSize: [12, 12], iconAnchor: [6, 6]
});
const midpointIcon = new L.DivIcon({
    html: `<div class="bg-cyan-500 opacity-60 border border-white rounded-full w-2.5 h-2.5 cursor-move"></div>`,
    className: '', iconSize: [10, 10], iconAnchor: [5, 5]
});
const radiusIcon = new L.DivIcon({
    html: `<div class="bg-yellow-400 border-2 border-white rounded-full w-3 h-3 cursor-ew-resize"></div>`,
    className: '', iconSize: [12, 12], iconAnchor: [6, 6]
});
const portCenterIcon = new L.DivIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#3b82f6" viewBox="0 0 16 16" style="filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.5));">
        <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
    </svg>`,
    className: 'leaflet-port-center-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
});


interface EditorMapControllerProps {
    port: Port;
    geometry?: [number, number][];
    onPointSet?: (latlng: L.LatLng) => void;
    onPointChange?: (type: 'start' | 'end' | 'center', latlng: L.LatLng) => void;
    onRadiusChange?: (radius: number) => void;
    startPoint?: [number, number] | null;
    endPoint?: [number, number] | null;
    centerPoint?: [number, number] | null;
    radius?: number;
    onChange?: (newGeometry: [number, number][]) => void;
    portCenter?: [number, number];
    onPortCenterChange?: (latlng: L.LatLng) => void;
}

const EditorMapController: React.FC<EditorMapControllerProps> = (props) => {
    const { port, geometry, onPointSet, onPointChange, onRadiusChange, startPoint, endPoint, centerPoint, radius, onChange, portCenter, onPortCenterChange } = props;
    const map = useMap();
    const activeMidpointRef = useRef<number | null>(null);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        // A short delay ensures the map container, which is in a modal,
        // has rendered and has a size before the map is told to update.
        const timer = setTimeout(() => {
            map.invalidateSize();
            const hasValidCoords = port && (port.lat !== 0 || port.lon !== 0);
            
            if (hasValidCoords) {
                // If the geometry is being edited, fit the map to its bounds for a better view.
                if (geometry && geometry.length > 0) {
                    map.fitBounds(geometry);
                } else {
                    map.flyTo([port.lat, port.lon], 15);
                }
            } else {
                map.fitWorld(); // Fallback for new ports with no coordinates
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [port.id, port.lat, port.lon, geometry, map]);


    useMapEvents({
        click(e) {
            if (isDraggingRef.current) {
                return;
            }
            if (onPointSet) {
                onPointSet(e.latlng);
            } else if (onChange) {
                const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
                const currentGeometry = geometry || [];
                onChange([...currentGeometry, newPoint]);
            }
        },
        mousemove(e) {
            const container = map.getContainer();
            if (container) container.style.cursor = onPointSet || onChange ? 'crosshair' : 'grab';
        }
    });
    
    const radiusHandlePosition = useMemo(() => {
        if (centerPoint && radius) {
            return destinationPoint(centerPoint[0], centerPoint[1], radius, Math.PI / 2);
        }
        return null;
    }, [centerPoint, radius]);

    const midpoints = useMemo(() => {
        if (!geometry || geometry.length < 2 || !onChange) return [];
        const points = [];
        for (let i = 0; i < geometry.length; i++) {
            const p1 = geometry[i];
            const p2 = geometry[(i + 1) % geometry.length]; // Wrap around for last segment
            const midLatLng = L.latLng((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2);
            points.push({ latlng: midLatLng, insertIndex: i + 1 });
        }
        return points;
    }, [geometry, onChange]);

    return (
        <>
            {port.geometry && (
                <Polygon positions={port.geometry} pathOptions={{ color: '#06B6D4', dashArray: '5, 5', weight: 1.5, fillOpacity: 0.1, interactive: false }} />
            )}
            {geometry && <Polygon positions={geometry} pathOptions={{ color: '#10B981', weight: 2, fillOpacity: 0.3, interactive: true }} />}

            {/* Draggable marker for the main port center */}
            {portCenter && onPortCenterChange && (
                <Marker
                    position={portCenter}
                    icon={portCenterIcon}
                    draggable={true}
                    eventHandlers={{
                        dragstart: () => { isDraggingRef.current = true; },
                        drag: (e) => { onPortCenterChange(e.target.getLatLng()); },
                        dragend: () => { setTimeout(() => { isDraggingRef.current = false; }, 10); }
                    }}
                />
            )}
            
            {/* Draggable vertices for the main geometry */}
            {geometry && onChange && geometry.map((pos, index) => (
                <Marker
                    key={`poly-vertex-${index}`}
                    position={pos}
                    icon={vertexIcon}
                    draggable={true}
                    eventHandlers={{
                        dragstart: () => {
                            isDraggingRef.current = true;
                        },
                        drag(e) {
                            const newGeometry = [...geometry];
                            newGeometry[index] = [e.latlng.lat, e.latlng.lng];
                            onChange(newGeometry);
                        },
                        dragend: () => {
                            setTimeout(() => { isDraggingRef.current = false; }, 10);
                        },
                        contextmenu(e) { // Right click to delete a point
                            L.DomEvent.stopPropagation(e);
                            const newGeometry = geometry.filter((_, i) => i !== index);
                            onChange(newGeometry);
                        }
                    }}
                />
            ))}

             {/* Midpoint markers for adding new vertices */}
            {midpoints.map((mid, index) => (
                <Marker
                    key={`midpoint-${index}`}
                    position={mid.latlng}
                    icon={midpointIcon}
                    draggable={true}
                    eventHandlers={{
                        dragstart: () => {
                            isDraggingRef.current = true;
                            activeMidpointRef.current = mid.insertIndex;
                            const newPoint: [number, number] = [mid.latlng.lat, mid.latlng.lng];
                            const newGeometry = [...(geometry || [])];
                            newGeometry.splice(mid.insertIndex, 0, newPoint);
                            onChange(newGeometry);
                        },
                        drag: (e) => {
                            if (activeMidpointRef.current !== null && geometry) {
                                const newGeometry = [...geometry];
                                newGeometry[activeMidpointRef.current] = [e.latlng.lat, e.latlng.lng];
                                onChange(newGeometry);
                            }
                        },
                        dragend: () => {
                            activeMidpointRef.current = null;
                            setTimeout(() => { isDraggingRef.current = false; }, 10);
                        }
                    }}
                />
            ))}

            {/* Draggable markers for berth/quay points */}
            {startPoint && onPointChange && <Marker position={startPoint} icon={startIcon} draggable={true} eventHandlers={{ 
                dragstart: () => { isDraggingRef.current = true; },
                dragend: (e) => { 
                    onPointChange('start', e.target.getLatLng());
                    setTimeout(() => { isDraggingRef.current = false; }, 10);
                } 
            }} />}
            {endPoint && onPointChange && <Marker position={endPoint} icon={endIcon} draggable={true} eventHandlers={{
                dragstart: () => { isDraggingRef.current = true; },
                dragend: (e) => { 
                    onPointChange('end', e.target.getLatLng());
                    setTimeout(() => { isDraggingRef.current = false; }, 10);
                } 
            }} />}
            
            {/* Draggable markers for anchorage */}
            {centerPoint && onPointChange && <Marker position={centerPoint} icon={centerIcon} draggable={true} eventHandlers={{
                dragstart: () => { isDraggingRef.current = true; },
                dragend: (e) => { 
                    onPointChange('center', e.target.getLatLng());
                    setTimeout(() => { isDraggingRef.current = false; }, 10);
                }
            }} />}
            {radiusHandlePosition && onRadiusChange && (
                <Marker 
                    position={radiusHandlePosition} 
                    icon={radiusIcon} 
                    draggable={true} 
                    eventHandlers={{ 
                        dragstart: () => { isDraggingRef.current = true; },
                        drag: (e) => {
                            if (centerPoint) {
                                const newRadius = calculateDistanceMeters(centerPoint[0], centerPoint[1], e.target.getLatLng().lat, e.target.getLatLng().lng);
                                onRadiusChange(newRadius);
                            }
                        },
                        dragend: () => {
                            setTimeout(() => { isDraggingRef.current = false; }, 10);
                        }
                    }} 
                />
            )}
        </>
    );
};

interface GeometryEditorProps extends EditorMapControllerProps {}

const GeometryEditor: React.FC<GeometryEditorProps> = (props) => {
    return (
        <div className="w-full h-full relative text-white">
            <MapContainer
                center={[props.port.lat || 0, props.port.lon || 0]}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', backgroundColor: '#f0f0f0', borderRadius: '0.375rem' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <EditorMapController {...props} />
            </MapContainer>
        </div>
    );
};

// Add styles to disable default Leaflet icon styling and add a hover effect
const styleId = 'leaflet-custom-marker-style';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
    .leaflet-port-center-icon {
      background: transparent;
      border: none;
      cursor: move;
    }
    `;
    document.head.appendChild(style);
}

export default GeometryEditor;