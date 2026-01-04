/**
 * Tax-related constants and utilities for mileage deduction calculations
 */

/**
 * IRS standard mileage rate for business use (2024)
 * Rate changes annually - update this constant when IRS publishes new rate
 * @see https://www.irs.gov/tax-professionals/standard-mileage-rates
 */
export const IRS_MILEAGE_RATE_2024 = 0.67;

/**
 * Current IRS mileage rate (alias for convenience)
 */
export const IRS_MILEAGE_RATE = IRS_MILEAGE_RATE_2024;

/**
 * Calculate tax deduction based on miles driven
 * @param miles - Total miles driven
 * @param rate - IRS mileage rate (defaults to current rate)
 * @returns Tax deduction amount in dollars
 */
export const calculateTaxDeduction = (
  miles: number,
  rate: number = IRS_MILEAGE_RATE
): number => {
  if (miles < 0) return 0;
  return miles * rate;
};

/**
 * Format a dollar amount as USD currency string
 * @param amount - Amount in dollars
 * @returns Formatted string like "$67.00"
 */
export const formatUSD = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Calculate and format tax deduction in one step
 * @param miles - Total miles driven
 * @param rate - IRS mileage rate (defaults to current rate)
 * @returns Formatted tax deduction string like "$67.00"
 */
export const formatTaxDeduction = (
  miles: number,
  rate: number = IRS_MILEAGE_RATE
): string => {
  return formatUSD(calculateTaxDeduction(miles, rate));
};
