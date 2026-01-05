import api from './api';

/**
 * User profile response from API
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  authProvider: 'EMAIL' | 'APPLE' | 'GOOGLE';
  createdAt: string;
}

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  name: string;
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
 * Custom error class for user service errors
 */
export class UserServiceError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'UserServiceError';
    this.code = code;
  }
}

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export async function getProfile(): Promise<UserProfile> {
  try {
    const response = await api.get<ApiResponse<{ user: UserProfile }>>('/auth/me');

    if (!response.data.success || !response.data.data?.user) {
      throw new UserServiceError('Failed to fetch profile', 'FETCH_ERROR');
    }

    // Handle the existing /auth/me response format which returns user data at top level
    const data = response.data.data;
    if ('user' in data) {
      return data.user;
    }
    // Fallback for direct user data (existing /auth/me format)
    return data as unknown as UserProfile;
  } catch (error) {
    if (error instanceof UserServiceError) {
      throw error;
    }

    // Handle axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
      const message = axiosError.response?.data?.error?.message || 'Failed to fetch profile';
      throw new UserServiceError(message, 'NETWORK_ERROR');
    }

    throw new UserServiceError('Failed to fetch profile. Please try again.', 'UNKNOWN');
  }
}

/**
 * Update current user profile
 * PUT /api/v1/auth/me
 */
export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  try {
    const response = await api.put<ApiResponse<{ user: UserProfile }>>('/auth/me', data);

    if (!response.data.success || !response.data.data?.user) {
      throw new UserServiceError('Failed to update profile', 'UPDATE_ERROR');
    }

    return response.data.data.user;
  } catch (error) {
    if (error instanceof UserServiceError) {
      throw error;
    }

    // Handle axios errors with validation messages
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: { error?: { message?: string } } } };
      const message = axiosError.response?.data?.error?.message || 'Failed to update profile';
      const code = axiosError.response?.status === 400 ? 'VALIDATION_ERROR' : 'NETWORK_ERROR';
      throw new UserServiceError(message, code);
    }

    throw new UserServiceError('Failed to update profile. Please try again.', 'UNKNOWN');
  }
}
