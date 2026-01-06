/**
 * Export Service - Orchestrates mileage and earnings export
 * Coordinates between CSV/PDF generators, location services, and share functionality
 */

import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import type { CompletedTrip } from './locationTracking';
import type { DateRange } from '../utils/dateRange';
import { formatDateISO } from '../utils/dateRange';
import { getTripsInRange } from '../utils/locationStorage';
import {
  generateMileageCSV,
  convertTripsToExportRows,
  generateCSVFilename,
  type MileageExportRow,
} from './export/csvGenerator';
import { generateMileagePDF, generatePDFFilename } from './export/pdfGenerator';
import {
  generateEarningsCSV,
  generateEarningsCSVFilename,
  aggregateByPlatform,
  type PlatformBreakdown,
} from './export/earningsCsvGenerator';
import {
  generateEarningsPDF,
  generateEarningsPDFFilename,
} from './export/earningsPdfGenerator';
import { shareFile, getExportMimeType } from './share';
import { getDeliveries, type Delivery } from './earnings';

export type ExportFormat = 'csv' | 'pdf';

export interface ExportPreview {
  tripCount: number;
  totalMiles: number;
  dateRange: DateRange;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  error?: string;
}

// Address cache to avoid repeated reverse geocoding calls
const addressCache = new Map<string, string>();

/**
 * Generate a cache key for a lat/lng coordinate
 */
const getCoordCacheKey = (lat: number, lng: number): string => {
  // Round to 4 decimal places for caching (about 11m accuracy)
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
};

/**
 * Reverse geocode a coordinate to get a human-readable address
 */
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  // Check cache first
  const cacheKey = getCoordCacheKey(lat, lng);
  const cached = addressCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Skip if coordinates are 0,0 (manual trips)
  if (lat === 0 && lng === 0) {
    return 'Manual entry';
  }

  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    if (results.length > 0) {
      const addr = results[0];
      // Format address: "123 Main St, Los Angeles, CA"
      const parts = [];
      if (addr.streetNumber && addr.street) {
        parts.push(`${addr.streetNumber} ${addr.street}`);
      } else if (addr.street) {
        parts.push(addr.street);
      } else if (addr.name) {
        parts.push(addr.name);
      }

      if (addr.city) {
        parts.push(addr.city);
      }

      if (addr.region) {
        parts.push(addr.region);
      }

      const address = parts.join(', ') || 'Unknown location';

      // Cache the result
      addressCache.set(cacheKey, address);

      return address;
    }

    return 'Unknown location';
  } catch (error) {
    console.warn('[Export] Reverse geocode failed:', error);
    return 'Unknown location';
  }
};

/**
 * Get export preview data for a date range
 */
export const getExportPreview = async (dateRange: DateRange): Promise<ExportPreview> => {
  const trips = await getTripsInRange(dateRange.startDate, dateRange.endDate);
  const totalMiles = trips.reduce((sum, trip) => sum + trip.miles, 0);

  return {
    tripCount: trips.length,
    totalMiles,
    dateRange,
  };
};

/**
 * Generate mileage export rows with geocoded addresses
 */
const generateExportRows = async (trips: CompletedTrip[]): Promise<MileageExportRow[]> => {
  // Batch reverse geocode all unique coordinates
  const locations = new Map<string, { start: string; end: string }>();

  for (const trip of trips) {
    const startAddr = await reverseGeocode(trip.startLat, trip.startLng);
    const endAddr = await reverseGeocode(trip.endLat, trip.endLng);

    locations.set(trip.id, {
      start: startAddr,
      end: endAddr,
    });
  }

  return convertTripsToExportRows(trips, locations);
};

/**
 * Generate mileage log in the specified format
 */
export const generateMileageLog = async (
  format: ExportFormat,
  dateRange: DateRange,
  userName?: string
): Promise<ExportResult> => {
  try {
    // Fetch trips for the date range
    const trips = await getTripsInRange(dateRange.startDate, dateRange.endDate);

    if (trips.length === 0) {
      return {
        success: false,
        error: 'No trips found for the selected date range',
      };
    }

    // Generate export rows with addresses
    const exportRows = await generateExportRows(trips);

    let filePath: string;
    let filename: string;

    if (format === 'csv') {
      // Generate CSV content
      const csvContent = generateMileageCSV(exportRows, dateRange);
      filename = generateCSVFilename(dateRange);

      // Write to temp file
      filePath = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } else {
      // Generate PDF
      filePath = await generateMileagePDF(exportRows, dateRange, userName);
      filename = generatePDFFilename(dateRange);
    }

    return {
      success: true,
      filePath,
      filename,
    };
  } catch (error) {
    console.error('[Export] Failed to generate mileage log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate export',
    };
  }
};

/**
 * Generate and share mileage log in one step
 */
export const exportAndShareMileageLog = async (
  format: ExportFormat,
  dateRange: DateRange,
  userName?: string
): Promise<ExportResult> => {
  // Generate the export
  const result = await generateMileageLog(format, dateRange, userName);

  if (!result.success || !result.filePath) {
    return result;
  }

  // Share the file
  const shareResult = await shareFile(result.filePath, getExportMimeType(format));

  if (!shareResult.success) {
    return {
      success: false,
      error: shareResult.error || 'Failed to share file',
    };
  }

  return result;
};

/**
 * Clear the address cache (useful for testing or memory management)
 */
export const clearAddressCache = (): void => {
  addressCache.clear();
};

// ============================================
// EARNINGS EXPORT FUNCTIONS
// ============================================

/**
 * Preview data for earnings export
 */
export interface EarningsExportPreview {
  deliveryCount: number;
  totalEarnings: number;
  platformBreakdown: PlatformBreakdown;
  dateRange: DateRange;
}

/**
 * Get timezone for API calls
 */
const getTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/**
 * Fetch all deliveries for a date range
 * Uses pagination to get all deliveries
 */
const fetchDeliveriesInRange = async (dateRange: DateRange): Promise<Delivery[]> => {
  const allDeliveries: Delivery[] = [];
  const timezone = getTimezone();
  const limit = 100;
  let offset = 0;
  let hasMore = true;

  // Use 'year' period and filter by date range
  // The API returns all deliveries for the period, we filter client-side for precise range
  while (hasMore) {
    const result = await getDeliveries('year', timezone, limit, offset);

    // Filter by date range
    const filtered = result.deliveries.filter((delivery) => {
      const deliveryDate = new Date(delivery.deliveredAt);
      return deliveryDate >= dateRange.startDate && deliveryDate <= dateRange.endDate;
    });

    allDeliveries.push(...filtered);

    // Check if we've fetched all deliveries from API
    if (result.deliveries.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }

    // Safety limit to prevent infinite loops
    if (offset > 10000) {
      hasMore = false;
    }
  }

  return allDeliveries;
};

/**
 * Get earnings export preview data for a date range
 */
export const getEarningsExportPreview = async (
  dateRange: DateRange
): Promise<EarningsExportPreview> => {
  const deliveries = await fetchDeliveriesInRange(dateRange);
  const platformBreakdown = aggregateByPlatform(deliveries);

  return {
    deliveryCount: deliveries.length,
    totalEarnings: platformBreakdown.total,
    platformBreakdown,
    dateRange,
  };
};

/**
 * Generate earnings summary in the specified format
 */
export const generateEarningsSummary = async (
  format: ExportFormat,
  dateRange: DateRange,
  userName?: string
): Promise<ExportResult> => {
  try {
    // Fetch all deliveries for the date range
    const deliveries = await fetchDeliveriesInRange(dateRange);

    if (deliveries.length === 0) {
      return {
        success: false,
        error: 'No deliveries found for the selected date range',
      };
    }

    let filePath: string;
    let filename: string;

    if (format === 'csv') {
      // Generate CSV content
      const csvContent = generateEarningsCSV(deliveries, dateRange);
      filename = generateEarningsCSVFilename(dateRange);

      // Write to temp file
      filePath = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } else {
      // Generate PDF
      filePath = await generateEarningsPDF(deliveries, dateRange, userName);
      filename = generateEarningsPDFFilename(dateRange);
    }

    return {
      success: true,
      filePath,
      filename,
    };
  } catch (error) {
    console.error('[Export] Failed to generate earnings summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate export',
    };
  }
};

/**
 * Generate and share earnings summary in one step
 */
export const exportAndShareEarningsSummary = async (
  format: ExportFormat,
  dateRange: DateRange,
  userName?: string
): Promise<ExportResult> => {
  // Generate the export
  const result = await generateEarningsSummary(format, dateRange, userName);

  if (!result.success || !result.filePath) {
    return result;
  }

  // Share the file
  const shareResult = await shareFile(result.filePath, getExportMimeType(format));

  if (!shareResult.success) {
    return {
      success: false,
      error: shareResult.error || 'Failed to share file',
    };
  }

  return result;
};
