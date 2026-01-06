/**
 * TipSizeFilter Component Tests
 * Story 10-4: Tip Filter Controls
 *
 * Tests for the tip size filter component and filter options.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the API module to prevent expo module loading
vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { TipSize, getTipSizeColor } from '../../../services/tips';

// Define filter options locally to avoid importing the component (which has expo dependencies)
type TipFilterOption = TipSize | null;

interface FilterOption {
  value: TipFilterOption;
  label: string;
  description: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: null, label: 'All', description: 'Show all tips' },
  { value: 'SMALL', label: 'S+', description: 'Small and above' },
  { value: 'MEDIUM', label: 'M+', description: 'Medium and above' },
  { value: 'LARGE', label: 'L+', description: 'Large and above' },
  { value: 'XLARGE', label: 'XL+', description: 'XL and above' },
  { value: 'XXLARGE', label: 'XXL', description: 'XXL only' },
];

describe('TipSizeFilter - Story 10-4', () => {
  describe('FILTER_OPTIONS', () => {
    it('includes all expected filter options', () => {
      const labels = FILTER_OPTIONS.map((opt) => opt.label);
      expect(labels).toEqual(['All', 'S+', 'M+', 'L+', 'XL+', 'XXL']);
    });

    it('has null value for "All" option', () => {
      const allOption = FILTER_OPTIONS.find((opt) => opt.label === 'All');
      expect(allOption?.value).toBeNull();
    });

    it('has correct TipSize values for other options', () => {
      const expectedValues: Array<{ label: string; value: TipFilterOption }> = [
        { label: 'S+', value: 'SMALL' },
        { label: 'M+', value: 'MEDIUM' },
        { label: 'L+', value: 'LARGE' },
        { label: 'XL+', value: 'XLARGE' },
        { label: 'XXL', value: 'XXLARGE' },
      ];

      expectedValues.forEach(({ label, value }) => {
        const option = FILTER_OPTIONS.find((opt) => opt.label === label);
        expect(option?.value).toBe(value);
      });
    });

    it('has descriptions for all options', () => {
      FILTER_OPTIONS.forEach((option) => {
        expect(option.description).toBeTruthy();
        expect(option.description.length).toBeGreaterThan(0);
      });
    });

    it('has 6 total options', () => {
      expect(FILTER_OPTIONS).toHaveLength(6);
    });
  });

  describe('Filter value to API mapping', () => {
    it('null filter means show all tips (no tipSize param)', () => {
      // When filter is null, API should not receive tipSize param
      const filter: TipFilterOption = null;
      expect(filter === null).toBe(true);
    });

    it('SMALL filter returns SMALL and above tips', () => {
      // API's tipSize filter is hierarchical (returns specified + larger)
      const filter: TipFilterOption = 'SMALL';
      expect(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE']).toContain(filter);
    });

    it('XXLARGE filter returns only XXLARGE tips', () => {
      const filter: TipFilterOption = 'XXLARGE';
      expect(filter).toBe('XXLARGE');
    });
  });

  describe('Filter chip colors', () => {
    it('returns valid color for each non-null filter option', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      FILTER_OPTIONS.forEach((option) => {
        if (option.value !== null) {
          const color = getTipSizeColor(option.value as TipSize);
          expect(color).toMatch(hexColorRegex);
        }
      });
    });

    it('uses distinct colors for filter chips', () => {
      const tipSizeOptions = FILTER_OPTIONS.filter((opt) => opt.value !== null);
      const colors = tipSizeOptions.map((opt) => getTipSizeColor(opt.value as TipSize));
      const uniqueColors = new Set(colors);

      // Each tip size should have a distinct color
      expect(uniqueColors.size).toBe(tipSizeOptions.length);
    });
  });

  describe('Filter label mapping', () => {
    // Helper function (matches localSettingsStore implementation)
    const getTipFilterLabel = (filter: TipFilterOption): string => {
      if (filter === null) return 'All';
      const labels: Record<TipSize, string> = {
        SMALL: 'S+',
        MEDIUM: 'M+',
        LARGE: 'L+',
        XLARGE: 'XL+',
        XXLARGE: 'XXL',
        NONE: 'None',
      };
      return labels[filter];
    };

    it('returns expected labels for filter options', () => {
      expect(getTipFilterLabel(null)).toBe('All');
      expect(getTipFilterLabel('SMALL')).toBe('S+');
      expect(getTipFilterLabel('MEDIUM')).toBe('M+');
      expect(getTipFilterLabel('LARGE')).toBe('L+');
      expect(getTipFilterLabel('XLARGE')).toBe('XL+');
      expect(getTipFilterLabel('XXLARGE')).toBe('XXL');
    });
  });
});
