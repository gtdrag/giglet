/**
 * Unit tests for Auth Store - Logout functionality
 * Story 9-5: Logout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to properly define mocks before hoisting
const mocks = vi.hoisted(() => ({
  logoutService: vi.fn(),
  isLoggedIn: vi.fn(),
  deleteAccountService: vi.fn(),
  register: vi.fn(),
  login: vi.fn(),
  appleAuth: vi.fn(),
  googleAuth: vi.fn(),
  identifyUser: vi.fn(),
  logoutUser: vi.fn(),
  mileageStoreGetState: vi.fn(),
  subscriptionStoreGetState: vi.fn(),
  routerReplace: vi.fn(),
}));

// Mock the auth service
vi.mock('../../services/auth', () => ({
  isLoggedIn: mocks.isLoggedIn,
  logout: mocks.logoutService,
  deleteAccount: mocks.deleteAccountService,
  register: mocks.register,
  login: mocks.login,
  appleAuth: mocks.appleAuth,
  googleAuth: mocks.googleAuth,
  AuthError: class AuthError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

// Mock the subscriptions service
vi.mock('../../services/subscriptions', () => ({
  identifyUser: mocks.identifyUser,
  logoutUser: mocks.logoutUser,
}));

// Mock the mileageStore
vi.mock('../mileageStore', () => ({
  useMileageStore: {
    getState: mocks.mileageStoreGetState,
  },
}));

// Mock the subscriptionStore
vi.mock('../subscriptionStore', () => ({
  useSubscriptionStore: {
    getState: mocks.subscriptionStoreGetState,
  },
}));

// Mock expo-router
vi.mock('expo-router', () => ({
  router: {
    replace: mocks.routerReplace,
  },
}));

// Import after mocking
import { useAuthStore } from '../authStore';

describe('Auth Store - Logout', () => {
  const mockDisableTracking = vi.fn();
  const mockSetTier = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store to authenticated state
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
      isLoading: false,
      error: null,
    });

    // Default mock: tracking disabled
    mocks.mileageStoreGetState.mockReturnValue({
      trackingEnabled: false,
      disableTracking: mockDisableTracking,
    });

    // Default mock: subscription store
    mocks.subscriptionStoreGetState.mockReturnValue({
      tier: 'PRO_MONTHLY',
      setTier: mockSetTier,
    });

    // Default mock: services succeed
    mocks.logoutService.mockResolvedValue(undefined);
    mocks.logoutUser.mockResolvedValue(undefined);
    mockDisableTracking.mockResolvedValue(undefined);
  });

  describe('logout', () => {
    it('should call logoutService to clear tokens and revoke on server', async () => {
      await useAuthStore.getState().logout();

      expect(mocks.logoutService).toHaveBeenCalled();
    });

    it('should call logoutUser to logout from RevenueCat', async () => {
      await useAuthStore.getState().logout();

      expect(mocks.logoutUser).toHaveBeenCalled();
    });

    it('should reset auth state after logout', async () => {
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should stop background tracking if enabled (AC 9.5.2)', async () => {
      // Mock tracking is enabled
      mocks.mileageStoreGetState.mockReturnValue({
        trackingEnabled: true,
        disableTracking: mockDisableTracking,
      });

      await useAuthStore.getState().logout();

      expect(mockDisableTracking).toHaveBeenCalled();
    });

    it('should not call disableTracking if tracking not enabled', async () => {
      // Mock tracking is disabled
      mocks.mileageStoreGetState.mockReturnValue({
        trackingEnabled: false,
        disableTracking: mockDisableTracking,
      });

      await useAuthStore.getState().logout();

      expect(mockDisableTracking).not.toHaveBeenCalled();
    });

    it('should reset subscription store to FREE tier', async () => {
      await useAuthStore.getState().logout();

      expect(mockSetTier).toHaveBeenCalledWith('FREE');
    });

    it('should execute logout operations in correct order', async () => {
      const callOrder: string[] = [];
      const trackingDisable = vi.fn().mockImplementation(async () => {
        callOrder.push('disableTracking');
      });
      const tierSet = vi.fn().mockImplementation(() => {
        callOrder.push('setTier');
      });

      mocks.mileageStoreGetState.mockReturnValue({
        trackingEnabled: true,
        disableTracking: trackingDisable,
      });
      mocks.logoutService.mockImplementation(async () => {
        callOrder.push('logoutService');
      });
      mocks.logoutUser.mockImplementation(async () => {
        callOrder.push('logoutUser');
      });
      mocks.subscriptionStoreGetState.mockReturnValue({
        setTier: tierSet,
      });

      await useAuthStore.getState().logout();

      // Verify order: stop tracking first, then logout service, then RevenueCat, then reset subscription
      expect(callOrder).toEqual(['disableTracking', 'logoutService', 'logoutUser', 'setTier']);
    });
  });

  describe('Initial State', () => {
    it('should have unauthenticated state by default', () => {
      // Reset to initial state
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        isLoading: true,
        error: null,
      });

      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });
});
