import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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
const radiusIcon = new L.DivIcon({
    html: `<div class="bg-yellow-400 border-2 border-white rounded-full w-3 h-3 cursor-ew-resize"></div>`,
    className: '', iconSize: [12, 12], iconAnchor: [6, 6]
});


interface EditorMapControllerProps {
    port: Port;
    geometry?: [number, number][];
    onPointSet: (latlng: L.LatLng) => void;
    onPointChange: (type: 'start' | 'end' | 'center', latlng: L.LatLng) => void;
    onRadiusChange: (radius: number) => void;
    startPoint: [number, number] | null;
    endPoint: [number, number] | null;
    centerPoint: [number, number] | null;
    radius?: number;
}

const EditorMapController: React.FC<EditorMapControllerProps> = (props) => {
    const { port, geometry, onPointSet, onPointChange, onRadiusChange, startPoint, endPoint, centerPoint, radius } = props;
    const map = useMap();

    useEffect(() => {
        if (port && (port.lat !== 0 || port.lon !== 0)) {
            map.flyTo([port.lat, port.lon], 15);
        }
    }, [port.id, map]);

    useMapEvents({
        click(e) { onPointSet(e.latlng); },
        mousemove(e) {
            const container = map.getContainer();
            if (container) container.style.cursor = 'crosshair';
        }
    });
    
    const radiusHandlePosition = useMemo(() => {
        if (centerPoint && radius) {
            // Place handle to the east (bearing 90 degrees)
            return destinationPoint(centerPoint[0], centerPoint[1], radius, Math.PI / 2);
        }
        return null;
    }, [centerPoint, radius]);

    return (
        <>
            {port.geometry && (
                <Polygon positions={port.geometry} pathOptions={{ color: '#06B6D4', dashArray: '5, 5', weight: 1.5, fillOpacity: 0.1, interactive: false }} />
            )}
            {geometry && <Polygon positions={geometry} pathOptions={{ color: '#10B981', weight: 2, fillOpacity: 0.3, interactive: false }} />}

            {/* Draggable markers for berth/quay points */}
            {startPoint && <Marker position={startPoint} icon={startIcon} draggable={true} eventHandlers={{ dragend: (e) => onPointChange('start', e.target.getLatLng()) }} />}
            {endPoint && <Marker position={endPoint} icon={endIcon} draggable={true} eventHandlers={{ dragend: (e) => onPointChange('end', e.target.getLatLng()) }} />}
            
            {/* Draggable markers for anchorage */}
            {centerPoint && <Marker position={centerPoint} icon={centerIcon} draggable={true} eventHandlers={{ dragend: (e) => onPointChange('center', e.target.getLatLng()) }} />}
            {radiusHandlePosition && (
                <Marker 
                    position={radiusHandlePosition} 
                    icon={radiusIcon} 
                    draggable={true} 
                    eventHandlers={{ 
                        drag: (e) => {
                            const newRadius = calculateDistanceMeters(centerPoint![0], centerPoint![1], e.target.getLatLng().lat, e.target.getLatLng().lng);
                            onRadiusChange(newRadius);
                        }
                    }} 
                />
            )}
        </>
    );
};

interface GeometryEditorProps extends EditorMapControllerProps {
    // Inherits all props from controller
}

const GeometryEditor: React.FC<GeometryEditorProps> = (props) => {
    return (
        <div className="w-full h-full relative text-white">
            <MapContainer
                center={[props.port.lat || 0, props.port.lon || 0]}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', backgroundColor: '#374151', borderRadius: '0.375rem' }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <EditorMapController {...props} />
            </MapContainer>
        </div>
    );
};

export default GeometryEditor;
