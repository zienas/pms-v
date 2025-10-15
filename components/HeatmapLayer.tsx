import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
// FIX: Switched to a namespace import for Leaflet. This is a more robust pattern for using plugins
// that augment the main Leaflet object (like leaflet.heat) and resolves module augmentation issues in TypeScript.
import * as L from 'leaflet';
import 'leaflet.heat';

// FIX: Replaced `declare module` with `declare global` to augment the L namespace directly.
// This is a more robust pattern for legacy Leaflet plugins that modify the L object, resolving the "module cannot be found" error during augmentation.
declare global {
  namespace L {
    function heatLayer(latlngs: L.LatLngExpression[], options?: any): L.Layer;
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

        // The L.heatLayer function is now available at runtime and is recognized by TypeScript.
        const heatLayer = L.heatLayer(points as L.LatLngExpression[], {
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
