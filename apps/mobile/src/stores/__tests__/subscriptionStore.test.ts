/**
 * Unit tests for Subscription Store
 * Story 8-3: Pro Annual Subscription Purchase - Verify store handles PRO_ANNUAL tier
 * Story 8-5: Subscription Cancellation Handling - Verify canceled state handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubscriptionStore, PRO_FEATURES } from '../subscriptionStore';

// Mock the API module
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock the subscriptions service
vi.mock('../../services/subscriptions', () => ({
  getCustomerInfo: vi.fn(),
  getSubscriptionDetails: vi.fn(),
}));

import api from '../../services/api';
import { getCustomerInfo, getSubscriptionDetails } from '../../services/subscriptions';
const mockApi = vi.mocked(api);
const mockGetCustomerInfo = vi.mocked(getCustomerInfo);
const mockGetSubscriptionDetails = vi.mocked(getSubscriptionDetails);

describe('Subscription Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useSubscriptionStore.setState({
      tier: 'FREE',
      isProUser: false,
      expiresAt: null,
      willRenew: false,
      isCanceled: false,
      isLoading: false,
      error: null,
    });
    // Default mock: RevenueCat returns active renewing subscription
    mockGetCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });
    mockGetSubscriptionDetails.mockReturnValue({
      isProUser: false,
      tier: 'FREE',
      expiresAt: null,
      willRenew: true,
    });
  });

  describe('Initial State', () => {
    it('should have FREE tier by default', () => {
      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('FREE');
      expect(state.isProUser).toBe(false);
      expect(state.expiresAt).toBeNull();
      expect(state.willRenew).toBe(false);
      expect(state.isCanceled).toBe(false);
    });
  });

  describe('loadSubscription', () => {
    it('should load PRO_ANNUAL tier from API', async () => {
      const expirationDate = '2027-01-04T00:00:00.000Z';
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            id: 'user-123',
            email: 'test@example.com',
            subscription: {
              tier: 'PRO_ANNUAL',
              status: 'ACTIVE',
              currentPeriodEnd: expirationDate,
            },
          },
        },
      });
      mockGetSubscriptionDetails.mockReturnValue({
        isProUser: true,
        tier: 'PRO_ANNUAL',
        expiresAt: new Date(expirationDate),
        willRenew: true,
      });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('PRO_ANNUAL');
      expect(state.isProUser).toBe(true);
      expect(state.expiresAt).toBeInstanceOf(Date);
      expect(state.expiresAt?.toISOString()).toBe(expirationDate);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should load PRO_MONTHLY tier from API', async () => {
      const expirationDate = '2026-02-04T00:00:00.000Z';
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            id: 'user-123',
            subscription: {
              tier: 'PRO_MONTHLY',
              status: 'ACTIVE',
              currentPeriodEnd: expirationDate,
            },
          },
        },
      });
      mockGetSubscriptionDetails.mockReturnValue({
        isProUser: true,
        tier: 'PRO_MONTHLY',
        expiresAt: new Date(expirationDate),
        willRenew: true,
      });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('PRO_MONTHLY');
      expect(state.isProUser).toBe(true);
    });

    it('should set FREE tier when no subscription record', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            id: 'user-123',
            email: 'test@example.com',
            subscription: null,
          },
        },
      });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('FREE');
      expect(state.isProUser).toBe(false);
      expect(state.expiresAt).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('FREE');
      expect(state.isProUser).toBe(false);
      expect(state.error).toBe('Failed to load subscription status');
    });

    it('should set isLoading during API call', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApi.get.mockReturnValue(promise as Promise<unknown>);

      // Start loading
      const loadPromise = useSubscriptionStore.getState().loadSubscription();

      // Check loading state
      expect(useSubscriptionStore.getState().isLoading).toBe(true);

      // Resolve the API call
      resolvePromise!({
        data: {
          data: {
            subscription: { tier: 'FREE' },
          },
        },
      });

      await loadPromise;

      expect(useSubscriptionStore.getState().isLoading).toBe(false);
    });
  });

  describe('canAccess', () => {
    it('should allow PRO_ANNUAL users to access all Pro features', () => {
      useSubscriptionStore.setState({ tier: 'PRO_ANNUAL', isProUser: true });

      PRO_FEATURES.forEach((feature) => {
        expect(useSubscriptionStore.getState().canAccess(feature)).toBe(true);
      });
    });

    it('should allow PRO_MONTHLY users to access all Pro features', () => {
      useSubscriptionStore.setState({ tier: 'PRO_MONTHLY', isProUser: true });

      PRO_FEATURES.forEach((feature) => {
        expect(useSubscriptionStore.getState().canAccess(feature)).toBe(true);
      });
    });

    it('should deny FREE users access to Pro features', () => {
      useSubscriptionStore.setState({ tier: 'FREE', isProUser: false });

      PRO_FEATURES.forEach((feature) => {
        expect(useSubscriptionStore.getState().canAccess(feature)).toBe(false);
      });
    });

    it('should allow FREE users access to non-Pro features', () => {
      useSubscriptionStore.setState({ tier: 'FREE', isProUser: false });

      expect(useSubscriptionStore.getState().canAccess('basicFeature')).toBe(true);
      expect(useSubscriptionStore.getState().canAccess('dashboard')).toBe(true);
    });
  });

  describe('setTier', () => {
    it('should update tier to PRO_ANNUAL and set isProUser true', () => {
      useSubscriptionStore.getState().setTier('PRO_ANNUAL');

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('PRO_ANNUAL');
      expect(state.isProUser).toBe(true);
    });

    it('should update tier to PRO_MONTHLY and set isProUser true', () => {
      useSubscriptionStore.getState().setTier('PRO_MONTHLY');

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('PRO_MONTHLY');
      expect(state.isProUser).toBe(true);
    });

    it('should update tier to FREE and set isProUser false', () => {
      // First set to Pro
      useSubscriptionStore.setState({ tier: 'PRO_ANNUAL', isProUser: true });

      // Then downgrade to Free
      useSubscriptionStore.getState().setTier('FREE');

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('FREE');
      expect(state.isProUser).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useSubscriptionStore.setState({ error: 'Some error' });

      useSubscriptionStore.getState().clearError();

      expect(useSubscriptionStore.getState().error).toBeNull();
    });
  });

  describe('PRO_FEATURES constant', () => {
    it('should include expected Pro features', () => {
      expect(PRO_FEATURES).toContain('autoMileageTracking');
      expect(PRO_FEATURES).toContain('taxExport');
      expect(PRO_FEATURES).toContain('unlimitedHistory');
      expect(PRO_FEATURES).toContain('zoneAlerts');
    });
  });

  describe('Canceled State (Story 8-5)', () => {
    it('should set isCanceled=true when Pro user has willRenew=false', async () => {
      const expirationDate = '2026-02-04T00:00:00.000Z';
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            id: 'user-123',
            subscription: {
              tier: 'PRO_MONTHLY',
              status: 'ACTIVE',
              currentPeriodEnd: expirationDate,
            },
          },
        },
      });
      // RevenueCat says subscription is canceled (willRenew: false)
      mockGetCustomerInfo.mockResolvedValue({ entitlements: { active: { pro: {} } } });
      mockGetSubscriptionDetails.mockReturnValue({
        isProUser: true,
        tier: 'PRO_MONTHLY',
        expiresAt: new Date(expirationDate),
        willRenew: false,
      });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('PRO_MONTHLY');
      expect(state.isProUser).toBe(true);
      expect(state.isCanceled).toBe(true);
      expect(state.willRenew).toBe(false);
    });

    it('should keep tier as PRO even when canceled but not expired', async () => {
      const futureDate = '2026-02-04T00:00:00.000Z';
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            subscription: {
              tier: 'PRO_ANNUAL',
              currentPeriodEnd: futureDate,
            },
          },
        },
      });
      mockGetSubscriptionDetails.mockReturnValue({
        isProUser: true,
        tier: 'PRO_ANNUAL',
        expiresAt: new Date(futureDate),
        willRenew: false,
      });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('PRO_ANNUAL');
      expect(state.isProUser).toBe(true);
      expect(state.isCanceled).toBe(true);
      // Pro features should still be accessible
      expect(state.canAccess('autoMileageTracking')).toBe(true);
    });

    it('should set isCanceled=false when Pro user has willRenew=true', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            subscription: {
              tier: 'PRO_MONTHLY',
              currentPeriodEnd: '2026-02-04T00:00:00.000Z',
            },
          },
        },
      });
      mockGetSubscriptionDetails.mockReturnValue({
        isProUser: true,
        tier: 'PRO_MONTHLY',
        expiresAt: new Date('2026-02-04'),
        willRenew: true,
      });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();

      expect(state.isProUser).toBe(true);
      expect(state.isCanceled).toBe(false);
      expect(state.willRenew).toBe(true);
    });

    it('should correctly downgrade to FREE when subscription expires', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            subscription: null, // No active subscription (expired)
          },
        },
      });
      mockGetSubscriptionDetails.mockReturnValue({
        isProUser: false,
        tier: 'FREE',
        expiresAt: null,
        willRenew: false,
      });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();

      expect(state.tier).toBe('FREE');
      expect(state.isProUser).toBe(false);
      expect(state.isCanceled).toBe(false);
      expect(state.canAccess('autoMileageTracking')).toBe(false);
    });

    it('should default to willRenew=true when RevenueCat is not available', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            subscription: {
              tier: 'PRO_MONTHLY',
              currentPeriodEnd: '2026-02-04T00:00:00.000Z',
            },
          },
        },
      });
      // Simulate RevenueCat not available
      mockGetCustomerInfo.mockRejectedValue(new Error('RevenueCat not available'));

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();

      expect(state.willRenew).toBe(true);
      expect(state.isCanceled).toBe(false);
    });
  });
});
