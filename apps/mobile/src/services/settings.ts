import api from './api';

/**
 * User notification preferences
 */
export interface UserPreferences {
  notificationsEnabled: boolean;
  zoneAlertsEnabled: boolean;
  syncErrorAlertsEnabled: boolean;
}

/**
 * Update preferences request - all fields optional
 */
export interface UpdatePreferencesRequest {
  notificationsEnabled?: boolean;
  zoneAlertsEnabled?: boolean;
  syncErrorAlertsEnabled?: boolean;
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Custom error class for settings service errors
 */
export class SettingsServiceError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SettingsServiceError';
    this.code = code;
  }
}

/**
 * Get current user's notification preferences
 * GET /api/v1/users/preferences
 */
export async function getPreferences(): Promise<UserPreferences> {
  try {
    const response = await api.get<ApiResponse<{ preferences: UserPreferences }>>('/users/preferences');

    if (!response.data.success || !response.data.data?.preferences) {
      throw new SettingsServiceError('Failed to fetch preferences', 'FETCH_ERROR');
    }

    return response.data.data.preferences;
  } catch (error) {
    if (error instanceof SettingsServiceError) {
      throw error;
    }

    // Handle axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
      const message = axiosError.response?.data?.error?.message || 'Failed to fetch preferences';
      throw new SettingsServiceError(message, 'NETWORK_ERROR');
    }

    throw new SettingsServiceError('Failed to fetch preferences. Please try again.', 'UNKNOWN');
  }
}

/**
 * Update current user's notification preferences
 * PUT /api/v1/users/preferences
 */
export async function updatePreferences(data: UpdatePreferencesRequest): Promise<UserPreferences> {
  try {
    const response = await api.put<ApiResponse<{ preferences: UserPreferences }>>('/users/preferences', data);

    if (!response.data.success || !response.data.data?.preferences) {
      throw new SettingsServiceError('Failed to update preferences', 'UPDATE_ERROR');
    }

    return response.data.data.preferences;
  } catch (error) {
    if (error instanceof SettingsServiceError) {
      throw error;
    }

    // Handle axios errors with validation messages
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: { error?: { message?: string } } } };
      const message = axiosError.response?.data?.error?.message || 'Failed to update preferences';
      const code = axiosError.response?.status === 400 ? 'VALIDATION_ERROR' : 'NETWORK_ERROR';
      throw new SettingsServiceError(message, code);
    }

    throw new SettingsServiceError('Failed to update preferences. Please try again.', 'UNKNOWN');
  }
}
