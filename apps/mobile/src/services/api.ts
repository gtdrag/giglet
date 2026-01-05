import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// API base URL from environment or platform-specific default
// Android emulator uses 10.0.2.2 to reach host, iOS simulator uses localhost
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://api.giglet.app/api/v1';
  }

  // Use environment variable if set
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return `${envUrl}/api/v1`;
  }

  // Platform-specific defaults for dev
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:3001/api/v1'
    : 'http://localhost:3001/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Token storage keys
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'giglet_access_token',
  REFRESH_TOKEN: 'giglet_refresh_token',
} as const;

/**
 * Create Axios instance with interceptors for auth
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Request interceptor - add auth token to requests
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore secure store errors
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handle token refresh on 401
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // If we get a 401 and haven't retried yet, try to refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !(originalRequest as { _retry?: boolean })._retry
    ) {
      (originalRequest as { _retry?: boolean })._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Call refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Store new tokens
        await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed - clear tokens and let error propagate
        await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Store tokens securely
 */
export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
  await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
}

/**
 * Clear stored tokens
 */
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
}

/**
 * Check if user has stored tokens
 */
export async function hasStoredTokens(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
  return !!token;
}

export default api;
