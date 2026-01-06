/**
 * Tests for Earnings CSV Generator Service
 */

import { describe, it, expect } from 'vitest';
import {
  generateEarningsCSV,
  convertDeliveriesToExportRows,
  aggregateByPlatform,
  aggregateByMonth,
  calculateExportSummary,
  generateEarningsCSVFilename,
  type EarningsExportRow,
} from '../earningsCsvGenerator';
import type { Delivery } from '../../earnings';
import type { DateRange } from '../../../utils/dateRange';

describe('earningsCsvGenerator', () => {
  const mockDateRange: DateRange = {
    startDate: new Date(2025, 0, 1), // Jan 1, 2025
    endDate: new Date(2025, 11, 31), // Dec 31, 2025
    preset: 'this_year',
  };

  const createMockDelivery = (overrides: Partial<Delivery> = {}): Delivery => ({
    id: 'delivery_1',
    platform: 'DOORDASH',
    earnings: 15.5,
    tip: 5.0,
    basePay: 10.5,
    restaurantName: 'Test Restaurant',
    deliveredAt: '2025-01-15T12:00:00Z',
    ...overrides,
  });

  describe('generateEarningsCSV', () => {
    it('should generate CSV with correct column headers', () => {
      const deliveries: Delivery[] = [createMockDelivery()];

      const csv = generateEarningsCSV(deliveries, mockDateRange);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Date,Platform,Restaurant,Base Pay,Tip,Total');
    });

    it('should include all delivery data in correct columns', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          platform: 'DOORDASH',
          basePay: 8.5,
          tip: 4.0,
          earnings: 12.5,
          restaurantName: 'Chipotle',
          deliveredAt: '2025-01-15T10:00:00Z',
        }),
      ];

      const csv = generateEarningsCSV(deliveries, mockDateRange);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('2025-01-15');
      expect(lines[1]).toContain('DOORDASH');
      expect(lines[1]).toContain('Chipotle');
      expect(lines[1]).toContain('8.50');
      expect(lines[1]).toContain('4.00');
      expect(lines[1]).toContain('12.50');
    });

    it('should include platform subtotals', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({ platform: 'DOORDASH', earnings: 100 }),
        createMockDelivery({
          id: 'delivery_2',
          platform: 'UBEREATS',
          earnings: 75,
          deliveredAt: '2025-01-16T12:00:00Z',
        }),
      ];

      const csv = generateEarningsCSV(deliveries, mockDateRange);

      expect(csv).toContain('DOORDASH SUBTOTAL');
      expect(csv).toContain('$100.00');
      expect(csv).toContain('UBEREATS SUBTOTAL');
      expect(csv).toContain('$75.00');
    });

    it('should include grand total row', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({ earnings: 50 }),
        createMockDelivery({
          id: 'delivery_2',
          platform: 'UBEREATS',
          earnings: 30,
          deliveredAt: '2025-01-16T12:00:00Z',
        }),
      ];

      const csv = generateEarningsCSV(deliveries, mockDateRange);
      const lines = csv.split('\n');
      const lastLine = lines[lines.length - 1];

      expect(lastLine).toContain('TOTAL');
      expect(lastLine).toContain('$80.00');
    });

    it('should escape fields containing commas', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          restaurantName: "McDonald's, Times Square",
        }),
      ];

      const csv = generateEarningsCSV(deliveries, mockDateRange);

      expect(csv).toContain('"McDonald\'s, Times Square"');
    });

    it('should escape fields containing quotes', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          restaurantName: 'The "Best" Pizza',
        }),
      ];

      const csv = generateEarningsCSV(deliveries, mockDateRange);

      expect(csv).toContain('"The ""Best"" Pizza"');
    });

    it('should handle empty deliveries array', () => {
      const deliveries: Delivery[] = [];

      const csv = generateEarningsCSV(deliveries, mockDateRange);
      const lines = csv.split('\n');

      // Should have header and subtotals with $0
      expect(lines[0]).toContain('Date');
      expect(csv).toContain('DOORDASH SUBTOTAL,,,,,$0.00');
      expect(csv).toContain('UBEREATS SUBTOTAL,,,,,$0.00');
      expect(csv).toContain('TOTAL,,,,,$0.00');
    });

    it('should format amounts to 2 decimal places', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          basePay: 8.567,
          tip: 4.333,
          earnings: 12.9,
        }),
      ];

      const csv = generateEarningsCSV(deliveries, mockDateRange);

      expect(csv).toContain('8.57');
      expect(csv).toContain('4.33');
      expect(csv).toContain('12.90');
    });

    it('should sort deliveries by date', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          id: 'delivery_2',
          deliveredAt: '2025-01-20T12:00:00Z',
          restaurantName: 'Later',
        }),
        createMockDelivery({
          id: 'delivery_1',
          deliveredAt: '2025-01-10T12:00:00Z',
          restaurantName: 'Earlier',
        }),
      ];

      const csv = generateEarningsCSV(deliveries, mockDateRange);
      const lines = csv.split('\n');

      // Earlier date should come first
      expect(lines[1]).toContain('Earlier');
      expect(lines[2]).toContain('Later');
    });
  });

  describe('convertDeliveriesToExportRows', () => {
    it('should convert Delivery to EarningsExportRow format', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          platform: 'UBEREATS',
          basePay: 10.0,
          tip: 5.0,
          earnings: 15.0,
          restaurantName: 'Taco Bell',
          deliveredAt: '2025-03-15T14:30:00Z',
        }),
      ];

      const rows = convertDeliveriesToExportRows(deliveries);

      expect(rows).toHaveLength(1);
      expect(rows[0].date).toBe('2025-03-15');
      expect(rows[0].platform).toBe('UBEREATS');
      expect(rows[0].restaurantName).toBe('Taco Bell');
      expect(rows[0].basePay).toBe(10.0);
      expect(rows[0].tip).toBe(5.0);
      expect(rows[0].total).toBe(15.0);
    });

    it('should use "Unknown" when restaurant name is null', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          restaurantName: null,
        }),
      ];

      const rows = convertDeliveriesToExportRows(deliveries);

      expect(rows[0].restaurantName).toBe('Unknown');
    });
  });

  describe('aggregateByPlatform', () => {
    it('should sum earnings by platform', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({ platform: 'DOORDASH', earnings: 100 }),
        createMockDelivery({
          id: 'd2',
          platform: 'DOORDASH',
          earnings: 50,
          deliveredAt: '2025-01-16T12:00:00Z',
        }),
        createMockDelivery({
          id: 'd3',
          platform: 'UBEREATS',
          earnings: 75,
          deliveredAt: '2025-01-17T12:00:00Z',
        }),
      ];

      const breakdown = aggregateByPlatform(deliveries);

      expect(breakdown.doordash).toBe(150);
      expect(breakdown.ubereats).toBe(75);
      expect(breakdown.total).toBe(225);
    });

    it('should handle single platform only', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({ platform: 'DOORDASH', earnings: 100 }),
        createMockDelivery({
          id: 'd2',
          platform: 'DOORDASH',
          earnings: 200,
          deliveredAt: '2025-01-16T12:00:00Z',
        }),
      ];

      const breakdown = aggregateByPlatform(deliveries);

      expect(breakdown.doordash).toBe(300);
      expect(breakdown.ubereats).toBe(0);
      expect(breakdown.total).toBe(300);
    });

    it('should return zeros for empty array', () => {
      const breakdown = aggregateByPlatform([]);

      expect(breakdown.doordash).toBe(0);
      expect(breakdown.ubereats).toBe(0);
      expect(breakdown.total).toBe(0);
    });
  });

  describe('aggregateByMonth', () => {
    it('should group deliveries by month', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          platform: 'DOORDASH',
          earnings: 100,
          deliveredAt: '2025-01-15T12:00:00Z',
        }),
        createMockDelivery({
          id: 'd2',
          platform: 'UBEREATS',
          earnings: 50,
          deliveredAt: '2025-01-20T12:00:00Z',
        }),
        createMockDelivery({
          id: 'd3',
          platform: 'DOORDASH',
          earnings: 75,
          deliveredAt: '2025-02-10T12:00:00Z',
        }),
      ];

      const monthly = aggregateByMonth(deliveries);

      expect(monthly).toHaveLength(2);
      expect(monthly[0].month).toBe('2025-01');
      expect(monthly[0].doordash).toBe(100);
      expect(monthly[0].ubereats).toBe(50);
      expect(monthly[0].total).toBe(150);
      expect(monthly[1].month).toBe('2025-02');
      expect(monthly[1].doordash).toBe(75);
      expect(monthly[1].ubereats).toBe(0);
      expect(monthly[1].total).toBe(75);
    });

    it('should sort months chronologically', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          id: 'd1',
          deliveredAt: '2025-06-15T12:00:00Z',
          earnings: 50,
        }),
        createMockDelivery({
          id: 'd2',
          deliveredAt: '2025-03-15T12:00:00Z',
          earnings: 100,
        }),
        createMockDelivery({
          id: 'd3',
          deliveredAt: '2025-01-15T12:00:00Z',
          earnings: 75,
        }),
      ];

      const monthly = aggregateByMonth(deliveries);

      expect(monthly[0].month).toBe('2025-01');
      expect(monthly[1].month).toBe('2025-03');
      expect(monthly[2].month).toBe('2025-06');
    });

    it('should include month labels', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          deliveredAt: '2025-12-15T12:00:00Z',
          earnings: 100,
        }),
      ];

      const monthly = aggregateByMonth(deliveries);

      expect(monthly[0].monthLabel).toBe('December 2025');
    });

    it('should return empty array for no deliveries', () => {
      const monthly = aggregateByMonth([]);

      expect(monthly).toHaveLength(0);
    });
  });

  describe('calculateExportSummary', () => {
    it('should calculate complete summary', () => {
      const deliveries: Delivery[] = [
        createMockDelivery({
          platform: 'DOORDASH',
          earnings: 100,
          tip: 30,
          basePay: 70,
        }),
        createMockDelivery({
          id: 'd2',
          platform: 'UBEREATS',
          earnings: 50,
          tip: 15,
          basePay: 35,
          deliveredAt: '2025-02-15T12:00:00Z',
        }),
      ];

      const summary = calculateExportSummary(deliveries, mockDateRange);

      expect(summary.deliveryCount).toBe(2);
      expect(summary.totalEarnings).toBe(150);
      expect(summary.totalTips).toBe(45);
      expect(summary.totalBasePay).toBe(105);
      expect(summary.platformBreakdown.doordash).toBe(100);
      expect(summary.platformBreakdown.ubereats).toBe(50);
      expect(summary.monthlyBreakdown).toHaveLength(2);
    });

    it('should include date range in summary', () => {
      const deliveries: Delivery[] = [createMockDelivery()];

      const summary = calculateExportSummary(deliveries, mockDateRange);

      expect(summary.periodStart).toBe('2025-01-01');
      expect(summary.periodEnd).toBe('2025-12-31');
    });
  });

  describe('generateEarningsCSVFilename', () => {
    it('should generate filename with date range', () => {
      const dateRange: DateRange = {
        startDate: new Date(2025, 0, 1), // Jan 1, 2025
        endDate: new Date(2025, 11, 31), // Dec 31, 2025
        preset: 'this_year',
      };

      const filename = generateEarningsCSVFilename(dateRange);

      expect(filename).toBe('earnings-summary-20250101-20251231.csv');
    });

    it('should format dates without dashes', () => {
      const dateRange: DateRange = {
        startDate: new Date(2025, 5, 15), // Jun 15, 2025
        endDate: new Date(2025, 8, 30), // Sep 30, 2025
        preset: 'custom',
      };

      const filename = generateEarningsCSVFilename(dateRange);

      expect(filename).toBe('earnings-summary-20250615-20250930.csv');
    });
  });
});
