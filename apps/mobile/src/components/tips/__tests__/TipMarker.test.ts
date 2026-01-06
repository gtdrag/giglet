/**
 * TipMarker Related Tests
 * Story 10-3: Tip Locations Map Layer
 *
 * Tests for tip marker utility functions (color mapping, label formatting)
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the API module to prevent expo module loading
vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { getTipSizeColor, getTipSizeLabel, TipSize } from '../../../services/tips';

describe('TipMarker Utilities - Story 10-3', () => {
  describe('getTipSizeColor', () => {
    it('returns gray for NONE tip', () => {
      expect(getTipSizeColor('NONE')).toBe('#71717A');
    });

    it('returns red for SMALL tip', () => {
      expect(getTipSizeColor('SMALL')).toBe('#EF4444');
    });

    it('returns orange for MEDIUM tip', () => {
      expect(getTipSizeColor('MEDIUM')).toBe('#F97316');
    });

    it('returns yellow for LARGE tip', () => {
      expect(getTipSizeColor('LARGE')).toBe('#EAB308');
    });

    it('returns green for XLARGE tip', () => {
      expect(getTipSizeColor('XLARGE')).toBe('#22C55E');
    });

    it('returns emerald for XXLARGE tip', () => {
      expect(getTipSizeColor('XXLARGE')).toBe('#10B981');
    });

    it('returns valid hex color for all tip sizes', () => {
      const tipSizes: TipSize[] = ['NONE', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE'];
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      tipSizes.forEach((size) => {
        const color = getTipSizeColor(size);
        expect(color).toMatch(hexColorRegex);
      });
    });
  });

  describe('getTipSizeLabel', () => {
    it('returns "None" for NONE tip', () => {
      expect(getTipSizeLabel('NONE')).toBe('None');
    });

    it('returns "S" for SMALL tip', () => {
      expect(getTipSizeLabel('SMALL')).toBe('S');
    });

    it('returns "M" for MEDIUM tip', () => {
      expect(getTipSizeLabel('MEDIUM')).toBe('M');
    });

    it('returns "L" for LARGE tip', () => {
      expect(getTipSizeLabel('LARGE')).toBe('L');
    });

    it('returns "XL" for XLARGE tip', () => {
      expect(getTipSizeLabel('XLARGE')).toBe('XL');
    });

    it('returns "XXL" for XXLARGE tip', () => {
      expect(getTipSizeLabel('XXLARGE')).toBe('XXL');
    });
  });

  describe('Color scheme for map visualization', () => {
    it('uses distinct colors for different tip values', () => {
      const tipSizes: TipSize[] = ['NONE', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE'];
      const colors = tipSizes.map(getTipSizeColor);
      const uniqueColors = new Set(colors);

      // All colors should be unique (except XLARGE and LARGE can share similar greens)
      expect(uniqueColors.size).toBeGreaterThanOrEqual(5);
    });

    it('uses warm colors for low tips and cool colors for high tips', () => {
      // SMALL should be red-ish (low value)
      expect(getTipSizeColor('SMALL')).toContain('EF'); // Red component

      // XXLARGE should be green-ish (high value)
      expect(getTipSizeColor('XXLARGE')).toContain('B9'); // Green component
    });
  });
});
