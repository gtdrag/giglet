/**
 * Unit tests for Auth Service - Logout functionality
 * Story 9-5: Logout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to properly define mocks before hoisting
const mocks = vi.hoisted(() => ({
  secureStoreGetItemAsync: vi.fn(),
  secureStoreSetItemAsync: vi.fn(),
  secureStoreDeleteItemAsync: vi.fn(),
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
  clearTokens: vi.fn(),
  storeTokens: vi.fn(),
  hasStoredTokens: vi.fn(),
}));

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  getItemAsync: mocks.secureStoreGetItemAsync,
  setItemAsync: mocks.secureStoreSetItemAsync,
  deleteItemAsync: mocks.secureStoreDeleteItemAsync,
}));

// Mock API module
vi.mock('../api', () => ({
  default: {
    post: mocks.apiPost,
    get: mocks.apiGet,
    delete: mocks.apiDelete,
  },
  storeTokens: mocks.storeTokens,
  clearTokens: mocks.clearTokens,
  hasStoredTokens: mocks.hasStoredTokens,
  TOKEN_KEYS: {
    ACCESS_TOKEN: 'giglet_access_token',
    REFRESH_TOKEN: 'giglet_refresh_token',
  },
}));

// Import after mocking
import { logout } from '../auth';

describe('Auth Service - Logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logout', () => {
    it('should get refresh token from SecureStore before logout', async () => {
      mocks.secureStoreGetItemAsync.mockResolvedValue('test-refresh-token');
      mocks.apiPost.mockResolvedValue({ data: { success: true } });

      await logout();

      expect(mocks.secureStoreGetItemAsync).toHaveBeenCalledWith('giglet_refresh_token');
    });

    it('should call POST /auth/logout with refresh token', async () => {
      const testRefreshToken = 'test-refresh-token-123';
      mocks.secureStoreGetItemAsync.mockResolvedValue(testRefreshToken);
      mocks.apiPost.mockResolvedValue({ data: { success: true } });

      await logout();

      expect(mocks.apiPost).toHaveBeenCalledWith('/auth/logout', { refreshToken: testRefreshToken });
    });

    it('should clear tokens after successful server logout', async () => {
      mocks.secureStoreGetItemAsync.mockResolvedValue('test-refresh-token');
      mocks.apiPost.mockResolvedValue({ data: { success: true } });

      await logout();

      expect(mocks.clearTokens).toHaveBeenCalled();
    });

    it('should clear tokens even if server logout fails', async () => {
      mocks.secureStoreGetItemAsync.mockResolvedValue('test-refresh-token');
      mocks.apiPost.mockRejectedValue(new Error('Network error'));

      await logout();

      // Should still clear tokens locally
      expect(mocks.clearTokens).toHaveBeenCalled();
    });

    it('should skip server call if no refresh token exists', async () => {
      mocks.secureStoreGetItemAsync.mockResolvedValue(null);

      await logout();

      expect(mocks.apiPost).not.toHaveBeenCalled();
      expect(mocks.clearTokens).toHaveBeenCalled();
    });

    it('should not throw error even if server logout fails', async () => {
      mocks.secureStoreGetItemAsync.mockResolvedValue('test-refresh-token');
      mocks.apiPost.mockRejectedValue(new Error('Server error'));

      // Should not throw
      await expect(logout()).resolves.not.toThrow();
    });
  });
});
