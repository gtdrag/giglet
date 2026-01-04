/**
 * Location storage utilities for trip data persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationPoint, ActiveTrip, CompletedTrip, TripState } from '../services/locationTracking';

// Storage keys
const STORAGE_KEYS = {
  ACTIVE_TRIP_POINTS: '@giglet/active_trip_points',
  ACTIVE_TRIP_STATE: '@giglet/active_trip_state',
  COMPLETED_TRIPS: '@giglet/completed_trips',
  TRIP_STATS: '@giglet/trip_stats',
};

// Maximum points per trip (~8 hours of tracking at 60s intervals)
const MAX_POINTS_PER_TRIP = 1000;

// Maximum completed trips to store locally
const MAX_COMPLETED_TRIPS = 500;

/**
 * Add a location point to the active trip
 */
export const addLocationPoint = async (point: LocationPoint): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_POINTS);
    const points: LocationPoint[] = existing ? JSON.parse(existing) : [];

    // Enforce max points limit
    if (points.length >= MAX_POINTS_PER_TRIP) {
      // Remove oldest points to make room
      points.shift();
    }

    points.push(point);
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_POINTS, JSON.stringify(points));
  } catch (error) {
    console.error('[LocationStorage] Failed to add point:', error);
  }
};

/**
 * Get all points for the active trip
 */
export const getActiveTripPoints = async (): Promise<LocationPoint[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_POINTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[LocationStorage] Failed to get active trip points:', error);
    return [];
  }
};

/**
 * Clear active trip points
 */
export const clearActiveTrip = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACTIVE_TRIP_POINTS,
      STORAGE_KEYS.ACTIVE_TRIP_STATE,
    ]);
  } catch (error) {
    console.error('[LocationStorage] Failed to clear active trip:', error);
  }
};

/**
 * Save trip state for recovery after app restart
 */
export const saveTripState = async (
  state: TripState,
  activeTrip: ActiveTrip | null
): Promise<void> => {
  try {
    const stateData = {
      state,
      activeTrip: activeTrip
        ? {
            ...activeTrip,
            startedAt: activeTrip.startedAt.toISOString(),
            stateChangedAt: activeTrip.stateChangedAt.toISOString(),
            pausedAt: activeTrip.pausedAt?.toISOString(),
            lastMovingAt: activeTrip.lastMovingAt?.toISOString(),
            // Don't persist all points in state - they're stored separately
            points: [],
          }
        : null,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_STATE, JSON.stringify(stateData));
  } catch (error) {
    console.error('[LocationStorage] Failed to save trip state:', error);
  }
};

/**
 * Load trip state from storage
 */
export const loadTripState = async (): Promise<{
  state: TripState;
  activeTrip: ActiveTrip | null;
} | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_STATE);
    if (!data) return null;

    const parsed = JSON.parse(data);
    const points = await getActiveTripPoints();

    if (parsed.activeTrip) {
      parsed.activeTrip.startedAt = new Date(parsed.activeTrip.startedAt);
      parsed.activeTrip.stateChangedAt = new Date(parsed.activeTrip.stateChangedAt);
      if (parsed.activeTrip.pausedAt) {
        parsed.activeTrip.pausedAt = new Date(parsed.activeTrip.pausedAt);
      }
      if (parsed.activeTrip.lastMovingAt) {
        parsed.activeTrip.lastMovingAt = new Date(parsed.activeTrip.lastMovingAt);
      }
      // Restore points from separate storage
      parsed.activeTrip.points = points;
    }

    return parsed;
  } catch (error) {
    console.error('[LocationStorage] Failed to load trip state:', error);
    return null;
  }
};

/**
 * Save a completed trip
 */
export const saveCompletedTrip = async (trip: CompletedTrip): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_TRIPS);
    const trips: CompletedTrip[] = existing ? JSON.parse(existing) : [];

    // Add new trip at the beginning (most recent first)
    trips.unshift(trip);

    // Enforce max trips limit
    if (trips.length > MAX_COMPLETED_TRIPS) {
      trips.pop();
    }

    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_TRIPS, JSON.stringify(trips));

    // Update trip stats
    await updateTripStats(trip);
  } catch (error) {
    console.error('[LocationStorage] Failed to save completed trip:', error);
  }
};

/**
 * Get all completed trips
 */
export const getCompletedTrips = async (): Promise<CompletedTrip[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_TRIPS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[LocationStorage] Failed to get completed trips:', error);
    return [];
  }
};

/**
 * Pagination result interface
 */
export interface PaginatedTrips {
  trips: CompletedTrip[];
  hasMore: boolean;
  totalCount: number;
  page: number;
  limit: number;
}

/**
 * Get paginated completed trips
 * @param page - Page number (1-indexed)
 * @param limit - Number of trips per page (default 20)
 * @returns Paginated trips with metadata
 */
export const getPaginatedTrips = async (
  page: number = 1,
  limit: number = 20
): Promise<PaginatedTrips> => {
  try {
    const allTrips = await getCompletedTrips();
    const totalCount = allTrips.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const trips = allTrips.slice(startIndex, endIndex);
    const hasMore = endIndex < totalCount;

    return {
      trips,
      hasMore,
      totalCount,
      page,
      limit,
    };
  } catch (error) {
    console.error('[LocationStorage] Failed to get paginated trips:', error);
    return {
      trips: [],
      hasMore: false,
      totalCount: 0,
      page,
      limit,
    };
  }
};

/**
 * Get completed trips for a date range
 */
export const getTripsInRange = async (
  startDate: Date,
  endDate: Date
): Promise<CompletedTrip[]> => {
  const trips = await getCompletedTrips();
  const start = startDate.getTime();
  const end = endDate.getTime();

  return trips.filter((trip) => {
    const tripStart = new Date(trip.startedAt).getTime();
    return tripStart >= start && tripStart <= end;
  });
};

/**
 * Get trip stats (today, week, month, year)
 */
export interface TripStats {
  todayMiles: number;
  weekMiles: number;
  monthMiles: number;
  yearMiles: number;
  todayTrips: number;
  weekTrips: number;
  monthTrips: number;
  yearTrips: number;
  lastUpdated: string;
}

export const getDateRanges = (): {
  todayStart: Date;
  weekStart: Date;
  monthStart: Date;
  yearStart: Date;
} => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Week starts on Monday
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - daysFromMonday);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  return { todayStart, weekStart, monthStart, yearStart };
};

/**
 * Calculate trip stats from completed trips
 */
export const calculateTripStats = async (): Promise<TripStats> => {
  const trips = await getCompletedTrips();
  const { todayStart, weekStart, monthStart, yearStart } = getDateRanges();
  const now = new Date();

  const stats: TripStats = {
    todayMiles: 0,
    weekMiles: 0,
    monthMiles: 0,
    yearMiles: 0,
    todayTrips: 0,
    weekTrips: 0,
    monthTrips: 0,
    yearTrips: 0,
    lastUpdated: now.toISOString(),
  };

  for (const trip of trips) {
    const tripDate = new Date(trip.startedAt);

    if (tripDate >= yearStart) {
      stats.yearMiles += trip.miles;
      stats.yearTrips++;

      if (tripDate >= monthStart) {
        stats.monthMiles += trip.miles;
        stats.monthTrips++;

        if (tripDate >= weekStart) {
          stats.weekMiles += trip.miles;
          stats.weekTrips++;

          if (tripDate >= todayStart) {
            stats.todayMiles += trip.miles;
            stats.todayTrips++;
          }
        }
      }
    }
  }

  return stats;
};

/**
 * Update trip stats after a new trip is saved
 */
const updateTripStats = async (newTrip: CompletedTrip): Promise<void> => {
  try {
    const stats = await calculateTripStats();
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('[LocationStorage] Failed to update trip stats:', error);
  }
};

/**
 * Get cached trip stats (faster than recalculating)
 */
export const getCachedTripStats = async (): Promise<TripStats | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRIP_STATS);
    if (!data) return null;

    const stats: TripStats = JSON.parse(data);

    // Check if stats are from today
    const lastUpdated = new Date(stats.lastUpdated);
    const now = new Date();
    const isToday =
      lastUpdated.getFullYear() === now.getFullYear() &&
      lastUpdated.getMonth() === now.getMonth() &&
      lastUpdated.getDate() === now.getDate();

    // If not today, recalculate
    if (!isToday) {
      return calculateTripStats();
    }

    return stats;
  } catch (error) {
    console.error('[LocationStorage] Failed to get cached trip stats:', error);
    return null;
  }
};

/**
 * Delete a trip by ID
 */
export const deleteTrip = async (tripId: string): Promise<void> => {
  try {
    const trips = await getCompletedTrips();
    const filtered = trips.filter((t) => t.id !== tripId);
    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_TRIPS, JSON.stringify(filtered));

    // Recalculate stats
    const stats = await calculateTripStats();
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('[LocationStorage] Failed to delete trip:', error);
    throw error;
  }
};

/**
 * Generate a unique trip ID
 */
const generateTripId = (): string => {
  return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Manual trip data input interface
 */
export interface ManualTripInput {
  date: Date;
  startTime: Date;
  endTime: Date;
  miles: number;
}

/**
 * Save a manually entered trip
 * Sets isManual: true and generates appropriate timestamps
 */
export const saveManualTrip = async (input: ManualTripInput): Promise<CompletedTrip> => {
  try {
    // Combine date with times to create full timestamps
    const startedAt = new Date(input.date);
    startedAt.setHours(input.startTime.getHours(), input.startTime.getMinutes(), 0, 0);

    const endedAt = new Date(input.date);
    endedAt.setHours(input.endTime.getHours(), input.endTime.getMinutes(), 0, 0);

    // Create the manual trip
    const trip: CompletedTrip = {
      id: generateTripId(),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      miles: input.miles,
      // Manual trips don't have real coordinates - use 0,0 as placeholder
      startLat: 0,
      startLng: 0,
      endLat: 0,
      endLng: 0,
      pointCount: 0,
      isManual: true,
      // No encoded route for manual trips
    };

    // Save using the existing saveCompletedTrip function
    await saveCompletedTrip(trip);

    return trip;
  } catch (error) {
    console.error('[LocationStorage] Failed to save manual trip:', error);
    throw error;
  }
};

/**
 * Partial trip update interface
 */
export interface TripUpdate {
  miles?: number;
  startedAt?: string;
  endedAt?: string;
}

/**
 * Update an existing trip by ID
 * Only updates the fields provided in the update object
 */
export const updateTrip = async (tripId: string, update: TripUpdate): Promise<CompletedTrip | null> => {
  try {
    const trips = await getCompletedTrips();
    const tripIndex = trips.findIndex((t) => t.id === tripId);

    if (tripIndex === -1) {
      console.warn('[LocationStorage] Trip not found for update:', tripId);
      return null;
    }

    // Update only the provided fields
    const updatedTrip: CompletedTrip = {
      ...trips[tripIndex],
      ...(update.miles !== undefined && { miles: update.miles }),
      ...(update.startedAt !== undefined && { startedAt: update.startedAt }),
      ...(update.endedAt !== undefined && { endedAt: update.endedAt }),
    };

    trips[tripIndex] = updatedTrip;
    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_TRIPS, JSON.stringify(trips));

    // Recalculate stats
    const stats = await calculateTripStats();
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_STATS, JSON.stringify(stats));

    return updatedTrip;
  } catch (error) {
    console.error('[LocationStorage] Failed to update trip:', error);
    throw error;
  }
};

/**
 * Get today's trip data (for quick access)
 */
export const getTodayTrips = async (): Promise<CompletedTrip[]> => {
  const { todayStart } = getDateRanges();
  const now = new Date();
  return getTripsInRange(todayStart, now);
};

/**
 * Clear all trip data (for debugging/reset)
 */
export const clearAllTripData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACTIVE_TRIP_POINTS,
      STORAGE_KEYS.ACTIVE_TRIP_STATE,
      STORAGE_KEYS.COMPLETED_TRIPS,
      STORAGE_KEYS.TRIP_STATS,
    ]);
  } catch (error) {
    console.error('[LocationStorage] Failed to clear trip data:', error);
  }
};
