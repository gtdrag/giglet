import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  metersToMiles,
  milesToMeters,
  calculateTotalDistance,
  calculateTotalMiles,
  encodePolyline,
  decodePolyline,
} from '../distance';

describe('Distance Calculations', () => {
  describe('calculateDistance (Haversine)', () => {
    it('should calculate distance between San Francisco and Los Angeles accurately', () => {
      // SF: 37.7749, -122.4194
      // LA: 34.0522, -118.2437
      // Expected: ~559 km = ~559000 meters
      const distance = calculateDistance(37.7749, -122.4194, 34.0522, -118.2437);

      // Allow 1% margin of error
      expect(distance).toBeGreaterThan(550000); // At least 550km
      expect(distance).toBeLessThan(570000); // At most 570km
    });

    it('should calculate short distance accurately (1 mile = ~1609 meters)', () => {
      // Roughly 1 mile apart coordinates
      const distance = calculateDistance(37.7749, -122.4194, 37.7894, -122.4194);

      // About 1.6km north from the first point
      expect(distance).toBeGreaterThan(1500);
      expect(distance).toBeLessThan(1700);
    });

    it('should return 0 for same point', () => {
      const distance = calculateDistance(37.7749, -122.4194, 37.7749, -122.4194);
      expect(distance).toBe(0);
    });

    it('should handle crossing the equator', () => {
      // From northern to southern hemisphere
      const distance = calculateDistance(10, 0, -10, 0);

      // About 2222 km (20 degrees latitude)
      expect(distance).toBeGreaterThan(2200000);
      expect(distance).toBeLessThan(2250000);
    });

    it('should handle crossing the prime meridian', () => {
      // From west to east of prime meridian
      const distance = calculateDistance(51.5074, -0.1278, 51.5074, 0.1278);

      // About 18 km
      expect(distance).toBeGreaterThan(17000);
      expect(distance).toBeLessThan(19000);
    });
  });

  describe('metersToMiles', () => {
    it('should convert 1609 meters to approximately 1 mile', () => {
      const miles = metersToMiles(1609.34);
      expect(miles).toBeCloseTo(1, 2);
    });

    it('should convert 0 meters to 0 miles', () => {
      expect(metersToMiles(0)).toBe(0);
    });

    it('should convert 1 kilometer to approximately 0.621 miles', () => {
      const miles = metersToMiles(1000);
      expect(miles).toBeCloseTo(0.621, 2);
    });
  });

  describe('milesToMeters', () => {
    it('should convert 1 mile to approximately 1609 meters', () => {
      const meters = milesToMeters(1);
      expect(meters).toBeCloseTo(1609.34, 0);
    });

    it('should be inverse of metersToMiles', () => {
      const original = 5000;
      const miles = metersToMiles(original);
      const backToMeters = milesToMeters(miles);
      expect(backToMeters).toBeCloseTo(original, 2);
    });
  });

  describe('calculateTotalDistance', () => {
    it('should calculate total distance from multiple points', () => {
      // Use realistic timestamps - ~1km takes about 60 seconds at 60 km/h
      const points = [
        { latitude: 37.7749, longitude: -122.4194, timestamp: 0 },
        { latitude: 37.7849, longitude: -122.4194, timestamp: 60000 }, // ~1.1km north, 60 sec
        { latitude: 37.7849, longitude: -122.4094, timestamp: 120000 }, // ~0.9km east, 60 sec
      ];

      const distance = calculateTotalDistance(points);
      expect(distance).toBeGreaterThan(1800); // Total ~2km
      expect(distance).toBeLessThan(2500);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotalDistance([])).toBe(0);
    });

    it('should return 0 for single point', () => {
      const points = [{ latitude: 37.7749, longitude: -122.4194, timestamp: 1000 }];
      expect(calculateTotalDistance(points)).toBe(0);
    });

    it('should filter out unrealistic GPS jumps (>100 mph)', () => {
      const points = [
        { latitude: 37.7749, longitude: -122.4194, timestamp: 0 },
        { latitude: 37.7849, longitude: -122.4194, timestamp: 60000 }, // Normal point, 60 sec
        { latitude: 40.0, longitude: -122.4194, timestamp: 61000 }, // Unrealistic jump (>200km in 1 second)
        { latitude: 37.7949, longitude: -122.4194, timestamp: 122000 }, // Normal point after jump
      ];

      const distance = calculateTotalDistance(points);
      // Should skip the unrealistic jump (points 2 and 3 should be filtered)
      // Only the first segment should count (~1.1km)
      expect(distance).toBeGreaterThan(500);
      expect(distance).toBeLessThan(3000); // Should be much less than the jump would add
    });
  });

  describe('calculateTotalMiles', () => {
    it('should return miles instead of meters', () => {
      // 1 mile = 1609 meters, at 30 mph (13.4 m/s) takes ~2 minutes
      const points = [
        { latitude: 37.7749, longitude: -122.4194, timestamp: 0 },
        { latitude: 37.7749 + 0.0145, longitude: -122.4194, timestamp: 120000 }, // ~1 mile north, 2 min
      ];

      const miles = calculateTotalMiles(points);
      expect(miles).toBeCloseTo(1, 0); // Approximately 1 mile
    });
  });
});

describe('Polyline Encoding/Decoding', () => {
  describe('encodePolyline', () => {
    it('should encode empty array as empty string', () => {
      expect(encodePolyline([])).toBe('');
    });

    it('should encode single point', () => {
      const points = [{ latitude: 38.5, longitude: -120.2 }];
      const encoded = encodePolyline(points);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
    });

    it('should encode known test case from Google documentation', () => {
      // Test case from Google's Polyline Algorithm documentation
      // Points: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
      const points = [
        { latitude: 38.5, longitude: -120.2 },
        { latitude: 40.7, longitude: -120.95 },
        { latitude: 43.252, longitude: -126.453 },
      ];

      const encoded = encodePolyline(points);
      // The expected encoding for these points
      expect(encoded).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    });
  });

  describe('decodePolyline', () => {
    it('should decode empty string as empty array', () => {
      expect(decodePolyline('')).toEqual([]);
    });

    it('should decode known test case from Google documentation', () => {
      const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
      const points = decodePolyline(encoded);

      expect(points).toHaveLength(3);
      expect(points[0].lat).toBeCloseTo(38.5, 4);
      expect(points[0].lng).toBeCloseTo(-120.2, 4);
      expect(points[1].lat).toBeCloseTo(40.7, 4);
      expect(points[1].lng).toBeCloseTo(-120.95, 4);
      expect(points[2].lat).toBeCloseTo(43.252, 4);
      expect(points[2].lng).toBeCloseTo(-126.453, 4);
    });
  });

  describe('encodePolyline + decodePolyline round-trip', () => {
    it('should maintain coordinate precision through encode/decode cycle', () => {
      const originalPoints = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 },
        { latitude: 37.7949, longitude: -122.3994 },
        { latitude: 37.8049, longitude: -122.3894 },
      ];

      const encoded = encodePolyline(originalPoints);
      const decoded = decodePolyline(encoded);

      expect(decoded).toHaveLength(originalPoints.length);

      for (let i = 0; i < originalPoints.length; i++) {
        // Precision should be maintained to 5 decimal places (~1.1m)
        expect(decoded[i].lat).toBeCloseTo(originalPoints[i].latitude, 5);
        expect(decoded[i].lng).toBeCloseTo(originalPoints[i].longitude, 5);
      }
    });

    it('should handle negative coordinates correctly', () => {
      const originalPoints = [
        { latitude: -33.8688, longitude: 151.2093 }, // Sydney
        { latitude: 51.5074, longitude: -0.1278 }, // London
      ];

      const encoded = encodePolyline(originalPoints);
      const decoded = decodePolyline(encoded);

      expect(decoded[0].lat).toBeCloseTo(-33.8688, 4);
      expect(decoded[0].lng).toBeCloseTo(151.2093, 4);
      expect(decoded[1].lat).toBeCloseTo(51.5074, 4);
      expect(decoded[1].lng).toBeCloseTo(-0.1278, 4);
    });

    it('should achieve significant compression for trip data', () => {
      // Simulate a 30-minute trip with 30 points (one per minute)
      const points: Array<{ latitude: number; longitude: number }> = [];
      let lat = 37.7749;
      let lng = -122.4194;

      for (let i = 0; i < 30; i++) {
        points.push({ latitude: lat, longitude: lng });
        lat += 0.001; // Move slightly north each minute
        lng += 0.0005; // Move slightly east each minute
      }

      const encoded = encodePolyline(points);
      const rawJsonSize = JSON.stringify(points).length;
      const encodedSize = encoded.length;

      // Polyline encoding should be significantly smaller
      expect(encodedSize).toBeLessThan(rawJsonSize);
      // Typically ~10x compression, but at minimum 3x
      expect(rawJsonSize / encodedSize).toBeGreaterThan(3);
    });
  });
});
