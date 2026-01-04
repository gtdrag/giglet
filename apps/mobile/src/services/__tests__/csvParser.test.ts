/**
 * Unit tests for CSV Parser Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCSV, detectPlatform, type Platform, CSVParseError } from '../csvParser';
import * as FileSystem from 'expo-file-system';

// Mock expo-file-system
vi.mock('expo-file-system', () => ({
  readAsStringAsync: vi.fn(),
}));

const mockReadAsStringAsync = vi.mocked(FileSystem.readAsStringAsync);

describe('CSV Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseCSV - DoorDash format', () => {
    it('should parse a valid DoorDash CSV with standard columns', async () => {
      const csvContent = `Date,Subtotal,Tip,Total,Restaurant,Order ID
01/15/2025,$7.50,$3.00,$10.50,Pizza Hut,DD-123
01/16/2025,$8.00,$4.50,$12.50,Taco Bell,DD-124
01/17/2025,$6.25,$2.75,$9.00,McDonalds,DD-125`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.deliveryCount).toBe(3);
      expect(result.estimatedTotal).toBeCloseTo(32.0, 2);
      expect(result.dateRange.start).toContain('Jan');
      expect(result.dateRange.end).toContain('Jan');
      expect(result.sampleDeliveries.length).toBeLessThanOrEqual(5);
    });

    it('should parse DoorDash CSV with Dasher Pay column', async () => {
      const csvContent = `Date,Dasher Pay,Tip,Total,Merchant
2025-01-15,$5.00,$3.00,$8.00,Starbucks`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.deliveryCount).toBe(1);
      expect(result.sampleDeliveries[0].basePay).toBe(5.0);
      expect(result.sampleDeliveries[0].tip).toBe(3.0);
      expect(result.sampleDeliveries[0].earnings).toBe(8.0);
      expect(result.sampleDeliveries[0].restaurantName).toBe('Starbucks');
    });

    it('should handle quoted fields with commas', async () => {
      const csvContent = `Date,Subtotal,Tip,Total,Restaurant,Order ID
01/15/2025,$7.50,$3.00,$10.50,"Pizza Hut, Inc.",DD-123`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.deliveryCount).toBe(1);
      expect(result.sampleDeliveries[0].restaurantName).toBe('Pizza Hut, Inc.');
    });

    it('should calculate total from base pay + tip if total is missing', async () => {
      const csvContent = `Date,Subtotal,Tip,Restaurant
01/15/2025,$7.50,$3.00,Pizza Hut`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.deliveryCount).toBe(1);
      expect(result.sampleDeliveries[0].earnings).toBe(10.5);
    });
  });

  describe('parseCSV - Uber Eats format', () => {
    it('should parse a valid Uber Eats CSV with standard columns', async () => {
      const csvContent = `Trip Date,Fare,Tip,Total,Restaurant,Trip ID
2025-01-20,$6.00,$4.00,$10.00,Chipotle,UE-001
2025-01-21,$7.50,$3.50,$11.00,Panera,UE-002`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'UBEREATS');

      expect(result.deliveryCount).toBe(2);
      expect(result.estimatedTotal).toBeCloseTo(21.0, 2);
      expect(result.sampleDeliveries[0].platform).toBe('UBEREATS');
    });

    it('should parse Uber Eats CSV with You Receive column', async () => {
      const csvContent = `Trip Date,Base Fare,Tips,You Receive,Pickup Location,UUID
01/20/2025,$5.50,$3.00,$8.50,Subway,uber-123`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'UBEREATS');

      expect(result.deliveryCount).toBe(1);
      expect(result.sampleDeliveries[0].earnings).toBe(8.5);
    });
  });

  describe('parseCSV - Date parsing', () => {
    it('should parse US date format (MM/DD/YYYY)', async () => {
      const csvContent = `Date,Total,Restaurant
01/25/2025,$10.00,Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].deliveredAt.getMonth()).toBe(0); // January = 0
      expect(result.sampleDeliveries[0].deliveredAt.getDate()).toBe(25);
      expect(result.sampleDeliveries[0].deliveredAt.getFullYear()).toBe(2025);
    });

    it('should parse ISO date format (YYYY-MM-DD)', async () => {
      const csvContent = `Date,Total,Restaurant
2025-03-15,$10.00,Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].deliveredAt.getMonth()).toBe(2); // March = 2
      expect(result.sampleDeliveries[0].deliveredAt.getDate()).toBe(15);
    });

    it('should parse short year format (MM/DD/YY)', async () => {
      const csvContent = `Date,Total,Restaurant
06/15/25,$10.00,Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].deliveredAt.getFullYear()).toBe(2025);
    });
  });

  describe('parseCSV - Currency parsing', () => {
    it('should parse amounts with dollar signs', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,$15.99,Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].earnings).toBe(15.99);
    });

    it('should parse amounts without currency symbols', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,15.99,Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].earnings).toBe(15.99);
    });

    it('should parse amounts with commas (thousands separator)', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,"$1,234.56",Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].earnings).toBe(1234.56);
    });

    it('should handle empty tip values', async () => {
      const csvContent = `Date,Subtotal,Tip,Total,Restaurant
01/15/2025,$10.00,,$10.00,Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].tip).toBe(0);
    });
  });

  describe('parseCSV - Error handling', () => {
    it('should throw CSVParseError for empty file', async () => {
      mockReadAsStringAsync.mockResolvedValue('');

      await expect(parseCSV('file://empty.csv', 'DOORDASH')).rejects.toThrow(CSVParseError);
      await expect(parseCSV('file://empty.csv', 'DOORDASH')).rejects.toThrow('empty');
    });

    it('should throw CSVParseError for file with only headers', async () => {
      mockReadAsStringAsync.mockResolvedValue('Date,Total,Restaurant');

      await expect(parseCSV('file://headers-only.csv', 'DOORDASH')).rejects.toThrow(CSVParseError);
      await expect(parseCSV('file://headers-only.csv', 'DOORDASH')).rejects.toThrow(
        'does not contain any data'
      );
    });

    it('should throw CSVParseError when date column is missing', async () => {
      const csvContent = `Total,Restaurant
$10.00,Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      await expect(parseCSV('file://no-date.csv', 'DOORDASH')).rejects.toThrow(CSVParseError);
      await expect(parseCSV('file://no-date.csv', 'DOORDASH')).rejects.toThrow('date column');
    });

    it('should throw CSVParseError when earnings columns are missing', async () => {
      const csvContent = `Date,Restaurant
01/15/2025,Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      await expect(parseCSV('file://no-earnings.csv', 'DOORDASH')).rejects.toThrow(CSVParseError);
      await expect(parseCSV('file://no-earnings.csv', 'DOORDASH')).rejects.toThrow('earnings');
    });

    it('should throw CSVParseError when file read fails', async () => {
      mockReadAsStringAsync.mockRejectedValue(new Error('File not found'));

      await expect(parseCSV('file://invalid.csv', 'DOORDASH')).rejects.toThrow(CSVParseError);
      await expect(parseCSV('file://invalid.csv', 'DOORDASH')).rejects.toThrow('Unable to read');
    });

    it('should skip rows with zero earnings', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,$0.00,Cancelled
01/16/2025,$10.00,Completed`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.deliveryCount).toBe(1);
      expect(result.sampleDeliveries[0].restaurantName).toBe('Completed');
    });

    it('should skip empty rows', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,$10.00,Test

01/16/2025,$12.00,Test2`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.deliveryCount).toBe(2);
    });
  });

  describe('parseCSV - Preview calculation', () => {
    it('should calculate correct date range', async () => {
      const csvContent = `Date,Total,Restaurant
01/10/2025,$8.00,First
01/25/2025,$12.00,Last
01/15/2025,$10.00,Middle`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.dateRange.start).toContain('Jan 10');
      expect(result.dateRange.end).toContain('Jan 25');
    });

    it('should calculate total earnings correctly', async () => {
      const csvContent = `Date,Total,Restaurant
01/10/2025,$8.50,A
01/11/2025,$12.75,B
01/12/2025,$9.25,C`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.estimatedTotal).toBeCloseTo(30.5, 2);
    });

    it('should limit sample deliveries to 5', async () => {
      const rows = Array.from(
        { length: 10 },
        (_, i) => `01/${String(i + 1).padStart(2, '0')}/2025,$10.00,Restaurant${i + 1}`
      );
      const csvContent = `Date,Total,Restaurant\n${rows.join('\n')}`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.deliveryCount).toBe(10);
      expect(result.sampleDeliveries.length).toBe(5);
    });

    it('should sort deliveries by date descending (newest first)', async () => {
      const csvContent = `Date,Total,Restaurant
01/05/2025,$8.00,Old
01/25/2025,$12.00,New
01/15/2025,$10.00,Middle`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].restaurantName).toBe('New');
      expect(result.sampleDeliveries[1].restaurantName).toBe('Middle');
      expect(result.sampleDeliveries[2].restaurantName).toBe('Old');
    });
  });

  describe('parseCSV - External ID generation', () => {
    it('should use Order ID from CSV if available', async () => {
      const csvContent = `Date,Total,Restaurant,Order ID
01/15/2025,$10.00,Test,DD-12345`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].externalId).toBe('DD-12345');
    });

    it('should generate ID if not in CSV', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,$10.00,Test`;

      mockReadAsStringAsync.mockResolvedValue(csvContent);

      const result = await parseCSV('file://test.csv', 'DOORDASH');

      expect(result.sampleDeliveries[0].externalId).toContain('DOORDASH');
      expect(result.sampleDeliveries[0].externalId).toContain('10.00');
    });
  });

  describe('detectPlatform', () => {
    it('should detect DoorDash from headers', () => {
      const headers = ['Date', 'Subtotal', 'Tip', 'Total', 'Order ID'];
      expect(detectPlatform(headers)).toBe('DOORDASH');
    });

    it('should detect DoorDash from Dasher-specific headers', () => {
      const headers = ['Date', 'Dasher Pay', 'Tip', 'Total'];
      expect(detectPlatform(headers)).toBe('DOORDASH');
    });

    it('should detect Uber Eats from headers', () => {
      const headers = ['Trip Date', 'Fare', 'Tip', 'Total', 'Trip ID'];
      expect(detectPlatform(headers)).toBe('UBEREATS');
    });

    it('should detect Uber Eats from "You Receive" header', () => {
      const headers = ['Date', 'Fare', 'Tip', 'You Receive'];
      expect(detectPlatform(headers)).toBe('UBEREATS');
    });

    it('should return null for ambiguous headers', () => {
      const headers = ['Date', 'Amount', 'Description'];
      expect(detectPlatform(headers)).toBeNull();
    });
  });
});
