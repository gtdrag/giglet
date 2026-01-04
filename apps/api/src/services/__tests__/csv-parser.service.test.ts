/**
 * Unit tests for CSV Parser Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { csvParserService } from '../csv-parser.service';
import { Platform } from '@prisma/client';

describe('CSV Parser Service', () => {
  describe('parseCSV - DoorDash format', () => {
    it('should parse a valid DoorDash CSV with standard columns', async () => {
      const csvContent = `Date,Subtotal,Tip,Total,Restaurant,Order ID
01/15/2025,$7.50,$3.00,$10.50,Pizza Hut,DD-123
01/16/2025,$8.00,$4.50,$12.50,Taco Bell,DD-124
01/17/2025,$6.25,$2.75,$9.00,McDonalds,DD-125`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries.length).toBe(3);
      expect(result.totalEarnings).toBeCloseTo(32.0, 2);
      expect(result.platform).toBe('DOORDASH');
      expect(result.skippedRows.length).toBe(0);
    });

    it('should parse DoorDash CSV with Dasher Pay column', async () => {
      const csvContent = `Date,Dasher Pay,Tip,Total,Merchant
2025-01-15,$5.00,$3.00,$8.00,Starbucks`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries.length).toBe(1);
      expect(result.deliveries[0].basePay).toBe(5.0);
      expect(result.deliveries[0].tip).toBe(3.0);
      expect(result.deliveries[0].earnings).toBe(8.0);
      expect(result.deliveries[0].restaurantName).toBe('Starbucks');
    });

    it('should handle quoted fields with commas', async () => {
      const csvContent = `Date,Subtotal,Tip,Total,Restaurant,Order ID
01/15/2025,$7.50,$3.00,$10.50,"Pizza Hut, Inc.",DD-123`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries.length).toBe(1);
      expect(result.deliveries[0].restaurantName).toBe('Pizza Hut, Inc.');
    });

    it('should calculate total from base pay + tip if total is missing', async () => {
      const csvContent = `Date,Subtotal,Tip,Restaurant
01/15/2025,$7.50,$3.00,Pizza Hut`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries.length).toBe(1);
      expect(result.deliveries[0].earnings).toBe(10.5);
    });

    it('should use Order ID as externalId when present', async () => {
      const csvContent = `Date,Total,Restaurant,Order ID
01/15/2025,$10.00,Test,DD-12345`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].externalId).toBe('DD-12345');
    });

    it('should generate externalId if not in CSV', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,$10.00,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].externalId).toHaveLength(32);
    });
  });

  describe('parseCSV - Uber Eats format', () => {
    it('should parse a valid Uber Eats CSV with standard columns', async () => {
      const csvContent = `Trip Date,Fare,Tip,Total,Restaurant,Trip ID
2025-01-20,$6.00,$4.00,$10.00,Chipotle,UE-001
2025-01-21,$7.50,$3.50,$11.00,Panera,UE-002`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'UBEREATS');

      expect(result.deliveries.length).toBe(2);
      expect(result.totalEarnings).toBeCloseTo(21.0, 2);
      expect(result.platform).toBe('UBEREATS');
    });

    it('should parse Uber Eats CSV with You Receive column', async () => {
      const csvContent = `Trip Date,Base Fare,Tips,You Receive,Pickup Location,UUID
01/20/2025,$5.50,$3.00,$8.50,Subway,uber-123`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'UBEREATS');

      expect(result.deliveries.length).toBe(1);
      expect(result.deliveries[0].earnings).toBe(8.5);
    });
  });

  describe('parseCSV - Date parsing', () => {
    it('should parse US date format (MM/DD/YYYY)', async () => {
      const csvContent = `Date,Total,Restaurant
01/25/2025,$10.00,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].deliveredAt.getMonth()).toBe(0); // January = 0
      expect(result.deliveries[0].deliveredAt.getDate()).toBe(25);
      expect(result.deliveries[0].deliveredAt.getFullYear()).toBe(2025);
    });

    it('should parse ISO date format (YYYY-MM-DD)', async () => {
      const csvContent = `Date,Total,Restaurant
2025-03-15,$10.00,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].deliveredAt.getMonth()).toBe(2); // March = 2
      expect(result.deliveries[0].deliveredAt.getDate()).toBe(15);
    });

    it('should parse short year format (MM/DD/YY)', async () => {
      const csvContent = `Date,Total,Restaurant
06/15/25,$10.00,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].deliveredAt.getFullYear()).toBe(2025);
    });
  });

  describe('parseCSV - Currency parsing', () => {
    it('should parse amounts with dollar signs', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,$15.99,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].earnings).toBe(15.99);
    });

    it('should parse amounts without currency symbols', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,15.99,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].earnings).toBe(15.99);
    });

    it('should parse amounts with commas (thousands separator)', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,"$1,234.56",Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].earnings).toBe(1234.56);
    });

    it('should handle empty tip values', async () => {
      const csvContent = `Date,Subtotal,Tip,Total,Restaurant
01/15/2025,$10.00,,$10.00,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].tip).toBe(0);
    });
  });

  describe('parseCSV - Error handling', () => {
    it('should throw error for empty file', async () => {
      const buffer = Buffer.from('', 'utf-8');

      await expect(csvParserService.parseCSV(buffer, 'DOORDASH')).rejects.toThrow();
    });

    it('should throw error for file with only headers', async () => {
      const buffer = Buffer.from('Date,Total,Restaurant', 'utf-8');

      await expect(csvParserService.parseCSV(buffer, 'DOORDASH')).rejects.toThrow(
        'at least a header row and one data row'
      );
    });

    it('should throw error when date column is missing', async () => {
      const csvContent = `Total,Restaurant
$10.00,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      await expect(csvParserService.parseCSV(buffer, 'DOORDASH')).rejects.toThrow(
        'date column'
      );
    });

    it('should throw error when earnings columns are missing', async () => {
      const csvContent = `Date,Restaurant
01/15/2025,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      await expect(csvParserService.parseCSV(buffer, 'DOORDASH')).rejects.toThrow(
        'earnings column'
      );
    });

    it('should skip rows with zero earnings', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,$0.00,Cancelled
01/16/2025,$10.00,Completed`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries.length).toBe(1);
      expect(result.deliveries[0].restaurantName).toBe('Completed');
      expect(result.skippedRows.length).toBe(1);
    });

    it('should skip rows with invalid dates', async () => {
      const csvContent = `Date,Total,Restaurant
invalid-date,$10.00,Bad
01/16/2025,$12.00,Good`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries.length).toBe(1);
      expect(result.deliveries[0].restaurantName).toBe('Good');
      expect(result.skippedRows.length).toBe(1);
      expect(result.skippedRows[0].reason).toContain('Invalid date');
    });

    it('should skip empty rows', async () => {
      const csvContent = `Date,Total,Restaurant
01/15/2025,$10.00,Test

01/16/2025,$12.00,Test2`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries.length).toBe(2);
    });
  });

  describe('parseCSV - Date range and sorting', () => {
    it('should calculate correct date range', async () => {
      const csvContent = `Date,Total,Restaurant
01/10/2025,$8.00,First
01/25/2025,$12.00,Last
01/15/2025,$10.00,Middle`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.dateRange?.start.getDate()).toBe(10);
      expect(result.dateRange?.end.getDate()).toBe(25);
    });

    it('should sort deliveries by date descending (newest first)', async () => {
      const csvContent = `Date,Total,Restaurant
01/05/2025,$8.00,Old
01/25/2025,$12.00,New
01/15/2025,$10.00,Middle`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries[0].restaurantName).toBe('New');
      expect(result.deliveries[1].restaurantName).toBe('Middle');
      expect(result.deliveries[2].restaurantName).toBe('Old');
    });
  });

  describe('parseCSV - External ID generation consistency', () => {
    it('should generate same externalId for identical deliveries', async () => {
      const csvContent1 = `Date,Total,Restaurant
2025-01-15,$10.00,Test`;
      const csvContent2 = `Date,Total,Restaurant
2025-01-15,$10.00,Test`;

      const buffer1 = Buffer.from(csvContent1, 'utf-8');
      const buffer2 = Buffer.from(csvContent2, 'utf-8');

      const result1 = await csvParserService.parseCSV(buffer1, 'DOORDASH');
      const result2 = await csvParserService.parseCSV(buffer2, 'DOORDASH');

      expect(result1.deliveries[0].externalId).toBe(result2.deliveries[0].externalId);
    });

    it('should generate different externalId for different amounts', async () => {
      const csvContent1 = `Date,Total,Restaurant
2025-01-15,$10.00,Test`;
      const csvContent2 = `Date,Total,Restaurant
2025-01-15,$11.00,Test`;

      const buffer1 = Buffer.from(csvContent1, 'utf-8');
      const buffer2 = Buffer.from(csvContent2, 'utf-8');

      const result1 = await csvParserService.parseCSV(buffer1, 'DOORDASH');
      const result2 = await csvParserService.parseCSV(buffer2, 'DOORDASH');

      expect(result1.deliveries[0].externalId).not.toBe(result2.deliveries[0].externalId);
    });

    it('should generate different externalId for different platforms', async () => {
      const csvContent = `Date,Total,Restaurant
2025-01-15,$10.00,Test`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      const doordashResult = await csvParserService.parseCSV(buffer, 'DOORDASH');
      const ubereatsResult = await csvParserService.parseCSV(buffer, 'UBEREATS');

      expect(doordashResult.deliveries[0].externalId).not.toBe(
        ubereatsResult.deliveries[0].externalId
      );
    });
  });

  describe('parseCSV - BOM handling', () => {
    it('should handle UTF-8 BOM', async () => {
      // UTF-8 BOM is EF BB BF (0xFEFF when decoded)
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const content = Buffer.from(`Date,Total,Restaurant
01/15/2025,$10.00,Test`);
      const buffer = Buffer.concat([bom, content]);

      const result = await csvParserService.parseCSV(buffer, 'DOORDASH');

      expect(result.deliveries.length).toBe(1);
    });
  });
});
