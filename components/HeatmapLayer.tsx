import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet.heat';
import type { LatLngExpression, Layer } from 'leaflet';

// Module augmentation to add type definitions for the 'leaflet.heat' plugin.
// Using `declare global` is the consistent pattern in this project for augmenting leaflet types.
declare global {
    namespace L {
        function heatLayer(latlngs: (LatLngExpression | [number, number, number])[], options?: any): Layer;
    }
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
