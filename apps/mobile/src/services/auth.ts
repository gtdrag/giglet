import api, { storeTokens, clearTokens, hasStoredTokens } from './api';
import { AxiosError } from 'axios';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AppleAuthInput {
  identityToken: string;
  user?: string;
  email?: string;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  };
}

export interface GoogleAuthInput {
  idToken: string;
}

/**
 * Register a new user
 */
export async function register(input: RegisterInput): Promise<AuthResponse> {
  try {
    const response = await api.post<{ success: true; data: AuthResponse }>('/auth/register', input);

    const { accessToken, refreshToken, user } = response.data.data;

    // Store tokens securely
    await storeTokens(accessToken, refreshToken);

    return { user, accessToken, refreshToken };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const apiError = error.response.data.error as ApiError;
      throw new AuthError(apiError.code, apiError.message, apiError.details);
    }
    throw error;
  }
}

/**
 * Login with email and password
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  try {
    const response = await api.post<{ success: true; data: AuthResponse }>('/auth/login', input);

    const { accessToken, refreshToken, user } = response.data.data;

    // Store tokens securely
    await storeTokens(accessToken, refreshToken);

    return { user, accessToken, refreshToken };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const apiError = error.response.data.error as ApiError;
      throw new AuthError(apiError.code, apiError.message, apiError.details);
    }
    throw error;
  }
}

/**
 * Sign in with Apple
 */
export async function appleAuth(input: AppleAuthInput): Promise<AuthResponse> {
  try {
    const response = await api.post<{ success: true; data: AuthResponse }>('/auth/apple', input);

    const { accessToken, refreshToken, user } = response.data.data;

    // Store tokens securely
    await storeTokens(accessToken, refreshToken);

    return { user, accessToken, refreshToken };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const apiError = error.response.data.error as ApiError;
      throw new AuthError(apiError.code, apiError.message, apiError.details);
    }
    throw error;
  }
}

/**
 * Sign in with Google
 */
export async function googleAuth(input: GoogleAuthInput): Promise<AuthResponse> {
  try {
    const response = await api.post<{ success: true; data: AuthResponse }>('/auth/google', input);

    const { accessToken, refreshToken, user } = response.data.data;

    // Store tokens securely
    await storeTokens(accessToken, refreshToken);

    return { user, accessToken, refreshToken };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const apiError = error.response.data.error as ApiError;
      throw new AuthError(apiError.code, apiError.message, apiError.details);
    }
    throw error;
  }
}

/**
 * Logout user and clear tokens
 */
export async function logout(): Promise<void> {
  await clearTokens();
}

/**
 * Check if user is logged in (has tokens)
 */
export async function isLoggedIn(): Promise<boolean> {
  return hasStoredTokens();
}

/**
 * Custom error class for auth errors
 */
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AuthError';
  }

  /**
   * Get first error message for a field
   */
  getFieldError(field: string): string | undefined {
    return this.details?.[field]?.[0];
  }
}
