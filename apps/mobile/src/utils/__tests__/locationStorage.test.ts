/**
 * Unit tests for location storage utilities - period calculations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDateRanges,
  calculateTripStats,
  getPaginatedTrips,
  saveManualTrip,
  updateTrip,
  deleteTrip,
  getCompletedTrips,
  TripStats,
  PaginatedTrips,
  ManualTripInput,
} from '../locationStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    multiRemove: vi.fn(),
  },
}));

describe('getDateRanges', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return todayStart at midnight of current day', () => {
    // Set to Wednesday, Jan 15, 2025 at 2:30 PM
    vi.setSystemTime(new Date(2025, 0, 15, 14, 30, 0));

    const { todayStart } = getDateRanges();

    expect(todayStart.getFullYear()).toBe(2025);
    expect(todayStart.getMonth()).toBe(0); // January
    expect(todayStart.getDate()).toBe(15);
    expect(todayStart.getHours()).toBe(0);
    expect(todayStart.getMinutes()).toBe(0);
    expect(todayStart.getSeconds()).toBe(0);
  });

  it('should return weekStart on Monday for a Wednesday', () => {
    // Set to Wednesday, Jan 15, 2025 (Wednesday)
    vi.setSystemTime(new Date(2025, 0, 15, 14, 30, 0));

    const { weekStart } = getDateRanges();

    // Monday would be Jan 13, 2025
    expect(weekStart.getFullYear()).toBe(2025);
    expect(weekStart.getMonth()).toBe(0);
    expect(weekStart.getDate()).toBe(13);
    expect(weekStart.getDay()).toBe(1); // Monday = 1
    expect(weekStart.getHours()).toBe(0);
  });

  it('should return weekStart on Monday for a Sunday', () => {
    // Set to Sunday, Jan 19, 2025
    vi.setSystemTime(new Date(2025, 0, 19, 10, 0, 0));

    const { weekStart } = getDateRanges();

    // Monday would be Jan 13, 2025 (6 days back from Sunday)
    expect(weekStart.getDate()).toBe(13);
    expect(weekStart.getDay()).toBe(1); // Monday
  });

  it('should return weekStart on Monday for a Monday', () => {
    // Set to Monday, Jan 13, 2025
    vi.setSystemTime(new Date(2025, 0, 13, 8, 0, 0));

    const { weekStart } = getDateRanges();

    // Should be same day
    expect(weekStart.getDate()).toBe(13);
    expect(weekStart.getDay()).toBe(1); // Monday
  });

  it('should return monthStart on first of month', () => {
    // Set to Jan 15, 2025
    vi.setSystemTime(new Date(2025, 0, 15, 14, 30, 0));

    const { monthStart } = getDateRanges();

    expect(monthStart.getFullYear()).toBe(2025);
    expect(monthStart.getMonth()).toBe(0);
    expect(monthStart.getDate()).toBe(1);
    expect(monthStart.getHours()).toBe(0);
  });

  it('should return yearStart on January 1st', () => {
    // Set to March 15, 2025
    vi.setSystemTime(new Date(2025, 2, 15, 14, 30, 0));

    const { yearStart } = getDateRanges();

    expect(yearStart.getFullYear()).toBe(2025);
    expect(yearStart.getMonth()).toBe(0); // January
    expect(yearStart.getDate()).toBe(1);
    expect(yearStart.getHours()).toBe(0);
  });

  it('should handle week crossing month boundary', () => {
    // Set to Tuesday, Feb 4, 2025 - week started Monday Feb 3
    vi.setSystemTime(new Date(2025, 1, 4, 12, 0, 0));

    const { weekStart, monthStart } = getDateRanges();

    expect(weekStart.getMonth()).toBe(1); // February
    expect(weekStart.getDate()).toBe(3); // Monday Feb 3
    expect(monthStart.getDate()).toBe(1); // Feb 1
  });

  it('should handle week crossing year boundary', () => {
    // Set to Thursday, Jan 2, 2025 - week started Monday Dec 30, 2024
    vi.setSystemTime(new Date(2025, 0, 2, 12, 0, 0));

    const { weekStart, yearStart } = getDateRanges();

    expect(weekStart.getFullYear()).toBe(2024);
    expect(weekStart.getMonth()).toBe(11); // December
    expect(weekStart.getDate()).toBe(30); // Monday Dec 30
    expect(yearStart.getFullYear()).toBe(2025);
    expect(yearStart.getMonth()).toBe(0);
    expect(yearStart.getDate()).toBe(1);
  });
});

describe('calculateTripStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return zero stats when no trips exist', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);

    const stats = await calculateTripStats();

    expect(stats.todayMiles).toBe(0);
    expect(stats.weekMiles).toBe(0);
    expect(stats.monthMiles).toBe(0);
    expect(stats.yearMiles).toBe(0);
    expect(stats.todayTrips).toBe(0);
    expect(stats.weekTrips).toBe(0);
    expect(stats.monthTrips).toBe(0);
    expect(stats.yearTrips).toBe(0);
  });

  it('should correctly bucket trips by period', async () => {
    // Set current time to Wednesday Jan 15, 2025 at 2 PM
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const trips = [
      // Today - Jan 15 at 10am
      { id: '1', startedAt: '2025-01-15T10:00:00.000Z', miles: 10.5 },
      // This week (Monday Jan 13)
      { id: '2', startedAt: '2025-01-13T12:00:00.000Z', miles: 15.0 },
      // This month (Jan 5)
      { id: '3', startedAt: '2025-01-05T09:00:00.000Z', miles: 20.0 },
      // This year (Dec 2024 - NOT this year)
      { id: '4', startedAt: '2024-12-20T10:00:00.000Z', miles: 25.0 },
    ];

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const stats = await calculateTripStats();

    // Today: trip 1 only
    expect(stats.todayMiles).toBe(10.5);
    expect(stats.todayTrips).toBe(1);

    // This week: trips 1 + 2
    expect(stats.weekMiles).toBe(25.5);
    expect(stats.weekTrips).toBe(2);

    // This month: trips 1 + 2 + 3
    expect(stats.monthMiles).toBe(45.5);
    expect(stats.monthTrips).toBe(3);

    // This year: trips 1 + 2 + 3 (trip 4 is 2024)
    expect(stats.yearMiles).toBe(45.5);
    expect(stats.yearTrips).toBe(3);
  });

  it('should handle trips at period boundaries', async () => {
    // Set current time to Monday Jan 13, 2025 at 10 AM
    vi.setSystemTime(new Date(2025, 0, 13, 10, 0, 0));

    // Use local time for trips (create Date objects and convert to ISO string)
    const mondayMidnight = new Date(2025, 0, 13, 0, 0, 0);
    const sundayLateNight = new Date(2025, 0, 12, 23, 59, 59);

    const trips = [
      // Trip at midnight exactly on Monday (should be in this week)
      { id: '1', startedAt: mondayMidnight.toISOString(), miles: 5.0 },
      // Trip at 11:59 PM on Sunday (should NOT be in this week)
      { id: '2', startedAt: sundayLateNight.toISOString(), miles: 8.0 },
    ];

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const stats = await calculateTripStats();

    // Only trip 1 should be in this week (trip 2 is Sunday = previous week)
    expect(stats.weekMiles).toBe(5.0);
    expect(stats.weekTrips).toBe(1);
  });

  it('should include lastUpdated timestamp', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 30, 45));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);

    const stats = await calculateTripStats();

    expect(stats.lastUpdated).toBeDefined();
    const lastUpdated = new Date(stats.lastUpdated);
    expect(lastUpdated.getFullYear()).toBe(2025);
    expect(lastUpdated.getMonth()).toBe(0);
    expect(lastUpdated.getDate()).toBe(15);
  });

  it('should handle large number of trips efficiently', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    // Create 100 trips spread across the year
    const trips = Array.from({ length: 100 }, (_, i) => ({
      id: `trip_${i}`,
      startedAt: new Date(2025, 0, Math.floor(i / 10) + 1, 10, 0, 0).toISOString(),
      miles: 5.0,
    }));

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const stats = await calculateTripStats();

    // All trips should be counted for the year
    expect(stats.yearMiles).toBe(500);
    expect(stats.yearTrips).toBe(100);
  });

  it('should sum miles correctly with decimal precision', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const trips = [
      { id: '1', startedAt: '2025-01-15T10:00:00.000Z', miles: 10.123 },
      { id: '2', startedAt: '2025-01-15T11:00:00.000Z', miles: 5.456 },
      { id: '3', startedAt: '2025-01-15T12:00:00.000Z', miles: 2.789 },
    ];

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const stats = await calculateTripStats();

    // Use toBeCloseTo for floating point comparison
    expect(stats.todayMiles).toBeCloseTo(18.368, 3);
  });
});

describe('getPaginatedTrips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty result when no trips exist', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);

    const result = await getPaginatedTrips(1, 20);

    expect(result.trips).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.totalCount).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should return first page of trips', async () => {
    const trips = Array.from({ length: 25 }, (_, i) => ({
      id: `trip_${i}`,
      startedAt: '2025-01-15T10:00:00.000Z',
      miles: 5.0,
    }));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const result = await getPaginatedTrips(1, 20);

    expect(result.trips).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(result.totalCount).toBe(25);
    expect(result.page).toBe(1);
    expect(result.trips[0].id).toBe('trip_0');
  });

  it('should return second page of trips', async () => {
    const trips = Array.from({ length: 25 }, (_, i) => ({
      id: `trip_${i}`,
      startedAt: '2025-01-15T10:00:00.000Z',
      miles: 5.0,
    }));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const result = await getPaginatedTrips(2, 20);

    expect(result.trips).toHaveLength(5);
    expect(result.hasMore).toBe(false);
    expect(result.totalCount).toBe(25);
    expect(result.page).toBe(2);
    expect(result.trips[0].id).toBe('trip_20');
  });

  it('should handle exact page boundary', async () => {
    const trips = Array.from({ length: 40 }, (_, i) => ({
      id: `trip_${i}`,
      startedAt: '2025-01-15T10:00:00.000Z',
      miles: 5.0,
    }));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const result = await getPaginatedTrips(2, 20);

    expect(result.trips).toHaveLength(20);
    expect(result.hasMore).toBe(false); // Exactly at end
    expect(result.totalCount).toBe(40);
  });

  it('should return empty array for page beyond data', async () => {
    const trips = Array.from({ length: 10 }, (_, i) => ({
      id: `trip_${i}`,
      startedAt: '2025-01-15T10:00:00.000Z',
      miles: 5.0,
    }));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const result = await getPaginatedTrips(5, 20);

    expect(result.trips).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.totalCount).toBe(10);
  });

  it('should use default limit of 20', async () => {
    const trips = Array.from({ length: 25 }, (_, i) => ({
      id: `trip_${i}`,
      startedAt: '2025-01-15T10:00:00.000Z',
      miles: 5.0,
    }));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const result = await getPaginatedTrips(1);

    expect(result.trips).toHaveLength(20);
    expect(result.limit).toBe(20);
  });

  it('should handle custom limit', async () => {
    const trips = Array.from({ length: 50 }, (_, i) => ({
      id: `trip_${i}`,
      startedAt: '2025-01-15T10:00:00.000Z',
      miles: 5.0,
    }));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const result = await getPaginatedTrips(1, 10);

    expect(result.trips).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.limit).toBe(10);
  });

  it('should handle fewer trips than limit', async () => {
    const trips = Array.from({ length: 5 }, (_, i) => ({
      id: `trip_${i}`,
      startedAt: '2025-01-15T10:00:00.000Z',
      miles: 5.0,
    }));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

    const result = await getPaginatedTrips(1, 20);

    expect(result.trips).toHaveLength(5);
    expect(result.hasMore).toBe(false);
    expect(result.totalCount).toBe(5);
  });
});

describe('saveManualTrip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Default mock for getCompletedTrips
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    vi.mocked(AsyncStorage.setItem).mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create trip with isManual=true', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const input: ManualTripInput = {
      date: new Date(2025, 0, 15),
      startTime: new Date(2025, 0, 15, 10, 0, 0),
      endTime: new Date(2025, 0, 15, 11, 30, 0),
      miles: 25.5,
    };

    const trip = await saveManualTrip(input);

    expect(trip.isManual).toBe(true);
    expect(trip.miles).toBe(25.5);
  });

  it('should generate unique trip ID', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const input: ManualTripInput = {
      date: new Date(2025, 0, 15),
      startTime: new Date(2025, 0, 15, 10, 0, 0),
      endTime: new Date(2025, 0, 15, 11, 30, 0),
      miles: 10.0,
    };

    const trip = await saveManualTrip(input);

    expect(trip.id).toBeDefined();
    expect(trip.id).toMatch(/^trip_\d+_[a-z0-9]+$/);
  });

  it('should correctly combine date with start and end times', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const input: ManualTripInput = {
      date: new Date(2025, 0, 15),
      startTime: new Date(2025, 0, 15, 9, 30, 0),
      endTime: new Date(2025, 0, 15, 10, 45, 0),
      miles: 15.0,
    };

    const trip = await saveManualTrip(input);

    const startedAt = new Date(trip.startedAt);
    const endedAt = new Date(trip.endedAt);

    expect(startedAt.getHours()).toBe(9);
    expect(startedAt.getMinutes()).toBe(30);
    expect(endedAt.getHours()).toBe(10);
    expect(endedAt.getMinutes()).toBe(45);
  });

  it('should set coordinates to 0,0 for manual trips', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const input: ManualTripInput = {
      date: new Date(2025, 0, 15),
      startTime: new Date(2025, 0, 15, 10, 0, 0),
      endTime: new Date(2025, 0, 15, 11, 0, 0),
      miles: 10.0,
    };

    const trip = await saveManualTrip(input);

    expect(trip.startLat).toBe(0);
    expect(trip.startLng).toBe(0);
    expect(trip.endLat).toBe(0);
    expect(trip.endLng).toBe(0);
    expect(trip.pointCount).toBe(0);
  });

  it('should save trip to storage', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const input: ManualTripInput = {
      date: new Date(2025, 0, 15),
      startTime: new Date(2025, 0, 15, 10, 0, 0),
      endTime: new Date(2025, 0, 15, 11, 0, 0),
      miles: 10.0,
    };

    await saveManualTrip(input);

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const calls = vi.mocked(AsyncStorage.setItem).mock.calls;
    const tripsCall = calls.find(call => call[0] === '@giglet/completed_trips');
    expect(tripsCall).toBeDefined();
  });
});

describe('updateTrip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(AsyncStorage.setItem).mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should update miles only when provided', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const existingTrips = [
      {
        id: 'trip_123',
        startedAt: '2025-01-15T10:00:00.000Z',
        endedAt: '2025-01-15T11:00:00.000Z',
        miles: 10.0,
        startLat: 0,
        startLng: 0,
        endLat: 0,
        endLng: 0,
        pointCount: 0,
        isManual: true,
      },
    ];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingTrips));

    const result = await updateTrip('trip_123', { miles: 25.0 });

    expect(result).not.toBeNull();
    expect(result?.miles).toBe(25.0);
    // Original times should be preserved
    expect(result?.startedAt).toBe('2025-01-15T10:00:00.000Z');
    expect(result?.endedAt).toBe('2025-01-15T11:00:00.000Z');
  });

  it('should update times when provided', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const existingTrips = [
      {
        id: 'trip_123',
        startedAt: '2025-01-15T10:00:00.000Z',
        endedAt: '2025-01-15T11:00:00.000Z',
        miles: 10.0,
        startLat: 0,
        startLng: 0,
        endLat: 0,
        endLng: 0,
        pointCount: 0,
        isManual: true,
      },
    ];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingTrips));

    const result = await updateTrip('trip_123', {
      startedAt: '2025-01-15T09:00:00.000Z',
      endedAt: '2025-01-15T12:00:00.000Z',
    });

    expect(result).not.toBeNull();
    expect(result?.startedAt).toBe('2025-01-15T09:00:00.000Z');
    expect(result?.endedAt).toBe('2025-01-15T12:00:00.000Z');
    // Original miles should be preserved
    expect(result?.miles).toBe(10.0);
  });

  it('should return null for non-existent trip', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const existingTrips = [
      {
        id: 'trip_123',
        startedAt: '2025-01-15T10:00:00.000Z',
        endedAt: '2025-01-15T11:00:00.000Z',
        miles: 10.0,
        startLat: 0,
        startLng: 0,
        endLat: 0,
        endLng: 0,
        pointCount: 0,
        isManual: true,
      },
    ];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingTrips));

    const result = await updateTrip('non_existent_trip', { miles: 25.0 });

    expect(result).toBeNull();
  });

  it('should preserve all other trip fields', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const existingTrips = [
      {
        id: 'trip_123',
        startedAt: '2025-01-15T10:00:00.000Z',
        endedAt: '2025-01-15T11:00:00.000Z',
        miles: 10.0,
        startLat: 37.0,
        startLng: -122.0,
        endLat: 37.1,
        endLng: -122.1,
        pointCount: 50,
        isManual: false,
        encodedRoute: 'encoded_polyline_string',
      },
    ];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingTrips));

    const result = await updateTrip('trip_123', { miles: 15.0 });

    expect(result).not.toBeNull();
    expect(result?.startLat).toBe(37.0);
    expect(result?.startLng).toBe(-122.0);
    expect(result?.endLat).toBe(37.1);
    expect(result?.endLng).toBe(-122.1);
    expect(result?.pointCount).toBe(50);
    expect(result?.isManual).toBe(false);
    expect(result?.encodedRoute).toBe('encoded_polyline_string');
  });

  it('should save updated trips to storage', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const existingTrips = [
      {
        id: 'trip_123',
        startedAt: '2025-01-15T10:00:00.000Z',
        endedAt: '2025-01-15T11:00:00.000Z',
        miles: 10.0,
        startLat: 0,
        startLng: 0,
        endLat: 0,
        endLng: 0,
        pointCount: 0,
        isManual: true,
      },
    ];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingTrips));

    await updateTrip('trip_123', { miles: 25.0 });

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const calls = vi.mocked(AsyncStorage.setItem).mock.calls;
    const tripsCall = calls.find(call => call[0] === '@giglet/completed_trips');
    expect(tripsCall).toBeDefined();

    // Verify the updated trip was saved with new miles
    const savedTrips = JSON.parse(tripsCall![1]);
    expect(savedTrips[0].miles).toBe(25.0);
  });

  it('should recalculate stats after update', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const existingTrips = [
      {
        id: 'trip_123',
        startedAt: '2025-01-15T10:00:00.000Z',
        endedAt: '2025-01-15T11:00:00.000Z',
        miles: 10.0,
        startLat: 0,
        startLng: 0,
        endLat: 0,
        endLng: 0,
        pointCount: 0,
        isManual: true,
      },
    ];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingTrips));

    await updateTrip('trip_123', { miles: 25.0 });

    // Should have called setItem for both trips and stats
    const calls = vi.mocked(AsyncStorage.setItem).mock.calls;
    const statsCall = calls.find(call => call[0] === '@giglet/trip_stats');
    expect(statsCall).toBeDefined();
  });
});

describe('deleteTrip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(AsyncStorage.setItem).mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should remove trip from storage', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const existingTrips = [
      {
        id: 'trip_123',
        startedAt: '2025-01-15T10:00:00.000Z',
        endedAt: '2025-01-15T11:00:00.000Z',
        miles: 10.0,
        startLat: 0,
        startLng: 0,
        endLat: 0,
        endLng: 0,
        pointCount: 0,
        isManual: true,
      },
      {
        id: 'trip_456',
        startedAt: '2025-01-15T12:00:00.000Z',
        endedAt: '2025-01-15T13:00:00.000Z',
        miles: 15.0,
        startLat: 0,
        startLng: 0,
        endLat: 0,
        endLng: 0,
        pointCount: 0,
        isManual: false,
      },
    ];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingTrips));

    await deleteTrip('trip_123');

    const calls = vi.mocked(AsyncStorage.setItem).mock.calls;
    const tripsCall = calls.find(call => call[0] === '@giglet/completed_trips');
    expect(tripsCall).toBeDefined();

    const savedTrips = JSON.parse(tripsCall![1]);
    expect(savedTrips).toHaveLength(1);
    expect(savedTrips[0].id).toBe('trip_456');
  });

  it('should recalculate stats after deletion', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const existingTrips = [
      {
        id: 'trip_123',
        startedAt: '2025-01-15T10:00:00.000Z',
        endedAt: '2025-01-15T11:00:00.000Z',
        miles: 10.0,
        startLat: 0,
        startLng: 0,
        endLat: 0,
        endLng: 0,
        pointCount: 0,
        isManual: true,
      },
    ];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingTrips));

    await deleteTrip('trip_123');

    const calls = vi.mocked(AsyncStorage.setItem).mock.calls;
    const statsCall = calls.find(call => call[0] === '@giglet/trip_stats');
    expect(statsCall).toBeDefined();
  });

  it('should handle deletion of non-existent trip gracefully', async () => {
    vi.setSystemTime(new Date(2025, 0, 15, 14, 0, 0));

    const existingTrips = [
      {
        id: 'trip_123',
        startedAt: '2025-01-15T10:00:00.000Z',
        endedAt: '2025-01-15T11:00:00.000Z',
        miles: 10.0,
        startLat: 0,
        startLng: 0,
        endLat: 0,
        endLng: 0,
        pointCount: 0,
        isManual: true,
      },
    ];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingTrips));

    // Should not throw
    await expect(deleteTrip('non_existent_trip')).resolves.not.toThrow();

    const calls = vi.mocked(AsyncStorage.setItem).mock.calls;
    const tripsCall = calls.find(call => call[0] === '@giglet/completed_trips');
    const savedTrips = JSON.parse(tripsCall![1]);

    // Original trip should still be there
    expect(savedTrips).toHaveLength(1);
    expect(savedTrips[0].id).toBe('trip_123');
  });
});
