/**
 * CSV Parser Service - Parse DoorDash and Uber Eats CSV exports
 * Mirrors column mappings from mobile csvParser.ts for consistency
 */

import Papa from 'papaparse';
import crypto from 'crypto';
import { Platform } from '@prisma/client';

// Parsed delivery from CSV
export interface ParsedDelivery {
  externalId: string;
  platform: Platform;
  deliveredAt: Date;
  basePay: number;
  tip: number;
  earnings: number;
  restaurantName: string | null;
}

// Skipped row information
export interface SkippedRow {
  row: number;
  reason: string;
}

// Parse result
export interface ParseResult {
  deliveries: ParsedDelivery[];
  skippedRows: SkippedRow[];
  platform: Platform;
  dateRange: {
    start: Date;
    end: Date;
  } | null;
  totalEarnings: number;
}

// Column mapping interface
interface ColumnMapping {
  date: string[];
  basePay: string[];
  tip: string[];
  total: string[];
  restaurant: string[];
  id: string[];
}

// Column mappings for each platform - mirrors mobile csvParser.ts
const DOORDASH_COLUMNS: ColumnMapping = {
  date: ['Date', 'date', 'Delivery Date', 'delivery_date'],
  basePay: ['Subtotal', 'subtotal', 'Base Pay', 'base_pay', 'Dasher Pay'],
  tip: ['Tip', 'tip', 'Customer Tip', 'customer_tip'],
  total: ['Total', 'total', 'Earnings', 'earnings', 'Total Pay'],
  restaurant: ['Restaurant', 'restaurant', 'Merchant', 'merchant', 'Store Name'],
  id: ['Order ID', 'order_id', 'Delivery ID', 'delivery_id', 'ID', 'id'],
};

const UBEREATS_COLUMNS: ColumnMapping = {
  date: ['Trip Date', 'trip_date', 'Date', 'date', 'Completed At', 'completed_at'],
  basePay: ['Fare', 'fare', 'Base Fare', 'base_fare', 'Trip Fare'],
  tip: ['Tip', 'tip', 'Customer Tip', 'Tips'],
  total: ['Total', 'total', 'Earnings', 'earnings', 'You Receive'],
  restaurant: ['Restaurant', 'restaurant', 'Pickup Location', 'pickup_location'],
  id: ['Trip ID', 'trip_id', 'UUID', 'uuid', 'ID', 'id'],
};

// Column indices after header detection
interface ColumnIndices {
  date: number;
  basePay: number;
  tip: number;
  total: number;
  restaurant: number;
  id: number;
}

/**
 * Generate external ID for deduplication
 * Uses SHA256 hash of platform + date + earnings
 */
function generateExternalId(
  platform: Platform,
  deliveredAt: Date,
  earnings: number
): string {
  return crypto
    .createHash('sha256')
    .update(`${platform}-${deliveredAt.toISOString()}-${earnings.toFixed(2)}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Parse date string to Date object
 * Supports multiple formats: ISO, US (MM/DD/YYYY), short year (MM/DD/YY)
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const trimmed = dateStr.trim();

  // Date format patterns
  const formats = [
    // ISO format: 2024-01-15
    /^(\d{4})-(\d{2})-(\d{2})/,
    // US format: 1/15/2024 or 01/15/2024
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // US short year: 1/15/24 or 01/15/24
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
    // European format: 15-01-2024
    /^(\d{1,2})-(\d{1,2})-(\d{4})/,
  ];

  for (let i = 0; i < formats.length; i++) {
    const match = trimmed.match(formats[i]);
    if (match) {
      let year: number, month: number, day: number;

      if (i === 0) {
        // ISO: YYYY-MM-DD
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10) - 1;
        day = parseInt(match[3], 10);
      } else if (i === 1 || i === 2) {
        // US: MM/DD/YYYY or MM/DD/YY
        month = parseInt(match[1], 10) - 1;
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
      } else {
        // European: DD-MM-YYYY
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10) - 1;
        year = parseInt(match[3], 10);
      }

      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Try native Date parsing as fallback
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

/**
 * Parse currency string to number
 * Handles: $10.00, $1,234.56, 10.00, (10.00), -10.00
 */
function parseCurrency(value: string): number {
  if (!value) return 0;

  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '').trim();
  if (!cleaned) return 0;

  // Handle negative values (parentheses or minus)
  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('(');
  const numStr = cleaned.replace(/[-()]/g, '');

  const num = parseFloat(numStr);
  if (isNaN(num)) return 0;

  return isNegative ? -num : num;
}

/**
 * Find column indices from headers
 */
function findColumnIndices(
  headers: string[],
  platform: Platform
): ColumnIndices {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  const columnMap = platform === 'DOORDASH' ? DOORDASH_COLUMNS : UBEREATS_COLUMNS;

  const findIndex = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const idx = normalizedHeaders.indexOf(name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    date: findIndex(columnMap.date),
    basePay: findIndex(columnMap.basePay),
    tip: findIndex(columnMap.tip),
    total: findIndex(columnMap.total),
    restaurant: findIndex(columnMap.restaurant),
    id: findIndex(columnMap.id),
  };
}

/**
 * Parse a single row into a delivery
 */
function parseRow(
  row: string[],
  indices: ColumnIndices,
  platform: Platform,
  rowNumber: number
): { delivery: ParsedDelivery | null; skipReason: string | null } {
  const getCell = (index: number): string => {
    if (index === -1 || index >= row.length) return '';
    return row[index].trim();
  };

  // Parse date (required)
  const dateStr = getCell(indices.date);
  if (!dateStr) {
    return { delivery: null, skipReason: 'Missing date' };
  }

  const deliveredAt = parseDate(dateStr);
  if (!deliveredAt) {
    return { delivery: null, skipReason: `Invalid date format: "${dateStr}"` };
  }

  // Parse monetary values
  const basePay = parseCurrency(getCell(indices.basePay));
  const tip = parseCurrency(getCell(indices.tip));
  let total = parseCurrency(getCell(indices.total));

  // Calculate total if not provided
  if (total === 0 && (basePay > 0 || tip > 0)) {
    total = basePay + tip;
  }

  // Skip zero-earnings rows (cancelled orders, etc.)
  if (total === 0) {
    return { delivery: null, skipReason: 'Zero earnings (likely cancelled)' };
  }

  // Get or generate external ID
  let externalId = getCell(indices.id);
  if (!externalId) {
    externalId = generateExternalId(platform, deliveredAt, total);
  }

  return {
    delivery: {
      externalId,
      platform,
      deliveredAt,
      basePay,
      tip,
      earnings: total,
      restaurantName: getCell(indices.restaurant) || null,
    },
    skipReason: null,
  };
}

class CSVParserService {
  /**
   * Parse CSV content and return deliveries
   */
  async parseCSV(
    fileBuffer: Buffer,
    platform: Platform
  ): Promise<ParseResult> {
    // Convert buffer to string, handling BOM
    let content = fileBuffer.toString('utf-8');
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.substring(1);
    }

    // Parse CSV with papaparse
    const parseResult = Papa.parse<string[]>(content, {
      header: false,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      const error = parseResult.errors[0];
      throw new Error(`CSV parsing error at row ${error.row}: ${error.message}`);
    }

    const rows = parseResult.data;
    if (rows.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find column indices
    const indices = findColumnIndices(headers, platform);

    if (indices.date === -1) {
      const columnMap = platform === 'DOORDASH' ? DOORDASH_COLUMNS : UBEREATS_COLUMNS;
      throw new Error(`Could not find date column. Expected one of: ${columnMap.date.join(', ')}`);
    }

    if (indices.total === -1 && indices.basePay === -1) {
      const columnMap = platform === 'DOORDASH' ? DOORDASH_COLUMNS : UBEREATS_COLUMNS;
      throw new Error(`Could not find earnings column. Expected one of: ${columnMap.total.join(', ')}`);
    }

    // Parse deliveries
    const deliveries: ParsedDelivery[] = [];
    const skippedRows: SkippedRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // 1-indexed, header is row 1

      // Skip empty rows
      if (row.length === 0 || row.every((cell) => cell.trim() === '')) {
        continue;
      }

      const { delivery, skipReason } = parseRow(row, indices, platform, rowNumber);

      if (delivery) {
        deliveries.push(delivery);
      } else if (skipReason) {
        skippedRows.push({ row: rowNumber, reason: skipReason });
      }
    }

    if (deliveries.length === 0) {
      if (skippedRows.length > 0) {
        throw new Error(`No valid deliveries found. First error: ${skippedRows[0].reason}`);
      }
      throw new Error('No deliveries found in the CSV file');
    }

    // Sort by date descending (newest first)
    deliveries.sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime());

    // Calculate stats
    const dates = deliveries.map((d) => d.deliveredAt.getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const totalEarnings = deliveries.reduce((sum, d) => sum + d.earnings, 0);

    return {
      deliveries,
      skippedRows,
      platform,
      dateRange: {
        start: minDate,
        end: maxDate,
      },
      totalEarnings,
    };
  }
}

export const csvParserService = new CSVParserService();
