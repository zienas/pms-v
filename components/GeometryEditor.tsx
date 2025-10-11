
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Port } from '../types';
import ZoomInIcon from './icons/ZoomInIcon';
import ZoomOutIcon from './icons/ZoomOutIcon';

interface GeometryEditorProps {
    port: Port; // The port context for centering and showing boundaries
    geometry?: [number, number][];
    onChange: (geometry: [number, number][]) => void;
}

const GeometryEditor: React.FC<GeometryEditorProps> = ({ port, geometry = [], onChange }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isDrawing, setIsDrawing] = useState(false);
    const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (svg) {
            const updateSize = () => setMapSize({ width: svg.clientWidth, height: svg.clientHeight });
            updateSize();
            const resizeObserver = new ResizeObserver(updateSize);
            resizeObserver.observe(svg);
            return () => resizeObserver.disconnect();
        }
    }, []);

    const { pixelsPerDegLat, pixelsPerDegLon } = useMemo(() => {
        const MAP_VIEW_RADIUS_NM = 1;
        const effectiveMapSize = Math.min(mapSize.width, mapSize.height);
        const effectivePixelsPerNm = ((effectiveMapSize / 2) / MAP_VIEW_RADIUS_NM) * zoomLevel;
        const NM_PER_DEG_LAT = 60.0;
        const portLatRad = (port.lat || 0) * (Math.PI / 180);
        const NM_PER_DEG_LON = NM_PER_DEG_LAT * Math.cos(portLatRad);
        return {
            pixelsPerDegLat: NM_PER_DEG_LAT * effectivePixelsPerNm,
            pixelsPerDegLon: NM_PER_DEG_LON * effectivePixelsPerNm,
        };
    }, [mapSize, zoomLevel, port.lat]);

    const geoToScreen = useCallback((lat: number, lon: number): [number, number] => {
        const x = (lon - port.lon) * pixelsPerDegLon + mapSize.width / 2;
        const y = -(lat - port.lat) * pixelsPerDegLat + mapSize.height / 2;
        return [x, y];
    }, [port.lat, port.lon, pixelsPerDegLat, pixelsPerDegLon, mapSize]);

    const screenToGeo = useCallback((x: number, y: number): [number, number] => {
        const lon = (x - mapSize.width / 2) / pixelsPerDegLon + port.lon;
        const lat = -(y - mapSize.height / 2) / pixelsPerDegLat + port.lat;
        return [lat, lon];
    }, [port.lat, port.lon, pixelsPerDegLat, pixelsPerDegLon, mapSize]);

    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDrawing || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const [lat, lon] = screenToGeo(e.clientX - rect.left, e.clientY - rect.top);
        onChange([...geometry, [lat, lon]]);
    };

    const handleVertexMouseDown = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (isDrawing) return;
        setDraggingVertexIndex(index);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (draggingVertexIndex === null || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const [lat, lon] = screenToGeo(e.clientX - rect.left, e.clientY - rect.top);
        const newGeometry = [...geometry];
        newGeometry[draggingVertexIndex] = [lat, lon];
        onChange(newGeometry);
    }, [draggingVertexIndex, geometry, onChange, screenToGeo]);

    const handleMouseUp = useCallback(() => {
        setDraggingVertexIndex(null);
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const pointsString = geometry.map(p => geoToScreen(p[0], p[1]).join(',')).join(' ');

    return (
        <div className="w-full h-full relative text-white">
            <svg ref={svgRef} className="w-full h-full bg-gray-900 rounded-md" onClick={handleSvgClick}>
                {/* Port Boundary for context */}
                {port.geometry && (
                    <polygon
                        points={port.geometry.map(p => geoToScreen(p[0], p[1]).join(',')).join(' ')}
                        className="fill-cyan-500/10 stroke-cyan-400"
                        strokeDasharray="4,4"
                        strokeWidth={1}
                    />
                )}
                {/* Current Geometry */}
                <polygon points={pointsString} className="fill-green-500/30 stroke-green-400" strokeWidth={1.5} />
                {/* Lines connecting vertices */}
                <polyline points={pointsString} fill="none" className="stroke-green-300" strokeWidth={1.5} />
                
                {/* Vertices */}
                {!isDrawing && geometry.map((point, index) => {
                    const [x, y] = geoToScreen(point[0], point[1]);
                    return (
                        <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="5"
                            className="fill-white stroke-green-400 cursor-move"
                            strokeWidth="1.5"
                            onMouseDown={(e) => handleVertexMouseDown(e, index)}
                        />
                    );
                })}
            </svg>
            <div className="absolute top-2 left-2 flex gap-2">
                 <button type="button" onClick={() => setIsDrawing(prev => !prev)} className={`px-3 py-1 text-xs rounded-md ${isDrawing ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                    {isDrawing ? 'Finish Drawing' : 'Start Drawing'}
                </button>
                 <button type="button" onClick={() => onChange([])} className="px-3 py-1 text-xs rounded-md bg-gray-600 hover:bg-gray-700">
                    Clear
                </button>
            </div>
            <div className="absolute bottom-2 right-2 flex flex-col gap-2">
                <button type="button" onClick={() => setZoomLevel(z => z * 1.2)} className="p-1.5 bg-gray-700 rounded-full hover:bg-gray-600"><ZoomInIcon className="w-4 h-4" /></button>
                <button type="button" onClick={() => setZoomLevel(z => z / 1.2)} className="p-1.5 bg-gray-700 rounded-full hover:bg-gray-600"><ZoomOutIcon className="w-4 h-4" /></button>
            </div>
        </div>
    );
};

export default GeometryEditor;