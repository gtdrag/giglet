/**
 * Unit tests for delivery storage utilities and correlation algorithm
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  correlateTripsWithDeliveries,
  getDeliveries,
  getDeliveriesByDateRange,
  getDeliveriesByIds,
  saveDeliveries,
  addDelivery,
  clearDeliveries,
  generateDeliveryId,
  type DeliveryRecord,
  type CorrelationResult,
} from '../deliveryStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompletedTrip } from '../../services/locationTracking';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Helper to create mock trips
const createMockTrip = (
  id: string,
  startedAt: Date,
  endedAt: Date
): CompletedTrip => ({
  id,
  startedAt: startedAt.toISOString(),
  endedAt: endedAt.toISOString(),
  miles: 5.0,
  startLat: 40.7128,
  startLng: -74.006,
  endLat: 40.7589,
  endLng: -73.9851,
  pointCount: 10,
  isManual: false,
});

// Helper to create mock deliveries
const createMockDelivery = (
  id: string,
  deliveredAt: Date,
  platform: 'DOORDASH' | 'UBEREATS' = 'DOORDASH'
): DeliveryRecord => ({
  id,
  platform,
  restaurantName: 'Test Restaurant',
  deliveredAt: deliveredAt.toISOString(),
  earnings: 10.0,
  tip: 3.0,
  basePay: 7.0,
  isManual: false,
});

describe('correlateTripsWithDeliveries', () => {
  describe('basic matching', () => {
    it('should match a single delivery within a trip time range', () => {
      const tripStart = new Date('2025-01-15T12:00:00Z');
      const tripEnd = new Date('2025-01-15T13:00:00Z');
      const deliveryTime = new Date('2025-01-15T12:30:00Z');

      const trips = [createMockTrip('trip1', tripStart, tripEnd)];
      const deliveries = [createMockDelivery('del1', deliveryTime)];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(1);
      expect(result.get('trip1')).toEqual({
        tripId: 'trip1',
        deliveryIds: ['del1'],
        deliveryCount: 1,
      });
    });

    it('should match multiple deliveries to a single trip (multi-drop)', () => {
      const tripStart = new Date('2025-01-15T12:00:00Z');
      const tripEnd = new Date('2025-01-15T14:00:00Z');

      const trips = [createMockTrip('trip1', tripStart, tripEnd)];
      const deliveries = [
        createMockDelivery('del1', new Date('2025-01-15T12:15:00Z')),
        createMockDelivery('del2', new Date('2025-01-15T12:45:00Z')),
        createMockDelivery('del3', new Date('2025-01-15T13:30:00Z')),
      ];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(1);
      const tripResult = result.get('trip1');
      expect(tripResult?.deliveryCount).toBe(3);
      expect(tripResult?.deliveryIds).toContain('del1');
      expect(tripResult?.deliveryIds).toContain('del2');
      expect(tripResult?.deliveryIds).toContain('del3');
    });

    it('should not match deliveries outside trip time range', () => {
      const tripStart = new Date('2025-01-15T12:00:00Z');
      const tripEnd = new Date('2025-01-15T13:00:00Z');
      const deliveryTime = new Date('2025-01-15T14:00:00Z'); // After trip ended

      const trips = [createMockTrip('trip1', tripStart, tripEnd)];
      const deliveries = [createMockDelivery('del1', deliveryTime)];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(0);
    });

    it('should return empty map when no trips provided', () => {
      const deliveries = [createMockDelivery('del1', new Date('2025-01-15T12:30:00Z'))];

      const result = correlateTripsWithDeliveries([], deliveries);

      expect(result.size).toBe(0);
    });

    it('should return empty map when no deliveries provided', () => {
      const trips = [
        createMockTrip(
          'trip1',
          new Date('2025-01-15T12:00:00Z'),
          new Date('2025-01-15T13:00:00Z')
        ),
      ];

      const result = correlateTripsWithDeliveries(trips, []);

      expect(result.size).toBe(0);
    });
  });

  describe('tolerance window', () => {
    it('should match delivery within tolerance window before trip start', () => {
      const tripStart = new Date('2025-01-15T12:00:00Z');
      const tripEnd = new Date('2025-01-15T13:00:00Z');
      // Delivery 3 minutes before trip start (within 5 min tolerance)
      const deliveryTime = new Date('2025-01-15T11:57:00Z');

      const trips = [createMockTrip('trip1', tripStart, tripEnd)];
      const deliveries = [createMockDelivery('del1', deliveryTime)];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(1);
      expect(result.get('trip1')?.deliveryIds).toContain('del1');
    });

    it('should match delivery within tolerance window after trip end', () => {
      const tripStart = new Date('2025-01-15T12:00:00Z');
      const tripEnd = new Date('2025-01-15T13:00:00Z');
      // Delivery 3 minutes after trip end (within 5 min tolerance)
      const deliveryTime = new Date('2025-01-15T13:03:00Z');

      const trips = [createMockTrip('trip1', tripStart, tripEnd)];
      const deliveries = [createMockDelivery('del1', deliveryTime)];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(1);
      expect(result.get('trip1')?.deliveryIds).toContain('del1');
    });

    it('should not match delivery outside tolerance window', () => {
      const tripStart = new Date('2025-01-15T12:00:00Z');
      const tripEnd = new Date('2025-01-15T13:00:00Z');
      // Delivery 10 minutes after trip end (outside 5 min tolerance)
      const deliveryTime = new Date('2025-01-15T13:10:00Z');

      const trips = [createMockTrip('trip1', tripStart, tripEnd)];
      const deliveries = [createMockDelivery('del1', deliveryTime)];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(0);
    });

    it('should respect custom tolerance window', () => {
      const tripStart = new Date('2025-01-15T12:00:00Z');
      const tripEnd = new Date('2025-01-15T13:00:00Z');
      // Delivery 8 minutes after trip end
      const deliveryTime = new Date('2025-01-15T13:08:00Z');

      const trips = [createMockTrip('trip1', tripStart, tripEnd)];
      const deliveries = [createMockDelivery('del1', deliveryTime)];

      // With default 5 min tolerance - no match
      const result1 = correlateTripsWithDeliveries(trips, deliveries);
      expect(result1.size).toBe(0);

      // With 10 min tolerance - match
      const result2 = correlateTripsWithDeliveries(trips, deliveries, 10 * 60 * 1000);
      expect(result2.size).toBe(1);
      expect(result2.get('trip1')?.deliveryIds).toContain('del1');
    });
  });

  describe('edge cases', () => {
    it('should match delivery at exact trip start time', () => {
      const tripStart = new Date('2025-01-15T12:00:00Z');
      const tripEnd = new Date('2025-01-15T13:00:00Z');
      const deliveryTime = new Date('2025-01-15T12:00:00Z'); // Exact start

      const trips = [createMockTrip('trip1', tripStart, tripEnd)];
      const deliveries = [createMockDelivery('del1', deliveryTime)];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(1);
      expect(result.get('trip1')?.deliveryIds).toContain('del1');
    });

    it('should match delivery at exact trip end time', () => {
      const tripStart = new Date('2025-01-15T12:00:00Z');
      const tripEnd = new Date('2025-01-15T13:00:00Z');
      const deliveryTime = new Date('2025-01-15T13:00:00Z'); // Exact end

      const trips = [createMockTrip('trip1', tripStart, tripEnd)];
      const deliveries = [createMockDelivery('del1', deliveryTime)];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(1);
      expect(result.get('trip1')?.deliveryIds).toContain('del1');
    });

    it('should handle multiple trips with separate deliveries', () => {
      const trips = [
        createMockTrip(
          'trip1',
          new Date('2025-01-15T10:00:00Z'),
          new Date('2025-01-15T11:00:00Z')
        ),
        createMockTrip(
          'trip2',
          new Date('2025-01-15T14:00:00Z'),
          new Date('2025-01-15T15:00:00Z')
        ),
      ];
      const deliveries = [
        createMockDelivery('del1', new Date('2025-01-15T10:30:00Z')),
        createMockDelivery('del2', new Date('2025-01-15T14:30:00Z')),
      ];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(2);
      expect(result.get('trip1')?.deliveryIds).toEqual(['del1']);
      expect(result.get('trip2')?.deliveryIds).toEqual(['del2']);
    });

    it('should only include trips with matches in result map', () => {
      const trips = [
        createMockTrip(
          'trip1',
          new Date('2025-01-15T10:00:00Z'),
          new Date('2025-01-15T11:00:00Z')
        ),
        createMockTrip(
          'trip2',
          new Date('2025-01-15T14:00:00Z'),
          new Date('2025-01-15T15:00:00Z')
        ),
      ];
      // Only one delivery that matches trip1
      const deliveries = [
        createMockDelivery('del1', new Date('2025-01-15T10:30:00Z')),
      ];

      const result = correlateTripsWithDeliveries(trips, deliveries);

      expect(result.size).toBe(1);
      expect(result.has('trip1')).toBe(true);
      expect(result.has('trip2')).toBe(false);
    });
  });
});

describe('Storage functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDeliveries', () => {
    it('should return empty array when no deliveries stored', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);

      const result = await getDeliveries();

      expect(result).toEqual([]);
    });

    it('should return parsed deliveries from storage', async () => {
      const mockDeliveries = [createMockDelivery('del1', new Date())];
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(mockDeliveries));

      const result = await getDeliveries();

      expect(result).toEqual(mockDeliveries);
    });
  });

  describe('saveDeliveries', () => {
    it('should save deliveries to storage', async () => {
      const mockDeliveries = [createMockDelivery('del1', new Date())];

      await saveDeliveries(mockDeliveries);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@giglet/deliveries',
        JSON.stringify(mockDeliveries)
      );
    });
  });

  describe('addDelivery', () => {
    it('should add delivery to the beginning of existing deliveries', async () => {
      const existingDelivery = createMockDelivery('del1', new Date('2025-01-14'));
      const newDelivery = createMockDelivery('del2', new Date('2025-01-15'));
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify([existingDelivery]));

      await addDelivery(newDelivery);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@giglet/deliveries',
        expect.stringContaining('del2')
      );
      const savedData = JSON.parse(
        vi.mocked(AsyncStorage.setItem).mock.calls[0][1] as string
      );
      expect(savedData[0].id).toBe('del2'); // New delivery first
      expect(savedData[1].id).toBe('del1');
    });
  });

  describe('clearDeliveries', () => {
    it('should remove deliveries from storage', async () => {
      await clearDeliveries();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@giglet/deliveries');
    });
  });

  describe('getDeliveriesByDateRange', () => {
    it('should filter deliveries by date range', async () => {
      const deliveries = [
        createMockDelivery('del1', new Date('2025-01-14T10:00:00Z')),
        createMockDelivery('del2', new Date('2025-01-15T10:00:00Z')),
        createMockDelivery('del3', new Date('2025-01-16T10:00:00Z')),
      ];
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(deliveries));

      const result = await getDeliveriesByDateRange(
        new Date('2025-01-15T00:00:00Z'),
        new Date('2025-01-15T23:59:59Z')
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('del2');
    });
  });

  describe('getDeliveriesByIds', () => {
    it('should filter deliveries by IDs', async () => {
      const deliveries = [
        createMockDelivery('del1', new Date()),
        createMockDelivery('del2', new Date()),
        createMockDelivery('del3', new Date()),
      ];
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(deliveries));

      const result = await getDeliveriesByIds(['del1', 'del3']);

      expect(result.length).toBe(2);
      expect(result.map((d) => d.id)).toEqual(['del1', 'del3']);
    });
  });

  describe('generateDeliveryId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateDeliveryId();
      const id2 = generateDeliveryId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^del_\d+_[a-z0-9]+$/);
    });
  });
});
