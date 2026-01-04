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

/**
 * Google Polyline Encoding Algorithm
 * Encodes a series of coordinates into an ASCII string for efficient storage
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

/**
 * Encode a single coordinate value (lat or lng)
 * @param value The coordinate value (already delta-encoded from previous point)
 * @returns Encoded string
 */
const encodeValue = (value: number): string => {
  // Round to 5 decimal places and convert to integer
  let intValue = Math.round(value * 1e5);

  // Left-shift by 1 bit
  intValue = intValue << 1;

  // If negative, invert
  if (intValue < 0) {
    intValue = ~intValue;
  }

  let encoded = '';

  // Break into 5-bit chunks
  while (intValue >= 0x20) {
    // Get the lowest 5 bits, add 0x20 (to indicate more chunks follow), then add 63
    encoded += String.fromCharCode((0x20 | (intValue & 0x1f)) + 63);
    intValue >>= 5;
  }

  // Last chunk (no 0x20 flag)
  encoded += String.fromCharCode(intValue + 63);

  return encoded;
};

/**
 * Decode a single coordinate value from the encoded string
 * @param encoded The full encoded string
 * @param index Current position in the string
 * @returns [decodedValue, newIndex]
 */
const decodeValue = (encoded: string, index: number): [number, number] => {
  let result = 0;
  let shift = 0;
  let byte: number;

  do {
    byte = encoded.charCodeAt(index++) - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  // Check if negative (least significant bit is 1)
  const value = result & 1 ? ~(result >> 1) : result >> 1;

  return [value / 1e5, index];
};

/**
 * Encode an array of location points to a Google Polyline string
 * @param points Array of points with latitude and longitude
 * @returns Encoded polyline string
 */
export const encodePolyline = (
  points: Array<{ latitude: number; longitude: number }>
): string => {
  if (points.length === 0) return '';

  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    // Delta encode from previous point
    const deltaLat = point.latitude - prevLat;
    const deltaLng = point.longitude - prevLng;

    encoded += encodeValue(deltaLat);
    encoded += encodeValue(deltaLng);

    prevLat = point.latitude;
    prevLng = point.longitude;
  }

  return encoded;
};

/**
 * Decode a Google Polyline string back to an array of coordinates
 * @param encoded The encoded polyline string
 * @returns Array of {lat, lng} coordinates
 */
export const decodePolyline = (encoded: string): Array<{ lat: number; lng: number }> => {
  if (!encoded || encoded.length === 0) return [];

  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    const [deltaLat, newIndexLat] = decodeValue(encoded, index);
    index = newIndexLat;

    const [deltaLng, newIndexLng] = decodeValue(encoded, index);
    index = newIndexLng;

    lat += deltaLat;
    lng += deltaLng;

    points.push({ lat, lng });
  }

  return points;
};
