/**
 * CSV Parser Service - Parse DoorDash and Uber Eats CSV exports
 */

import * as FileSystem from 'expo-file-system';

// Supported platforms
export type Platform = 'DOORDASH' | 'UBEREATS';

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

// Import preview result
export interface ImportPreview {
  deliveryCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  estimatedTotal: number;
  duplicateCount: number;
  sampleDeliveries: ParsedDelivery[];
}

// CSV parsing error
export class CSVParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSVParseError';
  }
}

// Column mappings interface
interface ColumnMapping {
  date: string[];
  basePay: string[];
  tip: string[];
  total: string[];
  restaurant: string[];
  id: string[];
}

// Column mappings for each platform
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

/**
 * Parse CSV file and return import preview
 */
export async function parseCSV(fileUri: string, platform: Platform): Promise<ImportPreview> {
  // Read file content
  let content: string;
  try {
    content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'utf8',
    });
  } catch (error) {
    throw new CSVParseError('Unable to read file. Please make sure it is a valid CSV file.');
  }

  if (!content || content.trim().length === 0) {
    throw new CSVParseError('The file is empty. Please select a CSV file with earnings data.');
  }

  // Parse CSV content
  const lines = parseCSVLines(content);
  if (lines.length < 2) {
    throw new CSVParseError('The CSV file does not contain any data rows.');
  }

  const headers = lines[0];
  const dataRows = lines.slice(1);

  // Find column indices based on platform
  const columnIndices = findColumnIndices(headers, platform);

  // Parse deliveries
  const deliveries: ParsedDelivery[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length === 0 || row.every((cell) => cell.trim() === '')) {
      continue; // Skip empty rows
    }

    try {
      const delivery = parseRow(row, columnIndices, platform, i + 2);
      if (delivery) {
        deliveries.push(delivery);
      }
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }
  }

  if (deliveries.length === 0) {
    if (errors.length > 0) {
      throw new CSVParseError(`No valid deliveries found. ${errors[0]}`);
    }
    throw new CSVParseError(
      'No deliveries found in the CSV file. Please make sure you selected the correct file format.'
    );
  }

  // Sort by date descending
  deliveries.sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime());

  // Calculate preview stats
  const dates = deliveries.map((d) => d.deliveredAt);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const totalEarnings = deliveries.reduce((sum, d) => sum + d.earnings, 0);

  return {
    deliveryCount: deliveries.length,
    dateRange: {
      start: formatDate(minDate),
      end: formatDate(maxDate),
    },
    estimatedTotal: totalEarnings,
    duplicateCount: 0, // TODO: Check against existing deliveries in Story 3.3
    sampleDeliveries: deliveries.slice(0, 5),
  };
}

/**
 * Parse CSV content into rows
 */
function parseCSVLines(content: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field delimiter
        currentLine.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        // Line delimiter
        currentLine.push(currentCell.trim());
        if (currentLine.some((cell) => cell.length > 0)) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentCell = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
  }

  // Handle last cell/line
  if (currentCell.length > 0 || currentLine.length > 0) {
    currentLine.push(currentCell.trim());
    if (currentLine.some((cell) => cell.length > 0)) {
      lines.push(currentLine);
    }
  }

  return lines;
}

interface ColumnIndices {
  date: number;
  basePay: number;
  tip: number;
  total: number;
  restaurant: number;
  id: number;
}

/**
 * Find column indices from headers
 */
function findColumnIndices(headers: string[], platform: Platform): ColumnIndices {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  const columnMap = platform === 'DOORDASH' ? DOORDASH_COLUMNS : UBEREATS_COLUMNS;

  const findIndex = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const idx = normalizedHeaders.indexOf(name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateIndex = findIndex(columnMap.date);
  const basePayIndex = findIndex(columnMap.basePay);
  const tipIndex = findIndex(columnMap.tip);
  const totalIndex = findIndex(columnMap.total);
  const restaurantIndex = findIndex(columnMap.restaurant);
  const idIndex = findIndex(columnMap.id);

  if (dateIndex === -1) {
    throw new CSVParseError(
      `Could not find date column. Expected one of: ${columnMap.date.join(', ')}`
    );
  }

  // Either total or (basePay + tip) must be present
  if (totalIndex === -1 && basePayIndex === -1) {
    throw new CSVParseError(
      `Could not find earnings column. Expected one of: ${columnMap.total.join(', ')}`
    );
  }

  return {
    date: dateIndex,
    basePay: basePayIndex,
    tip: tipIndex,
    total: totalIndex,
    restaurant: restaurantIndex,
    id: idIndex,
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
): ParsedDelivery | null {
  // Get cell value safely
  const getCell = (index: number): string => {
    if (index === -1 || index >= row.length) return '';
    return row[index].trim();
  };

  // Parse date
  const dateStr = getCell(indices.date);
  if (!dateStr) return null; // Skip rows without date

  const deliveredAt = parseDate(dateStr);
  if (!deliveredAt) {
    throw new Error(`Invalid date format: "${dateStr}"`);
  }

  // Parse monetary values
  const basePay = parseCurrency(getCell(indices.basePay));
  const tip = parseCurrency(getCell(indices.tip));
  let total = parseCurrency(getCell(indices.total));

  // Calculate total if not provided
  if (total === 0 && (basePay > 0 || tip > 0)) {
    total = basePay + tip;
  }

  // Skip zero-earnings rows
  if (total === 0) return null;

  // Generate ID if not present
  let externalId = getCell(indices.id);
  if (!externalId) {
    externalId = `${platform}-${deliveredAt.getTime()}-${total.toFixed(2)}`;
  }

  return {
    externalId,
    platform,
    deliveredAt,
    basePay,
    tip,
    earnings: total,
    restaurantName: getCell(indices.restaurant) || null,
  };
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date | null {
  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})/, // 2024-01-15
    // US format
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, // 1/15/2024 or 01/15/2024
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // 1/15/24 or 01/15/24
    // UK/European format
    /^(\d{1,2})-(\d{1,2})-(\d{4})/, // 15-01-2024
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year: number, month: number, day: number;

      if (format === formats[0]) {
        // ISO: YYYY-MM-DD
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10) - 1;
        day = parseInt(match[3], 10);
      } else if (format === formats[1] || format === formats[2]) {
        // US: MM/DD/YYYY or MM/DD/YY
        month = parseInt(match[1], 10) - 1;
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
      } else {
        // UK: DD-MM-YYYY
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
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

/**
 * Parse currency string to number
 */
function parseCurrency(value: string): number {
  if (!value) return 0;

  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '').trim();
  if (!cleaned) return 0;

  // Handle negative values
  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('(');
  const numStr = cleaned.replace(/[-()]/g, '');

  const num = parseFloat(numStr);
  if (isNaN(num)) return 0;

  return isNegative ? -num : num;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Auto-detect platform from CSV headers
 */
export function detectPlatform(headers: string[]): Platform | null {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  // Check for DoorDash-specific columns
  const doordashIndicators = ['subtotal', 'dasher', 'base pay', 'order id'];
  const ubereatsIndicators = ['fare', 'trip', 'trip id', 'you receive'];

  const doordashScore = doordashIndicators.filter((indicator) =>
    normalizedHeaders.some((h) => h.includes(indicator))
  ).length;

  const ubereatsScore = ubereatsIndicators.filter((indicator) =>
    normalizedHeaders.some((h) => h.includes(indicator))
  ).length;

  if (doordashScore > ubereatsScore) return 'DOORDASH';
  if (ubereatsScore > doordashScore) return 'UBEREATS';

  return null;
}
