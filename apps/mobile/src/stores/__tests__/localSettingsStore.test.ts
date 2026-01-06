/**
 * LocalSettingsStore Tests
 * Story 10-4: Tip Filter Controls
 *
 * Tests for the local settings store persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSettingsStore, getTipFilterLabel } from '../localSettingsStore';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('localSettingsStore - Story 10-4', () => {
  beforeEach(() => {
    // Reset store state
    useLocalSettingsStore.setState({
      tipSizeFilter: null,
      isLoaded: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('has null tipSizeFilter by default', () => {
      const state = useLocalSettingsStore.getState();
      expect(state.tipSizeFilter).toBeNull();
    });

    it('has isLoaded false by default', () => {
      const state = useLocalSettingsStore.getState();
      expect(state.isLoaded).toBe(false);
    });
  });

  describe('loadSettings', () => {
    it('loads persisted filter value from AsyncStorage', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue('LARGE');

      await useLocalSettingsStore.getState().loadSettings();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('tip_size_filter');
      expect(useLocalSettingsStore.getState().tipSizeFilter).toBe('LARGE');
      expect(useLocalSettingsStore.getState().isLoaded).toBe(true);
    });

    it('handles null stored value correctly', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue('null');

      await useLocalSettingsStore.getState().loadSettings();

      expect(useLocalSettingsStore.getState().tipSizeFilter).toBeNull();
      expect(useLocalSettingsStore.getState().isLoaded).toBe(true);
    });

    it('handles missing stored value (first run)', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);

      await useLocalSettingsStore.getState().loadSettings();

      expect(useLocalSettingsStore.getState().tipSizeFilter).toBeNull();
      expect(useLocalSettingsStore.getState().isLoaded).toBe(true);
    });

    it('handles storage errors gracefully', async () => {
      vi.mocked(AsyncStorage.getItem).mockRejectedValue(new Error('Storage error'));

      await useLocalSettingsStore.getState().loadSettings();

      // Should still set isLoaded to true even on error
      expect(useLocalSettingsStore.getState().isLoaded).toBe(true);
    });
  });

  describe('setTipSizeFilter', () => {
    it('updates state immediately', async () => {
      await useLocalSettingsStore.getState().setTipSizeFilter('XLARGE');

      expect(useLocalSettingsStore.getState().tipSizeFilter).toBe('XLARGE');
    });

    it('persists TipSize values to AsyncStorage', async () => {
      await useLocalSettingsStore.getState().setTipSizeFilter('MEDIUM');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('tip_size_filter', 'MEDIUM');
    });

    it('persists null as "null" string', async () => {
      await useLocalSettingsStore.getState().setTipSizeFilter(null);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('tip_size_filter', 'null');
    });

    it('handles persistence errors gracefully', async () => {
      vi.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(
        useLocalSettingsStore.getState().setTipSizeFilter('LARGE')
      ).resolves.not.toThrow();

      // State should still be updated
      expect(useLocalSettingsStore.getState().tipSizeFilter).toBe('LARGE');
    });
  });

  describe('getTipFilterLabel', () => {
    it('returns "All" for null filter', () => {
      expect(getTipFilterLabel(null)).toBe('All');
    });

    it('returns correct labels for each TipSize', () => {
      expect(getTipFilterLabel('SMALL')).toBe('S+');
      expect(getTipFilterLabel('MEDIUM')).toBe('M+');
      expect(getTipFilterLabel('LARGE')).toBe('L+');
      expect(getTipFilterLabel('XLARGE')).toBe('XL+');
      expect(getTipFilterLabel('XXLARGE')).toBe('XXL');
      expect(getTipFilterLabel('NONE')).toBe('None');
    });
  });

  describe('persistence across sessions', () => {
    it('persisted filter is restored on loadSettings', async () => {
      // Simulate persisting a filter
      await useLocalSettingsStore.getState().setTipSizeFilter('XLARGE');

      // Simulate returning to the store key
      vi.mocked(AsyncStorage.getItem).mockResolvedValue('XLARGE');

      // Reset state to simulate new session
      useLocalSettingsStore.setState({ tipSizeFilter: null, isLoaded: false });

      // Load settings
      await useLocalSettingsStore.getState().loadSettings();

      expect(useLocalSettingsStore.getState().tipSizeFilter).toBe('XLARGE');
    });
  });
});
