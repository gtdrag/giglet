/**
 * Local Settings Store
 * Story 10-4: Tip Filter Controls
 *
 * Persists local app settings (not user account settings) using AsyncStorage.
 * These settings are device-specific and don't sync to the server.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TipSize } from '../services/tips';

// Storage keys
const TIP_SIZE_FILTER_KEY = 'tip_size_filter';

// Types
export type TipFilterValue = TipSize | null; // null = show all tips

interface LocalSettingsState {
  /** Minimum tip size filter for map (null = show all) */
  tipSizeFilter: TipFilterValue;
  /** Whether settings have been loaded from storage */
  isLoaded: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  setTipSizeFilter: (filter: TipFilterValue) => Promise<void>;
}

/**
 * Local settings store for device-specific preferences
 * Uses AsyncStorage for persistence across app restarts
 */
export const useLocalSettingsStore = create<LocalSettingsState>((set, get) => ({
  tipSizeFilter: null,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const storedFilter = await AsyncStorage.getItem(TIP_SIZE_FILTER_KEY);
      if (storedFilter) {
        // Parse stored value - null is stored as 'null' string
        const parsed = storedFilter === 'null' ? null : (storedFilter as TipSize);
        set({ tipSizeFilter: parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.warn('Failed to load local settings:', error);
      set({ isLoaded: true });
    }
  },

  setTipSizeFilter: async (filter: TipFilterValue) => {
    // Update state immediately (optimistic)
    set({ tipSizeFilter: filter });

    // Persist to AsyncStorage
    try {
      // Store null as 'null' string to distinguish from missing value
      await AsyncStorage.setItem(TIP_SIZE_FILTER_KEY, filter === null ? 'null' : filter);
    } catch (error) {
      console.warn('Failed to persist tip size filter:', error);
    }
  },
}));

/**
 * Helper to get tip filter label for display
 */
export function getTipFilterLabel(filter: TipFilterValue): string {
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
}
