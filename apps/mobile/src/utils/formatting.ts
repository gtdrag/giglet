/**
 * Formatting utilities
 * Centralized number, currency, and display formatting functions
 */

/**
 * Format a number as currency (USD)
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted string like "$12.50"
 */
export const formatCurrency = (
  amount: number,
  options?: {
    showSign?: boolean; // Show +/- sign
    decimals?: number; // Number of decimal places (default: 2)
  }
): string => {
  const { showSign = false, decimals = 2 } = options || {};
  const absAmount = Math.abs(amount);
  const formatted = `$${absAmount.toFixed(decimals)}`;

  if (showSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`;
  }

  return amount < 0 ? `-${formatted}` : formatted;
};

/**
 * Format a number as a currency rate (e.g., "$12.50/hr")
 * @param rate - The rate value
 * @param unit - The unit suffix (e.g., "hr", "mi")
 * @returns Formatted string like "$12.50/hr"
 */
export const formatRate = (rate: number, unit: string): string => {
  return `${formatCurrency(rate)}/${unit}`;
};

/**
 * Format miles/distance
 * @param miles - The miles value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "12.5 mi"
 */
export const formatMiles = (miles: number, decimals: number = 1): string => {
  return `${miles.toFixed(decimals)} mi`;
};

/**
 * Format miles as number only (no unit)
 * @param miles - The miles value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string like "12.5"
 */
export const formatMilesValue = (miles: number, decimals: number = 1): string => {
  return miles.toFixed(decimals);
};

/**
 * Format hours
 * @param hours - The hours value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "2.5 hrs"
 */
export const formatHours = (hours: number, decimals: number = 1): string => {
  return `${hours.toFixed(decimals)} hrs`;
};

/**
 * Format speed (mph)
 * @param speed - The speed value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "35.5 mph"
 */
export const formatSpeed = (speed: number, decimals: number = 1): string => {
  return `${speed.toFixed(decimals)} mph`;
};

/**
 * Format a percentage
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string like "75%"
 */
export const formatPercent = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format coordinates for display/caching
 * @param lat - Latitude
 * @param lng - Longitude
 * @param precision - Number of decimal places (default: 4)
 * @returns Formatted string like "37.7749,-122.4194"
 */
export const formatCoordinates = (
  lat: number,
  lng: number,
  precision: number = 4
): string => {
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
};

/**
 * Format a number with thousand separators
 * @param value - The number to format
 * @returns Formatted string like "1,234,567"
 */
export const formatNumber = (value: number): string => {
  return value.toLocaleString('en-US');
};

/**
 * Format a compact number (1K, 1.5M, etc.)
 * @param value - The number to format
 * @returns Formatted string like "1.5K"
 */
export const formatCompact = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};
