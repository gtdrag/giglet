import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';
import * as settingsService from '../../services/settings';

// Mock the settings service
vi.mock('../../services/settings', () => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
  SettingsServiceError: class SettingsServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'SettingsServiceError';
      this.code = code;
    }
  },
}));

describe('settingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useSettingsStore.setState({
      preferences: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadPreferences', () => {
    it('fetches and stores preferences on success', async () => {
      const mockPreferences = {
        notificationsEnabled: true,
        zoneAlertsEnabled: false,
        syncErrorAlertsEnabled: true,
      };

      vi.mocked(settingsService.getPreferences).mockResolvedValueOnce(mockPreferences);

      await useSettingsStore.getState().loadPreferences();

      expect(settingsService.getPreferences).toHaveBeenCalledOnce();
      expect(useSettingsStore.getState().preferences).toEqual(mockPreferences);
      expect(useSettingsStore.getState().isLoading).toBe(false);
      expect(useSettingsStore.getState().error).toBeNull();
    });

    it('sets loading state while fetching', async () => {
      const mockPreferences = {
        notificationsEnabled: true,
        zoneAlertsEnabled: true,
        syncErrorAlertsEnabled: true,
      };

      let resolvePromise: (value: typeof mockPreferences) => void;
      const promise = new Promise<typeof mockPreferences>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(settingsService.getPreferences).mockReturnValueOnce(promise);

      const loadPromise = useSettingsStore.getState().loadPreferences();

      // Check loading state is true
      expect(useSettingsStore.getState().isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!(mockPreferences);
      await loadPromise;

      // Check loading state is false after completion
      expect(useSettingsStore.getState().isLoading).toBe(false);
    });

    it('sets error on fetch failure', async () => {
      const error = new settingsService.SettingsServiceError('Network error', 'NETWORK_ERROR');
      vi.mocked(settingsService.getPreferences).mockRejectedValueOnce(error);

      await useSettingsStore.getState().loadPreferences();

      expect(useSettingsStore.getState().preferences).toBeNull();
      expect(useSettingsStore.getState().isLoading).toBe(false);
      expect(useSettingsStore.getState().error).toBe('Network error');
    });

    it('sets generic error message for non-service errors', async () => {
      vi.mocked(settingsService.getPreferences).mockRejectedValueOnce(new Error('Unknown'));

      await useSettingsStore.getState().loadPreferences();

      expect(useSettingsStore.getState().error).toBe('Failed to load preferences');
    });
  });

  describe('updatePreference', () => {
    const initialPreferences = {
      notificationsEnabled: true,
      zoneAlertsEnabled: true,
      syncErrorAlertsEnabled: true,
    };

    beforeEach(() => {
      useSettingsStore.setState({ preferences: initialPreferences });
    });

    it('performs optimistic update immediately', async () => {
      const updatedPreferences = {
        ...initialPreferences,
        zoneAlertsEnabled: false,
      };

      vi.mocked(settingsService.updatePreferences).mockResolvedValueOnce(updatedPreferences);

      const updatePromise = useSettingsStore.getState().updatePreference('zoneAlertsEnabled', false);

      // Check optimistic update happened immediately
      expect(useSettingsStore.getState().preferences?.zoneAlertsEnabled).toBe(false);

      await updatePromise;

      // Verify final state
      expect(useSettingsStore.getState().preferences).toEqual(updatedPreferences);
    });

    it('calls API with correct parameters', async () => {
      const updatedPreferences = {
        ...initialPreferences,
        notificationsEnabled: false,
      };

      vi.mocked(settingsService.updatePreferences).mockResolvedValueOnce(updatedPreferences);

      await useSettingsStore.getState().updatePreference('notificationsEnabled', false);

      expect(settingsService.updatePreferences).toHaveBeenCalledWith({ notificationsEnabled: false });
    });

    it('reverts on API error', async () => {
      const error = new settingsService.SettingsServiceError('Update failed', 'UPDATE_ERROR');
      vi.mocked(settingsService.updatePreferences).mockRejectedValueOnce(error);

      await expect(
        useSettingsStore.getState().updatePreference('zoneAlertsEnabled', false)
      ).rejects.toThrow();

      // Verify rollback to original state
      expect(useSettingsStore.getState().preferences?.zoneAlertsEnabled).toBe(true);
      expect(useSettingsStore.getState().error).toBe('Update failed');
    });

    it('sets generic error message for non-service errors', async () => {
      vi.mocked(settingsService.updatePreferences).mockRejectedValueOnce(new Error('Unknown'));

      await expect(
        useSettingsStore.getState().updatePreference('zoneAlertsEnabled', false)
      ).rejects.toThrow();

      expect(useSettingsStore.getState().error).toBe('Failed to update preference');
    });

    it('clears previous error on new update', async () => {
      useSettingsStore.setState({ error: 'Previous error' });

      const updatedPreferences = { ...initialPreferences, zoneAlertsEnabled: false };
      vi.mocked(settingsService.updatePreferences).mockResolvedValueOnce(updatedPreferences);

      await useSettingsStore.getState().updatePreference('zoneAlertsEnabled', false);

      expect(useSettingsStore.getState().error).toBeNull();
    });
  });

  describe('setPreferences', () => {
    it('sets preferences directly', () => {
      const preferences = {
        notificationsEnabled: false,
        zoneAlertsEnabled: false,
        syncErrorAlertsEnabled: false,
      };

      useSettingsStore.getState().setPreferences(preferences);

      expect(useSettingsStore.getState().preferences).toEqual(preferences);
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useSettingsStore.setState({ error: 'Some error' });

      useSettingsStore.getState().clearError();

      expect(useSettingsStore.getState().error).toBeNull();
    });
  });
});
