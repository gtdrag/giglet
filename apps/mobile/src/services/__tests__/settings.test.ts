import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPreferences, updatePreferences, SettingsServiceError } from '../settings';
import api from '../api';

// Mock the api module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('Settings Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPreferences', () => {
    const mockPreferences = {
      notificationsEnabled: true,
      zoneAlertsEnabled: true,
      syncErrorAlertsEnabled: false,
    };

    it('returns user preferences on success', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: { preferences: mockPreferences },
        },
      });

      const result = await getPreferences();

      expect(result).toEqual(mockPreferences);
      expect(api.get).toHaveBeenCalledWith('/users/preferences');
    });

    it('throws SettingsServiceError on API failure', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Preferences not found' },
        },
      });

      await expect(getPreferences()).rejects.toThrow(SettingsServiceError);
    });

    it('throws SettingsServiceError with network error message', async () => {
      vi.mocked(api.get).mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Network error' },
          },
        },
      });

      await expect(getPreferences()).rejects.toThrow('Network error');
    });

    it('throws SettingsServiceError with default message on unknown error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unknown'));

      await expect(getPreferences()).rejects.toThrow('Failed to fetch preferences. Please try again.');
    });
  });

  describe('updatePreferences', () => {
    const mockUpdatedPreferences = {
      notificationsEnabled: true,
      zoneAlertsEnabled: false,
      syncErrorAlertsEnabled: true,
    };

    it('returns updated preferences on success', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          success: true,
          data: { preferences: mockUpdatedPreferences },
        },
      });

      const result = await updatePreferences({ zoneAlertsEnabled: false });

      expect(result).toEqual(mockUpdatedPreferences);
      expect(api.put).toHaveBeenCalledWith('/users/preferences', { zoneAlertsEnabled: false });
    });

    it('sends all provided fields in request', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          success: true,
          data: { preferences: mockUpdatedPreferences },
        },
      });

      await updatePreferences({
        notificationsEnabled: true,
        zoneAlertsEnabled: false,
        syncErrorAlertsEnabled: true,
      });

      expect(api.put).toHaveBeenCalledWith('/users/preferences', {
        notificationsEnabled: true,
        zoneAlertsEnabled: false,
        syncErrorAlertsEnabled: true,
      });
    });

    it('throws SettingsServiceError on API failure', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'UPDATE_ERROR', message: 'Update failed' },
        },
      });

      await expect(updatePreferences({ zoneAlertsEnabled: false })).rejects.toThrow(SettingsServiceError);
    });

    it('throws SettingsServiceError with validation error on 400 response', async () => {
      vi.mocked(api.put).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: { message: 'Invalid preference value' },
          },
        },
      });

      try {
        await updatePreferences({ zoneAlertsEnabled: false });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SettingsServiceError);
        expect((error as SettingsServiceError).message).toBe('Invalid preference value');
        expect((error as SettingsServiceError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('throws SettingsServiceError with network error on non-400 response', async () => {
      vi.mocked(api.put).mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: { message: 'Server error' },
          },
        },
      });

      try {
        await updatePreferences({ zoneAlertsEnabled: false });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SettingsServiceError);
        expect((error as SettingsServiceError).code).toBe('NETWORK_ERROR');
      }
    });

    it('throws SettingsServiceError with default message on unknown error', async () => {
      vi.mocked(api.put).mockRejectedValueOnce(new Error('Unknown'));

      await expect(updatePreferences({ zoneAlertsEnabled: false })).rejects.toThrow(
        'Failed to update preferences. Please try again.'
      );
    });
  });

  describe('SettingsServiceError', () => {
    it('creates error with correct properties', () => {
      const error = new SettingsServiceError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('SettingsServiceError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
