/**
 * Distance calculation utilities using Haversine formula
 */

// Earth's radius in meters
const EARTH_RADIUS_METERS = 6371000;

// Meters to miles conversion factor
const METERS_TO_MILES = 0.000621371;

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

/**
 * Convert meters to miles
 */
export const metersToMiles = (meters: number): number => {
  return meters * METERS_TO_MILES;
};

/**
 * Convert miles to meters
 */
export const milesToMeters = (miles: number): number => {
  return miles / METERS_TO_MILES;
};

/**
 * Calculate total distance from an array of points
 * Filters out unrealistic GPS jumps (>100 mph between points)
 */
export const calculateTotalDistance = (
  points: Array<{ latitude: number; longitude: number; timestamp: number }>
): number => {
  if (points.length < 2) return 0;

  const MAX_SPEED_MS = 44.7; // ~100 mph in m/s
  let totalDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const distance = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds

    // Skip if implied speed is unrealistic (GPS drift)
    if (timeDiff > 0) {
      const impliedSpeed = distance / timeDiff;
      if (impliedSpeed > MAX_SPEED_MS) {
        console.log('[Distance] Skipped unrealistic point, implied speed:', impliedSpeed, 'm/s');
        continue;
      }
    }

    totalDistance += distance;
  }

  return totalDistance;
};

/**
 * Calculate total miles from an array of points
 */
export const calculateTotalMiles = (
  points: Array<{ latitude: number; longitude: number; timestamp: number }>
): number => {
  return metersToMiles(calculateTotalDistance(points));
};
