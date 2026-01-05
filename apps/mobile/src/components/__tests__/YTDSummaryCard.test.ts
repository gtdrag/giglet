/**
 * Unit tests for YTD Summary Card functionality
 * Story 7-4: YTD Tax Deduction Display
 *
 * Tests verify:
 * - AC 7.4.2: YTD calculation resets at year boundary
 * - AC 7.4.4: Deduction calculation uses correct IRS rate
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  IRS_MILEAGE_RATE,
  calculateTaxDeduction,
  formatTaxDeduction,
} from '../../constants/tax';
import { calculateTripStats, getDateRanges } from '../../utils/locationStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    multiRemove: vi.fn(),
  },
}));

describe('YTD Tax Deduction Display - Story 7-4', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('AC 7.4.2: YTD calculation resets at year boundary', () => {
    it('should only include trips from the current year in yearMiles', async () => {
      // Set current date to Jan 15, 2025
      vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0));

      const trips = [
        // Current year trips - should be included
        { id: '1', startedAt: '2025-01-10T10:00:00.000Z', miles: 50.0 },
        { id: '2', startedAt: '2025-01-05T14:00:00.000Z', miles: 30.0 },
        // Previous year trips - should NOT be included
        { id: '3', startedAt: '2024-12-31T23:59:00.000Z', miles: 100.0 },
        { id: '4', startedAt: '2024-06-15T10:00:00.000Z', miles: 200.0 },
      ];

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

      const stats = await calculateTripStats();

      // Only 2025 trips should be counted
      expect(stats.yearMiles).toBe(80.0); // 50 + 30
      expect(stats.yearTrips).toBe(2);
    });

    it('should return zero yearMiles when all trips are from previous year', async () => {
      // Set current date to Jan 2, 2025
      vi.setSystemTime(new Date(2025, 0, 2, 10, 0, 0));

      const trips = [
        // All trips from 2024
        { id: '1', startedAt: '2024-12-28T10:00:00.000Z', miles: 25.0 },
        { id: '2', startedAt: '2024-11-15T14:00:00.000Z', miles: 50.0 },
      ];

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

      const stats = await calculateTripStats();

      // No trips from 2025, so yearMiles should be 0
      expect(stats.yearMiles).toBe(0);
      expect(stats.yearTrips).toBe(0);
    });

    it('should include trip exactly at Jan 1 midnight in current year', async () => {
      // Set current date to Jan 15, 2025
      vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0));

      // Create trip at exactly midnight Jan 1, 2025 (local time)
      const jan1Midnight = new Date(2025, 0, 1, 0, 0, 0);

      const trips = [
        { id: '1', startedAt: jan1Midnight.toISOString(), miles: 10.0 },
      ];

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

      const stats = await calculateTripStats();

      // Trip at midnight Jan 1 should be included
      expect(stats.yearMiles).toBe(10.0);
      expect(stats.yearTrips).toBe(1);
    });

    it('should verify year start date is January 1st', () => {
      // Set to mid-year date
      vi.setSystemTime(new Date(2025, 6, 15, 12, 0, 0)); // July 15, 2025

      const { yearStart } = getDateRanges();

      expect(yearStart.getFullYear()).toBe(2025);
      expect(yearStart.getMonth()).toBe(0); // January
      expect(yearStart.getDate()).toBe(1);
      expect(yearStart.getHours()).toBe(0);
      expect(yearStart.getMinutes()).toBe(0);
    });
  });

  describe('AC 7.4.4: Deduction calculation uses correct IRS rate', () => {
    it('should use $0.67 per mile IRS rate for 2024', () => {
      expect(IRS_MILEAGE_RATE).toBe(0.67);
    });

    it('should calculate correct deduction for YTD miles', () => {
      // Simulate 150 YTD miles
      const yearMiles = 150;
      const expectedDeduction = yearMiles * 0.67; // $100.50

      const deduction = calculateTaxDeduction(yearMiles);

      expect(deduction).toBe(expectedDeduction);
      expect(deduction).toBe(100.5);
    });

    it('should format deduction correctly as currency', () => {
      // 150 miles * $0.67 = $100.50
      const yearMiles = 150;
      const formatted = formatTaxDeduction(yearMiles);

      expect(formatted).toBe('$100.50');
    });

    it('should handle zero miles correctly', () => {
      const deduction = calculateTaxDeduction(0);
      const formatted = formatTaxDeduction(0);

      expect(deduction).toBe(0);
      expect(formatted).toBe('$0.00');
    });

    it('should handle decimal miles with proper rounding', () => {
      // 10.5 miles * $0.67 = $7.035 -> $7.04 (rounded)
      const yearMiles = 10.5;
      const formatted = formatTaxDeduction(yearMiles);

      expect(formatted).toBe('$7.04');
    });

    it('should calculate realistic YTD scenario correctly', async () => {
      // Simulate a gig worker with accumulated miles
      vi.setSystemTime(new Date(2025, 11, 31, 12, 0, 0)); // End of year

      // Create trips totaling 5000 miles for the year
      const trips = Array.from({ length: 50 }, (_, i) => ({
        id: `trip_${i}`,
        startedAt: new Date(2025, Math.floor(i / 5), (i % 28) + 1, 10, 0, 0).toISOString(),
        miles: 100.0, // 100 miles per trip * 50 trips = 5000 miles
      }));

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

      const stats = await calculateTripStats();
      const deduction = calculateTaxDeduction(stats.yearMiles);
      const formatted = formatTaxDeduction(stats.yearMiles);

      expect(stats.yearMiles).toBe(5000);
      expect(deduction).toBe(3350); // 5000 * $0.67
      expect(formatted).toBe('$3350.00');
    });
  });

  describe('Integration: YTD Summary Card data flow', () => {
    it('should provide correct values for YTDSummaryCard props', async () => {
      vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0));

      const trips = [
        { id: '1', startedAt: '2025-01-15T10:00:00.000Z', miles: 25.5 },
        { id: '2', startedAt: '2025-01-10T14:00:00.000Z', miles: 30.0 },
        { id: '3', startedAt: '2025-01-05T09:00:00.000Z', miles: 44.5 },
      ];

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(trips));

      const stats = await calculateTripStats();

      // These are the values that would be passed to YTDSummaryCard
      const yearMiles = stats.yearMiles;
      const yearTrips = stats.yearTrips;
      const estimatedDeduction = formatTaxDeduction(yearMiles);

      expect(yearMiles).toBe(100.0); // 25.5 + 30 + 44.5
      expect(yearTrips).toBe(3);
      expect(estimatedDeduction).toBe('$67.00'); // 100 * $0.67
    });
  });
});
