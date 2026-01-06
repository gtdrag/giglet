/**
 * Tests for date range utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPresetDateRange,
  formatDateShort,
  formatDateRange,
  formatDateISO,
  getPresetLabel,
  DATE_RANGE_PRESETS,
  type DateRangePreset,
} from '../dateRange';

describe('dateRange utilities', () => {
  // Mock the current date for consistent testing
  const mockDate = new Date('2025-06-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getPresetDateRange', () => {
    it('should return correct range for "this_year"', () => {
      const range = getPresetDateRange('this_year');

      expect(range.preset).toBe('this_year');
      expect(range.startDate.getFullYear()).toBe(2025);
      expect(range.startDate.getMonth()).toBe(0); // January
      expect(range.startDate.getDate()).toBe(1);
      expect(range.endDate.getFullYear()).toBe(2025);
      expect(range.endDate.getMonth()).toBe(11); // December
      expect(range.endDate.getDate()).toBe(31);
    });

    it('should return correct range for "last_year"', () => {
      const range = getPresetDateRange('last_year');

      expect(range.preset).toBe('last_year');
      expect(range.startDate.getFullYear()).toBe(2024);
      expect(range.startDate.getMonth()).toBe(0);
      expect(range.startDate.getDate()).toBe(1);
      expect(range.endDate.getFullYear()).toBe(2024);
      expect(range.endDate.getMonth()).toBe(11);
      expect(range.endDate.getDate()).toBe(31);
    });

    it('should return correct range for Q1', () => {
      const range = getPresetDateRange('q1');

      expect(range.preset).toBe('q1');
      expect(range.startDate.getFullYear()).toBe(2025);
      expect(range.startDate.getMonth()).toBe(0); // January
      expect(range.startDate.getDate()).toBe(1);
      expect(range.endDate.getMonth()).toBe(2); // March
      expect(range.endDate.getDate()).toBe(31);
    });

    it('should return correct range for Q2', () => {
      const range = getPresetDateRange('q2');

      expect(range.preset).toBe('q2');
      expect(range.startDate.getMonth()).toBe(3); // April
      expect(range.startDate.getDate()).toBe(1);
      expect(range.endDate.getMonth()).toBe(5); // June
      expect(range.endDate.getDate()).toBe(30);
    });

    it('should return correct range for Q3', () => {
      const range = getPresetDateRange('q3');

      expect(range.preset).toBe('q3');
      expect(range.startDate.getMonth()).toBe(6); // July
      expect(range.startDate.getDate()).toBe(1);
      expect(range.endDate.getMonth()).toBe(8); // September
      expect(range.endDate.getDate()).toBe(30);
    });

    it('should return correct range for Q4', () => {
      const range = getPresetDateRange('q4');

      expect(range.preset).toBe('q4');
      expect(range.startDate.getMonth()).toBe(9); // October
      expect(range.startDate.getDate()).toBe(1);
      expect(range.endDate.getMonth()).toBe(11); // December
      expect(range.endDate.getDate()).toBe(31);
    });

    it('should return correct range for "this_month"', () => {
      const range = getPresetDateRange('this_month');

      expect(range.preset).toBe('this_month');
      expect(range.startDate.getFullYear()).toBe(2025);
      expect(range.startDate.getMonth()).toBe(5); // June
      expect(range.startDate.getDate()).toBe(1);
      expect(range.endDate.getMonth()).toBe(5); // June
      expect(range.endDate.getDate()).toBe(30); // June has 30 days
    });

    it('should return default range for "custom"', () => {
      const range = getPresetDateRange('custom');

      expect(range.preset).toBe('custom');
      expect(range.startDate.getFullYear()).toBe(2025);
      expect(range.startDate.getMonth()).toBe(0); // January 1
    });
  });

  describe('formatDateShort', () => {
    it('should format date as "Month Day, Year"', () => {
      // Use explicit local date to avoid timezone issues
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      const formatted = formatDateShort(date);

      expect(formatted).toMatch(/Jan 15, 2025/);
    });

    it('should handle different months correctly', () => {
      // Use explicit local date to avoid timezone issues
      const december = new Date(2025, 11, 25); // Month is 0-indexed
      const formatted = formatDateShort(december);

      expect(formatted).toMatch(/Dec 25, 2025/);
    });
  });

  describe('formatDateRange', () => {
    it('should format date range with dash separator', () => {
      // Use explicit local dates to avoid timezone issues
      const range = {
        startDate: new Date(2025, 0, 1), // Jan 1, 2025
        endDate: new Date(2025, 11, 31), // Dec 31, 2025
        preset: 'this_year' as DateRangePreset,
      };

      const formatted = formatDateRange(range);

      expect(formatted).toMatch(/Jan 1, 2025/);
      expect(formatted).toMatch(/Dec 31, 2025/);
      expect(formatted).toContain(' - ');
    });
  });

  describe('formatDateISO', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2025-06-15T10:30:00Z');
      const formatted = formatDateISO(date);

      expect(formatted).toBe('2025-06-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2025-01-05T10:30:00Z');
      const formatted = formatDateISO(date);

      expect(formatted).toBe('2025-01-05');
    });
  });

  describe('getPresetLabel', () => {
    it('should return correct label for this_year', () => {
      const label = getPresetLabel('this_year');
      expect(label).toBe('This Year (2025)');
    });

    it('should return correct label for last_year', () => {
      const label = getPresetLabel('last_year');
      expect(label).toBe('Last Year (2024)');
    });

    it('should return correct label for quarters', () => {
      expect(getPresetLabel('q1')).toBe('Q1 2025');
      expect(getPresetLabel('q2')).toBe('Q2 2025');
      expect(getPresetLabel('q3')).toBe('Q3 2025');
      expect(getPresetLabel('q4')).toBe('Q4 2025');
    });

    it('should return correct label for this_month', () => {
      const label = getPresetLabel('this_month');
      expect(label).toMatch(/This Month \(June\)/);
    });

    it('should return correct label for custom', () => {
      const label = getPresetLabel('custom');
      expect(label).toBe('Custom Range');
    });
  });

  describe('DATE_RANGE_PRESETS', () => {
    it('should contain all expected presets', () => {
      expect(DATE_RANGE_PRESETS).toContain('this_year');
      expect(DATE_RANGE_PRESETS).toContain('last_year');
      expect(DATE_RANGE_PRESETS).toContain('q1');
      expect(DATE_RANGE_PRESETS).toContain('q2');
      expect(DATE_RANGE_PRESETS).toContain('q3');
      expect(DATE_RANGE_PRESETS).toContain('q4');
      expect(DATE_RANGE_PRESETS).toContain('this_month');
      expect(DATE_RANGE_PRESETS).toContain('custom');
    });

    it('should have 8 presets', () => {
      expect(DATE_RANGE_PRESETS).toHaveLength(8);
    });
  });
});
