import L from 'leaflet';

// Function to convert degrees to radians
export const toRad = (value: number): number => (value * Math.PI) / 180;
// Function to convert radians to degrees
export const toDeg = (radians: number): number => (radians * 180) / Math.PI;

/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns The distance in nautical miles.
 */
export const calculateDistanceNM = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    return distanceKm / 1.852; // Convert km to nautical miles
};

/**
 * Calculates the distance between two points in meters.
 */
export const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    return calculateDistanceNM(lat1, lon1, lat2, lon2) * 1852;
};

/**
 * Calculates the initial bearing from point 1 to point 2.
 * @returns The bearing in radians.
 */
export const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const radLat1 = toRad(lat1);
    const radLat2 = toRad(lat2);
    const dLon = toRad(lon2 - lon1);

    const y = Math.sin(dLon) * Math.cos(radLat2);
    const x = Math.cos(radLat1) * Math.sin(radLat2) - Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(dLon);
    return Math.atan2(y, x);
};

/**
 * Calculates the destination point given a starting point, distance, and bearing.
 * @param lat Latitude of the start point in degrees.
 * @param lon Longitude of the start point in degrees.
 * @param distanceMeters Distance to travel in meters.
 * @param bearingRadians Bearing in radians.
 * @returns A tuple [latitude, longitude] of the destination point in degrees.
 */
export const destinationPoint = (lat: number, lon: number, distanceMeters: number, bearingRadians: number): [number, number] => {
    const R = 6371e3; // Earth's radius in meters
    const latRad = toRad(lat);
    const lonRad = toRad(lon);

    const lat2 = Math.asin(Math.sin(latRad) * Math.cos(distanceMeters / R) + Math.cos(latRad) * Math.sin(distanceMeters / R) * Math.cos(bearingRadians));
    const lon2 = lonRad + Math.atan2(Math.sin(bearingRadians) * Math.sin(distanceMeters / R) * Math.cos(latRad), Math.cos(distanceMeters / R) - Math.sin(latRad) * Math.sin(lat2));

    return [toDeg(lat2), toDeg(lon2)];
};


/**
 * Creates a rectangle polygon from a start point, end point, and width.
 */
export const createRectangleFromLine = (start: [number, number], end: [number, number], widthMeters: number): [number, number][] => {
    const bearing = calculateBearing(start[0], start[1], end[0], end[1]);
    const bearingLeft = bearing - Math.PI / 2;
    const bearingRight = bearing + Math.PI / 2;

    const halfWidth = widthMeters / 2;

    const p1 = destinationPoint(start[0], start[1], halfWidth, bearingLeft);
    const p2 = destinationPoint(end[0], end[1], halfWidth, bearingLeft);
    const p3 = destinationPoint(end[0], end[1], halfWidth, bearingRight);
    const p4 = destinationPoint(start[0], start[1], halfWidth, bearingRight);

    return [p1, p2, p3, p4];
};

/**
 * Creates a circular polygon from a center point and radius.
 */
export const createCircle = (center: [number, number], radiusMeters: number, segments: number): [number, number][] => {
    const points: [number, number][] = [];
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        points.push(destinationPoint(center[0], center[1], radiusMeters, angle));
    }
    return points;
};
