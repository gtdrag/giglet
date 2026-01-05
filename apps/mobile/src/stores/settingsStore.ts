import { create } from 'zustand';
import * as settingsService from '../services/settings';
import type { UserPreferences, UpdatePreferencesRequest } from '../services/settings';

interface SettingsState {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPreferences: () => Promise<void>;
  updatePreference: (key: keyof UserPreferences, value: boolean) => Promise<void>;
  setPreferences: (preferences: UserPreferences) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Settings store for managing user notification preferences
 * Uses optimistic updates for immediate UI feedback
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  preferences: null,
  isLoading: false,
  error: null,

  loadPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const preferences = await settingsService.getPreferences();
      set({ preferences, isLoading: false });
    } catch (error) {
      if (error instanceof settingsService.SettingsServiceError) {
        set({ isLoading: false, error: error.message });
      } else {
        set({ isLoading: false, error: 'Failed to load preferences' });
      }
    }
  },

  updatePreference: async (key: keyof UserPreferences, value: boolean) => {
    const currentPreferences = get().preferences;

    // Store previous state for rollback
    const previousPreferences = currentPreferences ? { ...currentPreferences } : null;

    // Optimistic update - immediately update UI
    if (currentPreferences) {
      set({
        preferences: { ...currentPreferences, [key]: value },
        error: null,
      });
    }

    try {
      // Send update to API
      const updateData: UpdatePreferencesRequest = { [key]: value };
      const updatedPreferences = await settingsService.updatePreferences(updateData);

      // Update with server response (in case of any transformations)
      set({ preferences: updatedPreferences });
    } catch (error) {
      // Rollback on error
      set({ preferences: previousPreferences });

      if (error instanceof settingsService.SettingsServiceError) {
        set({ error: error.message });
      } else {
        set({ error: 'Failed to update preference' });
      }

      // Re-throw so UI can handle if needed
      throw error;
    }
  },

  setPreferences: (preferences) => set({ preferences }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));
