/**
 * Unit tests for tax deduction constants and utilities
 */

import { describe, it, expect } from 'vitest';
import {
  IRS_MILEAGE_RATE_2024,
  IRS_MILEAGE_RATE,
  calculateTaxDeduction,
  formatUSD,
  formatTaxDeduction,
} from '../tax';

describe('Tax Constants', () => {
  it('should have IRS mileage rate of $0.67 for 2024', () => {
    expect(IRS_MILEAGE_RATE_2024).toBe(0.67);
  });

  it('should have current rate aliased to 2024 rate', () => {
    expect(IRS_MILEAGE_RATE).toBe(IRS_MILEAGE_RATE_2024);
  });
});

describe('calculateTaxDeduction', () => {
  it('should calculate deduction correctly for 100 miles', () => {
    const deduction = calculateTaxDeduction(100);
    expect(deduction).toBe(67.0);
  });

  it('should calculate deduction correctly for 0 miles', () => {
    const deduction = calculateTaxDeduction(0);
    expect(deduction).toBe(0);
  });

  it('should return 0 for negative miles', () => {
    const deduction = calculateTaxDeduction(-50);
    expect(deduction).toBe(0);
  });

  it('should handle decimal miles', () => {
    const deduction = calculateTaxDeduction(10.5);
    expect(deduction).toBeCloseTo(7.035, 3);
  });

  it('should allow custom rate override', () => {
    // Use hypothetical 2025 rate of $0.70
    const deduction = calculateTaxDeduction(100, 0.70);
    expect(deduction).toBe(70.0);
  });

  it('should use default rate when not specified', () => {
    const deduction = calculateTaxDeduction(100);
    expect(deduction).toBe(100 * IRS_MILEAGE_RATE);
  });
});

describe('formatUSD', () => {
  it('should format whole dollars correctly', () => {
    expect(formatUSD(67)).toBe('$67.00');
  });

  it('should format dollars and cents correctly', () => {
    expect(formatUSD(67.5)).toBe('$67.50');
  });

  it('should round to 2 decimal places', () => {
    expect(formatUSD(67.555)).toBe('$67.56');
  });

  it('should format zero correctly', () => {
    expect(formatUSD(0)).toBe('$0.00');
  });

  it('should format small amounts correctly', () => {
    expect(formatUSD(0.67)).toBe('$0.67');
  });

  it('should format large amounts correctly', () => {
    expect(formatUSD(12345.67)).toBe('$12345.67');
  });
});

describe('formatTaxDeduction', () => {
  it('should calculate and format in one step', () => {
    expect(formatTaxDeduction(100)).toBe('$67.00');
  });

  it('should handle decimal miles with proper formatting', () => {
    expect(formatTaxDeduction(10.5)).toBe('$7.04');
  });

  it('should format zero miles correctly', () => {
    expect(formatTaxDeduction(0)).toBe('$0.00');
  });

  it('should allow custom rate override', () => {
    expect(formatTaxDeduction(100, 0.70)).toBe('$70.00');
  });
});
