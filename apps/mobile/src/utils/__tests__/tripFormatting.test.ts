/**
 * Unit tests for trip formatting utility functions
 */

import { describe, it, expect } from 'vitest';
import { formatTripDate, formatTripTime, formatTimeRange } from '../tripFormatting';

describe('Trip Formatting Functions', () => {
  describe('formatTripDate', () => {
    it('should format date as short weekday, month, and day', () => {
      // Monday, January 6, 2025
      const dateStr = '2025-01-06T14:30:00.000Z';
      const result = formatTripDate(dateStr);
      // Result depends on local timezone, but should contain expected parts
      expect(result).toMatch(/Mon|Tue/); // Could be Mon or Tue depending on timezone
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/6/);
    });

    it('should handle different months correctly', () => {
      const dateStr = '2025-06-15T10:00:00.000Z';
      const result = formatTripDate(dateStr);
      expect(result).toMatch(/Jun/);
      expect(result).toMatch(/15/);
    });

    it('should format end of month dates', () => {
      const dateStr = '2025-12-31T23:59:00.000Z';
      const result = formatTripDate(dateStr);
      expect(result).toMatch(/Dec|Jan/); // Could cross into new year in some timezones
      expect(result).toMatch(/31|1/);
    });
  });

  describe('formatTripTime', () => {
    it('should format afternoon time with PM', () => {
      // Create a local date at 2:30 PM
      const date = new Date(2025, 0, 6, 14, 30, 0);
      const result = formatTripTime(date.toISOString());
      expect(result).toMatch(/2:30/);
      expect(result).toMatch(/PM/);
    });

    it('should format morning time with AM', () => {
      // Create a local date at 9:15 AM
      const date = new Date(2025, 0, 6, 9, 15, 0);
      const result = formatTripTime(date.toISOString());
      expect(result).toMatch(/9:15/);
      expect(result).toMatch(/AM/);
    });

    it('should format noon correctly', () => {
      // Create a local date at 12:00 PM
      const date = new Date(2025, 0, 6, 12, 0, 0);
      const result = formatTripTime(date.toISOString());
      expect(result).toMatch(/12:00/);
      expect(result).toMatch(/PM/);
    });

    it('should format midnight correctly', () => {
      // Create a local date at 12:00 AM
      const date = new Date(2025, 0, 6, 0, 0, 0);
      const result = formatTripTime(date.toISOString());
      expect(result).toMatch(/12:00/);
      expect(result).toMatch(/AM/);
    });
  });

  describe('formatTimeRange', () => {
    it('should format time range with start and end times', () => {
      const startDate = new Date(2025, 0, 6, 14, 30, 0);
      const endDate = new Date(2025, 0, 6, 15, 45, 0);
      const result = formatTimeRange(startDate.toISOString(), endDate.toISOString());

      expect(result).toContain(' - ');
      expect(result).toMatch(/2:30.*PM/);
      expect(result).toMatch(/3:45.*PM/);
    });

    it('should handle AM to PM transition', () => {
      const startDate = new Date(2025, 0, 6, 11, 30, 0);
      const endDate = new Date(2025, 0, 6, 13, 15, 0);
      const result = formatTimeRange(startDate.toISOString(), endDate.toISOString());

      expect(result).toContain(' - ');
      expect(result).toMatch(/AM/);
      expect(result).toMatch(/PM/);
    });

    it('should handle same hour trips', () => {
      const startDate = new Date(2025, 0, 6, 14, 0, 0);
      const endDate = new Date(2025, 0, 6, 14, 45, 0);
      const result = formatTimeRange(startDate.toISOString(), endDate.toISOString());

      expect(result).toContain(' - ');
      expect(result).toMatch(/2:00.*PM/);
      expect(result).toMatch(/2:45.*PM/);
    });
  });
});
