// FIX: Added 'React' to imports to solve "Cannot find namespace 'React'" error.
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
// FIX: Switched to a namespace import for Leaflet. This is a more robust pattern for using plugins
// that augment the main Leaflet object (like leaflet.heat) and resolves module augmentation issues in TypeScript.
import * as L from 'leaflet';
import 'leaflet.heat';

// FIX: Replaced the `declare global` block with the standard `declare module 'leaflet'` for module augmentation.
// This is the correct way to extend a module and allows TypeScript to find Leaflet-native types like
// `LatLngExpression` and `Layer` within the module's context, resolving the type errors.
declare module 'leaflet' {
    function heatLayer(latlngs: (LatLngExpression | [number, number, number])[], options?: any): Layer;
}

interface HeatmapLayerProps {
    points: [number, number, number][];
}

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ points }) => {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) {
            return;
        }

        // The L.heatLayer function is now available at runtime and is recognized by TypeScript.
        // The incorrect type assertion has been removed as the new type signature handles it.
        const heatLayer = L.heatLayer(points, {
            radius: 25,
            blur: 20,
            maxZoom: 18,
            gradient: { 0.4: '#1d4ed8', 0.6: '#22c55e', 0.8: '#facc15', 1: '#ef4444' } // blue, green, yellow, red
        }).addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, points]);

    return null;
};

export default HeatmapLayer;
