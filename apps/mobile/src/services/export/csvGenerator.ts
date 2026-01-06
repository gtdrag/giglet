/**
 * CSV Generator Service for IRS-compliant mileage log export
 */

import type { CompletedTrip } from '../locationTracking';
import type { DateRange } from '../../utils/dateRange';
import { formatDateISO } from '../../utils/dateRange';

export interface MileageExportRow {
  date: string;
  businessPurpose: string;
  startLocation: string;
  endLocation: string;
  miles: number;
}

/**
 * Generate IRS-compliant CSV content from trips
 * Columns: Date, Business Purpose, Start Location, End Location, Miles
 */
export const generateMileageCSV = (
  trips: MileageExportRow[],
  dateRange: DateRange
): string => {
  // CSV Header
  const header = 'Date,Business Purpose,Start Location,End Location,Miles';

  // CSV Rows
  const rows = trips.map((trip) => {
    // Escape quotes and wrap fields that contain commas or quotes
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    return [
      trip.date,
      escapeCSV(trip.businessPurpose),
      escapeCSV(trip.startLocation),
      escapeCSV(trip.endLocation),
      trip.miles.toFixed(1),
    ].join(',');
  });

  // Calculate totals
  const totalMiles = trips.reduce((sum, trip) => sum + trip.miles, 0);

  // Add totals row
  const totalsRow = `TOTAL,,,,"${totalMiles.toFixed(1)}"`;

  // Combine all parts
  return [header, ...rows, totalsRow].join('\n');
};

/**
 * Convert CompletedTrip array to MileageExportRow array
 * Uses reverse geocoding results for locations
 */
export const convertTripsToExportRows = (
  trips: CompletedTrip[],
  locations: Map<string, { start: string; end: string }>
): MileageExportRow[] => {
  return trips.map((trip) => {
    const tripLocations = locations.get(trip.id);

    return {
      date: formatDateISO(new Date(trip.startedAt)),
      businessPurpose: 'Delivery driving',
      startLocation: tripLocations?.start || 'Unknown location',
      endLocation: tripLocations?.end || 'Unknown location',
      miles: trip.miles,
    };
  });
};

/**
 * Generate filename for the CSV export
 */
export const generateCSVFilename = (dateRange: DateRange): string => {
  const startStr = formatDateISO(dateRange.startDate).replace(/-/g, '');
  const endStr = formatDateISO(dateRange.endDate).replace(/-/g, '');
  return `mileage-log-${startStr}-${endStr}.csv`;
};
