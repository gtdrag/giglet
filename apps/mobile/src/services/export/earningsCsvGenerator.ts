/**
 * Earnings CSV Generator Service
 * Generates CSV exports of earnings data with platform breakdowns
 */

import type { Delivery } from '../earnings';
import type { DateRange } from '../../utils/dateRange';
import { formatDateISO } from '../../utils/dateRange';

/**
 * Row format for earnings CSV export
 */
export interface EarningsExportRow {
  date: string;
  platform: 'DOORDASH' | 'UBEREATS';
  restaurantName: string;
  basePay: number;
  tip: number;
  total: number;
}

/**
 * Platform breakdown totals
 */
export interface PlatformBreakdown {
  doordash: number;
  ubereats: number;
  total: number;
}

/**
 * Monthly breakdown for PDF reports
 */
export interface MonthlyBreakdown {
  month: string; // "2025-01"
  monthLabel: string; // "January 2025"
  doordash: number;
  ubereats: number;
  total: number;
}

/**
 * Complete earnings export summary
 */
export interface EarningsExportSummary {
  periodStart: string;
  periodEnd: string;
  deliveryCount: number;
  totalEarnings: number;
  totalTips: number;
  totalBasePay: number;
  platformBreakdown: PlatformBreakdown;
  monthlyBreakdown: MonthlyBreakdown[];
}

/**
 * Escape CSV field values that contain special characters
 */
const escapeCSV = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Format currency for display
 */
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Convert Delivery array to EarningsExportRow array
 */
export const convertDeliveriesToExportRows = (
  deliveries: Delivery[]
): EarningsExportRow[] => {
  return deliveries.map((delivery) => ({
    date: formatDateISO(new Date(delivery.deliveredAt)),
    platform: delivery.platform,
    restaurantName: delivery.restaurantName || 'Unknown',
    basePay: delivery.basePay,
    tip: delivery.tip,
    total: delivery.earnings,
  }));
};

/**
 * Aggregate deliveries by platform
 */
export const aggregateByPlatform = (deliveries: Delivery[]): PlatformBreakdown => {
  const breakdown: PlatformBreakdown = {
    doordash: 0,
    ubereats: 0,
    total: 0,
  };

  for (const delivery of deliveries) {
    if (delivery.platform === 'DOORDASH') {
      breakdown.doordash += delivery.earnings;
    } else if (delivery.platform === 'UBEREATS') {
      breakdown.ubereats += delivery.earnings;
    }
    breakdown.total += delivery.earnings;
  }

  return breakdown;
};

/**
 * Get month label from YYYY-MM format
 */
const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Aggregate deliveries by month
 */
export const aggregateByMonth = (deliveries: Delivery[]): MonthlyBreakdown[] => {
  const monthMap = new Map<
    string,
    { doordash: number; ubereats: number; total: number }
  >();

  for (const delivery of deliveries) {
    const date = new Date(delivery.deliveredAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { doordash: 0, ubereats: 0, total: 0 });
    }

    const current = monthMap.get(monthKey)!;
    if (delivery.platform === 'DOORDASH') {
      current.doordash += delivery.earnings;
    } else if (delivery.platform === 'UBEREATS') {
      current.ubereats += delivery.earnings;
    }
    current.total += delivery.earnings;
  }

  // Sort by month (chronological order)
  const sortedMonths = Array.from(monthMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return sortedMonths.map(([month, data]) => ({
    month,
    monthLabel: getMonthLabel(month),
    doordash: data.doordash,
    ubereats: data.ubereats,
    total: data.total,
  }));
};

/**
 * Calculate complete export summary
 */
export const calculateExportSummary = (
  deliveries: Delivery[],
  dateRange: DateRange
): EarningsExportSummary => {
  const platformBreakdown = aggregateByPlatform(deliveries);
  const monthlyBreakdown = aggregateByMonth(deliveries);

  let totalTips = 0;
  let totalBasePay = 0;

  for (const delivery of deliveries) {
    totalTips += delivery.tip;
    totalBasePay += delivery.basePay;
  }

  return {
    periodStart: formatDateISO(dateRange.startDate),
    periodEnd: formatDateISO(dateRange.endDate),
    deliveryCount: deliveries.length,
    totalEarnings: platformBreakdown.total,
    totalTips,
    totalBasePay,
    platformBreakdown,
    monthlyBreakdown,
  };
};

/**
 * Generate earnings CSV content from deliveries
 * Columns: Date, Platform, Restaurant, Base Pay, Tip, Total
 */
export const generateEarningsCSV = (
  deliveries: Delivery[],
  dateRange: DateRange
): string => {
  // CSV Header
  const header = 'Date,Platform,Restaurant,Base Pay,Tip,Total';

  // Convert to export rows and sort by date
  const rows = convertDeliveriesToExportRows(deliveries).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Generate CSV rows
  const csvRows = rows.map((row) =>
    [
      row.date,
      row.platform,
      escapeCSV(row.restaurantName),
      row.basePay.toFixed(2),
      row.tip.toFixed(2),
      row.total.toFixed(2),
    ].join(',')
  );

  // Calculate platform totals
  const platformBreakdown = aggregateByPlatform(deliveries);

  // Add blank line and platform subtotals
  const subtotalRows = [
    '',
    `DOORDASH SUBTOTAL,,,,,${formatCurrency(platformBreakdown.doordash)}`,
    `UBEREATS SUBTOTAL,,,,,${formatCurrency(platformBreakdown.ubereats)}`,
    `TOTAL,,,,,${formatCurrency(platformBreakdown.total)}`,
  ];

  // Combine all parts
  return [header, ...csvRows, ...subtotalRows].join('\n');
};

/**
 * Generate filename for the earnings CSV export
 */
export const generateEarningsCSVFilename = (dateRange: DateRange): string => {
  const startStr = formatDateISO(dateRange.startDate).replace(/-/g, '');
  const endStr = formatDateISO(dateRange.endDate).replace(/-/g, '');
  return `earnings-summary-${startStr}-${endStr}.csv`;
};
