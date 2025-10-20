import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet.heat';
// Import types from 'leaflet' to make them available for module augmentation.
// The type-only import was removed as it can cause issues with module augmentation.
// The types are available in the augmentation scope below.

// Module augmentation to add type definitions for the 'leaflet.heat' plugin,
// which extends the 'L' object with a 'heatLayer' function.
// This requires a value-import of 'leaflet' in the file scope, which is satisfied by `import * as L from 'leaflet'`.
declare module 'leaflet' {
    // FIX: Use L.LatLngExpression and L.Layer from the imported 'leaflet' namespace
    // to resolve type errors and potential module augmentation issues.
    function heatLayer(latlngs: (L.LatLngExpression | [number, number, number])[], options?: any): L.Layer;
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

        // The L.heatLayer function is now available at runtime and is recognized by TypeScript
        // thanks to the module augmentation above.
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