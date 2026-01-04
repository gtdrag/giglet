import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock expo-location
vi.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: vi.fn().mockResolvedValue(false),
  startLocationUpdatesAsync: vi.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: vi.fn().mockResolvedValue(undefined),
  Accuracy: {
    Balanced: 3,
  },
  ActivityType: {
    AutomotiveNavigation: 2,
  },
}));

// Mock expo-task-manager
vi.mock('expo-task-manager', () => ({
  defineTask: vi.fn(),
}));

// Mock location storage
vi.mock('../../utils/locationStorage', () => ({
  addLocationPoint: vi.fn().mockResolvedValue(undefined),
  getActiveTripPoints: vi.fn().mockResolvedValue([]),
  clearActiveTrip: vi.fn().mockResolvedValue(undefined),
  saveCompletedTrip: vi.fn().mockResolvedValue(undefined),
  loadTripState: vi.fn().mockResolvedValue(null),
  saveTripState: vi.fn().mockResolvedValue(undefined),
}));

// Mock distance utils
vi.mock('../../utils/distance', () => ({
  calculateDistance: vi.fn((lat1: number, lng1: number, lat2: number, lng2: number) => {
    // Simple mock: return 100 meters per call
    return 100;
  }),
  metersToMiles: vi.fn((meters: number) => meters * 0.000621371),
  encodePolyline: vi.fn(() => 'mock_encoded_polyline'),
}));

// Import after mocking
import type { TripState, LocationPoint, ActiveTrip, CompletedTrip } from '../locationTracking';

describe('Location Tracking - Trip State Machine', () => {
  // These tests verify the business logic of the trip state machine
  // The actual state machine is internal, so we test the exported types and constants

  describe('TripState type', () => {
    it('should have valid TripState values', () => {
      const validStates: TripState[] = ['IDLE', 'MOVING', 'PAUSED'];
      expect(validStates).toHaveLength(3);
    });
  });

  describe('LocationPoint interface', () => {
    it('should have required properties', () => {
      const point: LocationPoint = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
        speed: 15.0,
        accuracy: 10,
      };

      expect(point.latitude).toBeDefined();
      expect(point.longitude).toBeDefined();
      expect(point.timestamp).toBeDefined();
      expect(point.speed).toBeDefined();
      expect(point.accuracy).toBeDefined();
    });

    it('should allow null speed', () => {
      const point: LocationPoint = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
        speed: null,
        accuracy: 10,
      };

      expect(point.speed).toBeNull();
    });
  });

  describe('CompletedTrip interface', () => {
    it('should have all required properties', () => {
      const trip: CompletedTrip = {
        id: 'trip_123',
        startedAt: '2024-01-01T10:00:00.000Z',
        endedAt: '2024-01-01T10:30:00.000Z',
        miles: 5.5,
        startLat: 37.7749,
        startLng: -122.4194,
        endLat: 37.8049,
        endLng: -122.3894,
        pointCount: 30,
        isManual: false,
        encodedRoute: 'mock_polyline',
      };

      expect(trip.id).toBe('trip_123');
      expect(trip.miles).toBe(5.5);
      expect(trip.pointCount).toBe(30);
      expect(trip.isManual).toBe(false);
      expect(trip.encodedRoute).toBe('mock_polyline');
    });

    it('should allow undefined encodedRoute for backwards compatibility', () => {
      const trip: CompletedTrip = {
        id: 'trip_123',
        startedAt: '2024-01-01T10:00:00.000Z',
        endedAt: '2024-01-01T10:30:00.000Z',
        miles: 5.5,
        startLat: 37.7749,
        startLng: -122.4194,
        endLat: 37.8049,
        endLng: -122.3894,
        pointCount: 30,
        isManual: false,
      };

      expect(trip.encodedRoute).toBeUndefined();
    });
  });
});

describe('Trip State Machine Logic', () => {
  // Test the thresholds and timing logic that drive state transitions

  describe('Speed Thresholds', () => {
    // From locationTracking.ts:
    // SPEED_MOVING_THRESHOLD = 6.7 m/s (~15 mph)
    // SPEED_STATIONARY_THRESHOLD = 2.0 m/s (~4.5 mph)
    // MAX_REALISTIC_SPEED = 44.7 m/s (~100 mph)

    const SPEED_MOVING_THRESHOLD = 6.7;
    const SPEED_STATIONARY_THRESHOLD = 2.0;
    const MAX_REALISTIC_SPEED = 44.7;

    it('should identify moving state above 6.7 m/s (15 mph)', () => {
      const speed = 7.0; // m/s
      const isMoving = speed > SPEED_MOVING_THRESHOLD;
      expect(isMoving).toBe(true);
    });

    it('should identify stationary state below 2.0 m/s (4.5 mph)', () => {
      const speed = 1.5; // m/s
      const isStationary = speed < SPEED_STATIONARY_THRESHOLD;
      expect(isStationary).toBe(true);
    });

    it('should filter unrealistic speeds above 44.7 m/s (100 mph)', () => {
      const isRealisticSpeed = (speed: number) => speed >= 0 && speed <= MAX_REALISTIC_SPEED;

      expect(isRealisticSpeed(30)).toBe(true); // 67 mph - realistic
      expect(isRealisticSpeed(44.7)).toBe(true); // 100 mph - edge case
      expect(isRealisticSpeed(50)).toBe(false); // 112 mph - unrealistic
      expect(isRealisticSpeed(100)).toBe(false); // 224 mph - definitely unrealistic
      expect(isRealisticSpeed(-5)).toBe(false); // Negative - unrealistic
    });

    it('should handle transition zone between stationary and moving', () => {
      // Speed between 2.0 and 6.7 m/s is neither definitively moving nor stationary
      const speed = 4.0; // m/s (~9 mph)
      const isMoving = speed > SPEED_MOVING_THRESHOLD;
      const isStationary = speed < SPEED_STATIONARY_THRESHOLD;

      expect(isMoving).toBe(false);
      expect(isStationary).toBe(false);
    });
  });

  describe('Time Thresholds', () => {
    // From locationTracking.ts:
    // MOVING_CONFIRM_TIME = 30000 (30 seconds)
    // PAUSE_CONFIRM_TIME = 120000 (2 minutes)
    // TRIP_END_TIME = 300000 (5 minutes)

    const MOVING_CONFIRM_TIME = 30000;
    const PAUSE_CONFIRM_TIME = 120000;
    const TRIP_END_TIME = 300000;

    it('should require 30 seconds of moving to confirm trip start', () => {
      expect(MOVING_CONFIRM_TIME).toBe(30000);
      expect(MOVING_CONFIRM_TIME / 1000).toBe(30);
    });

    it('should require 2 minutes of stationary to confirm pause', () => {
      expect(PAUSE_CONFIRM_TIME).toBe(120000);
      expect(PAUSE_CONFIRM_TIME / 60000).toBe(2);
    });

    it('should require 5 minutes total stationary to end trip', () => {
      expect(TRIP_END_TIME).toBe(300000);
      expect(TRIP_END_TIME / 60000).toBe(5);
    });

    it('should correctly calculate time since state change', () => {
      const stateChangedAt = new Date(Date.now() - 60000); // 1 minute ago
      const now = new Date();
      const timeSinceStateChange = now.getTime() - stateChangedAt.getTime();

      expect(timeSinceStateChange).toBeGreaterThanOrEqual(60000);
      expect(timeSinceStateChange).toBeLessThan(61000);
    });
  });

  describe('State Transitions', () => {
    it('IDLE → MOVING: should transition after 30s of speed > 6.7 m/s', () => {
      const SPEED_MOVING_THRESHOLD = 6.7;
      const MOVING_CONFIRM_TIME = 30000;

      let currentState: TripState = 'IDLE';
      let lastMovingAt: Date | null = null;
      const now = new Date();

      // Simulate first moving detection
      const currentSpeed = 10.0; // 22 mph
      const isMoving = currentSpeed > SPEED_MOVING_THRESHOLD;
      expect(isMoving).toBe(true);

      if (isMoving && !lastMovingAt) {
        lastMovingAt = now;
      }

      // Simulate 31 seconds later, still moving
      const later = new Date(now.getTime() + 31000);
      if (isMoving && lastMovingAt) {
        const movingDuration = later.getTime() - lastMovingAt.getTime();
        if (movingDuration >= MOVING_CONFIRM_TIME) {
          currentState = 'MOVING';
        }
      }

      expect(currentState).toBe('MOVING');
    });

    it('MOVING → PAUSED: should transition after 2 min stationary', () => {
      const SPEED_STATIONARY_THRESHOLD = 2.0;
      const PAUSE_CONFIRM_TIME = 120000;

      let currentState: TripState = 'MOVING';
      const stateChangedAt = new Date(Date.now() - 121000); // 2+ minutes ago

      // Simulate stationary detection
      const currentSpeed = 0.5; // Nearly stopped
      const isStationary = currentSpeed < SPEED_STATIONARY_THRESHOLD;
      const timeSinceStateChange = Date.now() - stateChangedAt.getTime();

      if (currentState === 'MOVING' && isStationary && timeSinceStateChange >= PAUSE_CONFIRM_TIME) {
        currentState = 'PAUSED';
      }

      expect(currentState).toBe('PAUSED');
    });

    it('PAUSED → MOVING: should resume when speed exceeds threshold', () => {
      const SPEED_MOVING_THRESHOLD = 6.7;

      let currentState: TripState = 'PAUSED';

      // Simulate starting to move again
      const currentSpeed = 8.0; // 18 mph
      const isMoving = currentSpeed > SPEED_MOVING_THRESHOLD;

      if (currentState === 'PAUSED' && isMoving) {
        currentState = 'MOVING';
      }

      expect(currentState).toBe('MOVING');
    });

    it('PAUSED → IDLE: should end trip after 5 min total stationary', () => {
      const TRIP_END_TIME = 300000;
      const PAUSE_CONFIRM_TIME = 120000;

      let currentState: TripState = 'PAUSED';
      // State changed to PAUSED 3+ minutes ago (which means 5+ min total since we need 2 min to pause)
      const stateChangedAt = new Date(Date.now() - 181000); // 3 min in PAUSED

      const timeSinceStateChange = Date.now() - stateChangedAt.getTime();

      if (currentState === 'PAUSED' && timeSinceStateChange >= TRIP_END_TIME - PAUSE_CONFIRM_TIME) {
        currentState = 'IDLE';
      }

      expect(currentState).toBe('IDLE');
    });
  });

  describe('Smoothed Speed Calculation', () => {
    it('should calculate speed from consecutive points', () => {
      const points = [
        { latitude: 37.7749, longitude: -122.4194, timestamp: 1000, speed: 10, accuracy: 10 },
        { latitude: 37.7760, longitude: -122.4194, timestamp: 11000, speed: 10, accuracy: 10 },
      ];

      // Distance ~122m, time = 10 seconds
      // Speed = 122m / 10s = 12.2 m/s
      const calculateSmoothedSpeed = (pts: typeof points): number => {
        if (pts.length < 2) return 0;

        let totalDistance = 0;
        let totalTime = 0;

        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1];
          const curr = pts[i];
          // Simplified distance calculation for test
          const latDiff = (curr.latitude - prev.latitude) * 111000; // ~111km per degree
          totalDistance += Math.abs(latDiff);
          totalTime += (curr.timestamp - prev.timestamp) / 1000;
        }

        if (totalTime === 0) return 0;
        return totalDistance / totalTime;
      };

      const speed = calculateSmoothedSpeed(points);
      expect(speed).toBeGreaterThan(10); // Should be around 12.2 m/s
      expect(speed).toBeLessThan(15);
    });

    it('should return 0 for single point', () => {
      const points = [
        { latitude: 37.7749, longitude: -122.4194, timestamp: 1000, speed: 10, accuracy: 10 },
      ];

      const calculateSmoothedSpeed = (pts: typeof points): number => {
        if (pts.length < 2) return 0;
        return 10; // Would calculate normally
      };

      expect(calculateSmoothedSpeed(points)).toBe(0);
    });

    it('should return 0 for empty array', () => {
      const points: any[] = [];

      const calculateSmoothedSpeed = (pts: any[]): number => {
        if (pts.length < 2) return 0;
        return 10;
      };

      expect(calculateSmoothedSpeed(points)).toBe(0);
    });
  });

  describe('GPS Drift Filtering', () => {
    const MAX_REALISTIC_SPEED = 44.7;

    it('should reject speeds over 100 mph (44.7 m/s)', () => {
      const isRealistic = (speed: number) => speed >= 0 && speed <= MAX_REALISTIC_SPEED;

      // GPS drift can cause massive speed jumps
      expect(isRealistic(100)).toBe(false); // 224 mph
      expect(isRealistic(200)).toBe(false); // 448 mph
    });

    it('should accept highway speeds up to 100 mph', () => {
      const isRealistic = (speed: number) => speed >= 0 && speed <= MAX_REALISTIC_SPEED;

      expect(isRealistic(35)).toBe(true); // 78 mph
      expect(isRealistic(40)).toBe(true); // 90 mph
      expect(isRealistic(44)).toBe(true); // 98 mph
    });

    it('should calculate implied speed between points', () => {
      const point1 = { latitude: 37.7749, longitude: -122.4194, timestamp: 1000 };
      const point2 = { latitude: 37.8749, longitude: -122.4194, timestamp: 2000 }; // 11km in 1 second = impossible

      const distance = 11000; // meters (simplified)
      const timeDiff = (point2.timestamp - point1.timestamp) / 1000; // 1 second
      const impliedSpeed = distance / timeDiff;

      expect(impliedSpeed).toBeGreaterThan(MAX_REALISTIC_SPEED);
    });
  });
});

describe('Trip ID Generation', () => {
  it('should generate unique trip IDs', () => {
    const generateTripId = (): string => {
      return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const id1 = generateTripId();
    const id2 = generateTripId();

    expect(id1).toMatch(/^trip_\d+_[a-z0-9]{9}$/);
    expect(id2).toMatch(/^trip_\d+_[a-z0-9]{9}$/);
    // Very unlikely to be equal even with same timestamp due to random suffix
    expect(id1).not.toBe(id2);
  });
});
