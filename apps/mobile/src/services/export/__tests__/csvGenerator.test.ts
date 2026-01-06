/**
 * Tests for CSV Generator Service
 */

import { describe, it, expect } from 'vitest';
import {
  generateMileageCSV,
  convertTripsToExportRows,
  generateCSVFilename,
  type MileageExportRow,
} from '../csvGenerator';
import type { CompletedTrip } from '../../locationTracking';
import type { DateRange } from '../../../utils/dateRange';

describe('csvGenerator', () => {
  const mockDateRange: DateRange = {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    preset: 'this_year',
  };

  describe('generateMileageCSV', () => {
    it('should generate CSV with correct column headers', () => {
      const trips: MileageExportRow[] = [
        {
          date: '2025-01-15',
          businessPurpose: 'Delivery driving',
          startLocation: '123 Main St, Los Angeles, CA',
          endLocation: '456 Oak Ave, Los Angeles, CA',
          miles: 8.5,
        },
      ];

      const csv = generateMileageCSV(trips, mockDateRange);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Date,Business Purpose,Start Location,End Location,Miles');
    });

    it('should include all trip data in correct columns', () => {
      const trips: MileageExportRow[] = [
        {
          date: '2025-01-15',
          businessPurpose: 'Delivery driving',
          startLocation: '123 Main St',
          endLocation: '456 Oak Ave',
          miles: 8.5,
        },
      ];

      const csv = generateMileageCSV(trips, mockDateRange);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('2025-01-15');
      expect(lines[1]).toContain('Delivery driving');
      expect(lines[1]).toContain('123 Main St');
      expect(lines[1]).toContain('456 Oak Ave');
      expect(lines[1]).toContain('8.5');
    });

    it('should include totals row at bottom', () => {
      const trips: MileageExportRow[] = [
        {
          date: '2025-01-15',
          businessPurpose: 'Delivery driving',
          startLocation: 'Start A',
          endLocation: 'End A',
          miles: 10.0,
        },
        {
          date: '2025-01-16',
          businessPurpose: 'Delivery driving',
          startLocation: 'Start B',
          endLocation: 'End B',
          miles: 15.5,
        },
      ];

      const csv = generateMileageCSV(trips, mockDateRange);
      const lines = csv.split('\n');
      const lastLine = lines[lines.length - 1];

      expect(lastLine).toContain('TOTAL');
      expect(lastLine).toContain('25.5'); // 10.0 + 15.5
    });

    it('should escape fields containing commas', () => {
      const trips: MileageExportRow[] = [
        {
          date: '2025-01-15',
          businessPurpose: 'Delivery driving',
          startLocation: '123 Main St, Suite 100, Los Angeles, CA',
          endLocation: '456 Oak Ave',
          miles: 8.5,
        },
      ];

      const csv = generateMileageCSV(trips, mockDateRange);
      const lines = csv.split('\n');

      // Field with commas should be wrapped in quotes
      expect(lines[1]).toContain('"123 Main St, Suite 100, Los Angeles, CA"');
    });

    it('should escape fields containing quotes', () => {
      const trips: MileageExportRow[] = [
        {
          date: '2025-01-15',
          businessPurpose: 'Delivery for "Premium" customer',
          startLocation: 'Start',
          endLocation: 'End',
          miles: 5.0,
        },
      ];

      const csv = generateMileageCSV(trips, mockDateRange);
      const lines = csv.split('\n');

      // Quotes should be escaped by doubling
      expect(lines[1]).toContain('""Premium""');
    });

    it('should handle empty trips array', () => {
      const trips: MileageExportRow[] = [];

      const csv = generateMileageCSV(trips, mockDateRange);
      const lines = csv.split('\n');

      // Should have header and totals row
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain('Date');
      expect(lines[1]).toContain('TOTAL');
      expect(lines[1]).toContain('0.0');
    });

    it('should format miles to one decimal place', () => {
      const trips: MileageExportRow[] = [
        {
          date: '2025-01-15',
          businessPurpose: 'Delivery driving',
          startLocation: 'Start',
          endLocation: 'End',
          miles: 8.567,
        },
      ];

      const csv = generateMileageCSV(trips, mockDateRange);

      expect(csv).toContain('8.6'); // Rounded to 1 decimal
    });
  });

  describe('convertTripsToExportRows', () => {
    it('should convert CompletedTrip to MileageExportRow format', () => {
      const trips: CompletedTrip[] = [
        {
          id: 'trip_1',
          startedAt: '2025-01-15T10:00:00Z',
          endedAt: '2025-01-15T10:30:00Z',
          miles: 12.5,
          startLat: 34.0522,
          startLng: -118.2437,
          endLat: 34.0622,
          endLng: -118.2537,
          pointCount: 50,
          isManual: false,
        },
      ];

      const locations = new Map<string, { start: string; end: string }>();
      locations.set('trip_1', {
        start: '123 Main St, LA',
        end: '456 Oak Ave, LA',
      });

      const rows = convertTripsToExportRows(trips, locations);

      expect(rows).toHaveLength(1);
      expect(rows[0].date).toBe('2025-01-15');
      expect(rows[0].businessPurpose).toBe('Delivery driving');
      expect(rows[0].startLocation).toBe('123 Main St, LA');
      expect(rows[0].endLocation).toBe('456 Oak Ave, LA');
      expect(rows[0].miles).toBe(12.5);
    });

    it('should use "Unknown location" when address not in map', () => {
      const trips: CompletedTrip[] = [
        {
          id: 'trip_1',
          startedAt: '2025-01-15T10:00:00Z',
          endedAt: '2025-01-15T10:30:00Z',
          miles: 12.5,
          startLat: 34.0522,
          startLng: -118.2437,
          endLat: 34.0622,
          endLng: -118.2537,
          pointCount: 50,
          isManual: false,
        },
      ];

      const locations = new Map<string, { start: string; end: string }>();
      // Not setting locations for trip_1

      const rows = convertTripsToExportRows(trips, locations);

      expect(rows[0].startLocation).toBe('Unknown location');
      expect(rows[0].endLocation).toBe('Unknown location');
    });
  });

  describe('generateCSVFilename', () => {
    it('should generate filename with date range', () => {
      const dateRange: DateRange = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        preset: 'this_year',
      };

      const filename = generateCSVFilename(dateRange);

      expect(filename).toBe('mileage-log-20250101-20251231.csv');
    });

    it('should format dates without dashes', () => {
      const dateRange: DateRange = {
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-09-30'),
        preset: 'custom',
      };

      const filename = generateCSVFilename(dateRange);

      expect(filename).toBe('mileage-log-20250615-20250930.csv');
    });
  });
});
