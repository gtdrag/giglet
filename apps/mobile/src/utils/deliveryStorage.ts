/**
 * Delivery storage utilities for delivery data persistence and trip correlation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompletedTrip } from '../services/locationTracking';

// Storage keys
const STORAGE_KEYS = {
  DELIVERIES: '@giglet/deliveries',
};

/**
 * Platform types for delivery platforms
 */
export type DeliveryPlatform = 'DOORDASH' | 'UBEREATS';

/**
 * Delivery record interface
 * Represents a single delivery from a gig platform
 */
export interface DeliveryRecord {
  id: string;
  platform: DeliveryPlatform;
  restaurantName: string;
  deliveredAt: string; // ISO string for storage compatibility
  earnings: number; // total (base + tip)
  tip: number;
  basePay: number;
  isManual: boolean;
}

/**
 * Correlation result for a single trip
 */
export interface CorrelationResult {
  tripId: string;
  deliveryIds: string[];
  deliveryCount: number;
}

/**
 * Extended delivery with parsed date for internal use
 */
interface DeliveryWithDate extends Omit<DeliveryRecord, 'deliveredAt'> {
  deliveredAt: Date;
}

// Default tolerance window: 5 minutes in milliseconds
const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Get all deliveries from storage
 */
export const getDeliveries = async (): Promise<DeliveryRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DELIVERIES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[DeliveryStorage] Failed to get deliveries:', error);
    return [];
  }
};

/**
 * Get deliveries within a date range
 * @param startDate - Start of the date range
 * @param endDate - End of the date range
 */
export const getDeliveriesByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<DeliveryRecord[]> => {
  const deliveries = await getDeliveries();
  const start = startDate.getTime();
  const end = endDate.getTime();

  return deliveries.filter((delivery) => {
    const deliveryTime = new Date(delivery.deliveredAt).getTime();
    return deliveryTime >= start && deliveryTime <= end;
  });
};

/**
 * Save deliveries to storage
 */
export const saveDeliveries = async (deliveries: DeliveryRecord[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(deliveries));
  } catch (error) {
    console.error('[DeliveryStorage] Failed to save deliveries:', error);
    throw error;
  }
};

/**
 * Add a single delivery to storage
 */
export const addDelivery = async (delivery: DeliveryRecord): Promise<void> => {
  try {
    const deliveries = await getDeliveries();
    deliveries.unshift(delivery); // Add to beginning (most recent first)
    await saveDeliveries(deliveries);
  } catch (error) {
    console.error('[DeliveryStorage] Failed to add delivery:', error);
    throw error;
  }
};

/**
 * Clear all deliveries from storage
 */
export const clearDeliveries = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.DELIVERIES);
  } catch (error) {
    console.error('[DeliveryStorage] Failed to clear deliveries:', error);
    throw error;
  }
};

/**
 * Correlate trips with deliveries
 * Matches deliveries to trips based on timestamp proximity
 *
 * @param trips - Array of completed trips
 * @param deliveries - Array of delivery records
 * @param toleranceMs - Tolerance window in milliseconds (default: 5 minutes)
 * @returns Map of trip IDs to their correlation results
 */
export const correlateTripsWithDeliveries = (
  trips: CompletedTrip[],
  deliveries: DeliveryRecord[],
  toleranceMs: number = DEFAULT_TOLERANCE_MS
): Map<string, CorrelationResult> => {
  const correlationMap = new Map<string, CorrelationResult>();

  // Early return if no data
  if (trips.length === 0 || deliveries.length === 0) {
    return correlationMap;
  }

  // Parse delivery dates once for efficiency
  const deliveriesWithDates: DeliveryWithDate[] = deliveries.map((d) => ({
    ...d,
    deliveredAt: new Date(d.deliveredAt),
  }));

  for (const trip of trips) {
    const tripStart = new Date(trip.startedAt).getTime() - toleranceMs;
    const tripEnd = new Date(trip.endedAt).getTime() + toleranceMs;

    const matchedDeliveryIds: string[] = [];

    for (const delivery of deliveriesWithDates) {
      const deliveryTime = delivery.deliveredAt.getTime();

      // Check if delivery falls within trip time range (with tolerance)
      if (deliveryTime >= tripStart && deliveryTime <= tripEnd) {
        matchedDeliveryIds.push(delivery.id);
      }
    }

    // Only add to map if there are matches
    if (matchedDeliveryIds.length > 0) {
      correlationMap.set(trip.id, {
        tripId: trip.id,
        deliveryIds: matchedDeliveryIds,
        deliveryCount: matchedDeliveryIds.length,
      });
    }
  }

  return correlationMap;
};

/**
 * Get deliveries by their IDs
 * Useful for retrieving matched deliveries after correlation
 */
export const getDeliveriesByIds = async (ids: string[]): Promise<DeliveryRecord[]> => {
  const deliveries = await getDeliveries();
  const idSet = new Set(ids);
  return deliveries.filter((d) => idSet.has(d.id));
};

/**
 * Generate a unique delivery ID
 */
export const generateDeliveryId = (): string => {
  return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create mock delivery data for testing
 * Call this to populate storage with test data during development
 */
export const createMockDeliveries = async (): Promise<DeliveryRecord[]> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Create deliveries at various times today
  const mockDeliveries: DeliveryRecord[] = [
    {
      id: generateDeliveryId(),
      platform: 'DOORDASH',
      restaurantName: 'Chipotle Mexican Grill',
      deliveredAt: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(), // 12:00 PM
      earnings: 8.50,
      tip: 3.00,
      basePay: 5.50,
      isManual: false,
    },
    {
      id: generateDeliveryId(),
      platform: 'UBEREATS',
      restaurantName: 'Panda Express',
      deliveredAt: new Date(today.getTime() + 12.5 * 60 * 60 * 1000).toISOString(), // 12:30 PM
      earnings: 12.25,
      tip: 5.00,
      basePay: 7.25,
      isManual: false,
    },
    {
      id: generateDeliveryId(),
      platform: 'DOORDASH',
      restaurantName: 'Taco Bell',
      deliveredAt: new Date(today.getTime() + 13 * 60 * 60 * 1000).toISOString(), // 1:00 PM
      earnings: 6.75,
      tip: 2.00,
      basePay: 4.75,
      isManual: false,
    },
    {
      id: generateDeliveryId(),
      platform: 'UBEREATS',
      restaurantName: 'McDonalds',
      deliveredAt: new Date(today.getTime() + 18 * 60 * 60 * 1000).toISOString(), // 6:00 PM
      earnings: 9.00,
      tip: 4.00,
      basePay: 5.00,
      isManual: false,
    },
    {
      id: generateDeliveryId(),
      platform: 'DOORDASH',
      restaurantName: 'Chick-fil-A',
      deliveredAt: new Date(today.getTime() + 18.25 * 60 * 60 * 1000).toISOString(), // 6:15 PM
      earnings: 11.50,
      tip: 6.00,
      basePay: 5.50,
      isManual: false,
    },
  ];

  await saveDeliveries(mockDeliveries);
  return mockDeliveries;
};
