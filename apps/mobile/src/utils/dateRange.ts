/**
 * Date range utilities for tax export functionality
 */

export type DateRangePreset =
  | 'this_year'
  | 'last_year'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'this_month'
  | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
}

/**
 * Get the start and end dates for a given preset
 */
export const getPresetDateRange = (preset: DateRangePreset): DateRange => {
  const now = new Date();
  const currentYear = now.getFullYear();

  switch (preset) {
    case 'this_year':
      return {
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31, 23, 59, 59),
        preset,
      };

    case 'last_year':
      return {
        startDate: new Date(currentYear - 1, 0, 1),
        endDate: new Date(currentYear - 1, 11, 31, 23, 59, 59),
        preset,
      };

    case 'q1':
      return {
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 2, 31, 23, 59, 59),
        preset,
      };

    case 'q2':
      return {
        startDate: new Date(currentYear, 3, 1),
        endDate: new Date(currentYear, 5, 30, 23, 59, 59),
        preset,
      };

    case 'q3':
      return {
        startDate: new Date(currentYear, 6, 1),
        endDate: new Date(currentYear, 8, 30, 23, 59, 59),
        preset,
      };

    case 'q4':
      return {
        startDate: new Date(currentYear, 9, 1),
        endDate: new Date(currentYear, 11, 31, 23, 59, 59),
        preset,
      };

    case 'this_month':
      const lastDayOfMonth = new Date(currentYear, now.getMonth() + 1, 0);
      return {
        startDate: new Date(currentYear, now.getMonth(), 1),
        endDate: new Date(currentYear, now.getMonth(), lastDayOfMonth.getDate(), 23, 59, 59),
        preset,
      };

    case 'custom':
    default:
      // Default to this year for custom (user will adjust)
      return {
        startDate: new Date(currentYear, 0, 1),
        endDate: now,
        preset: 'custom',
      };
  }
};

/**
 * Format a date as "Jan 1, 2025"
 */
export const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format a date range as "Jan 1, 2025 - Dec 31, 2025"
 */
export const formatDateRange = (range: DateRange): string => {
  return `${formatDateShort(range.startDate)} - ${formatDateShort(range.endDate)}`;
};

/**
 * Format a date as ISO date string for CSV export (YYYY-MM-DD)
 */
export const formatDateISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get display label for a preset
 */
export const getPresetLabel = (preset: DateRangePreset): string => {
  const currentYear = new Date().getFullYear();

  switch (preset) {
    case 'this_year':
      return `This Year (${currentYear})`;
    case 'last_year':
      return `Last Year (${currentYear - 1})`;
    case 'q1':
      return `Q1 ${currentYear}`;
    case 'q2':
      return `Q2 ${currentYear}`;
    case 'q3':
      return `Q3 ${currentYear}`;
    case 'q4':
      return `Q4 ${currentYear}`;
    case 'this_month':
      const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });
      return `This Month (${monthName})`;
    case 'custom':
      return 'Custom Range';
    default:
      return 'Select Range';
  }
};

/**
 * All available presets for the selector
 */
export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  'this_year',
  'last_year',
  'q1',
  'q2',
  'q3',
  'q4',
  'this_month',
  'custom',
];
