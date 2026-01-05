/**
 * Unit tests for Subscriptions Service
 * Story 8-4: Subscription Status Display - Test management URL generation
 * Story 8-6: Purchase Restoration - Test restore purchases functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the mock helper to control Platform.OS
import { setMockOS } from '../../__mocks__/react-native';

// Mock react-native-purchases to prevent native module errors
vi.mock('react-native-purchases', () => {
  throw new Error('Native module not available');
});

// Import after mocks are set up
import {
  getManagementUrl,
  getSubscriptionDetails,
  SubscriptionError,
  isSubscriptionServiceAvailable,
  restorePurchases,
  MONTHLY_PRODUCT_ID,
  ANNUAL_PRODUCT_ID,
  PRO_ENTITLEMENT,
} from '../subscriptions';

describe('Subscriptions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockOS('ios');
  });

  describe('getManagementUrl', () => {
    it('should return iOS App Store URL when Platform.OS is ios', () => {
      setMockOS('ios');

      const url = getManagementUrl();

      expect(url).toBe('https://apps.apple.com/account/subscriptions');
    });

    it('should return Android Play Store URL when Platform.OS is android', () => {
      setMockOS('android');

      const url = getManagementUrl();

      expect(url).toBe('https://play.google.com/store/account/subscriptions');
    });
  });

  describe('isSubscriptionServiceAvailable', () => {
    it('should return false when RevenueCat is not available', () => {
      // In test environment, RevenueCat native module won't be available
      expect(isSubscriptionServiceAvailable()).toBe(false);
    });
  });

  describe('SubscriptionError', () => {
    it('should create error with correct properties', () => {
      const error = new SubscriptionError('Test message', 'TEST_CODE', true);

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.userCancelled).toBe(true);
      expect(error.name).toBe('SubscriptionError');
    });

    it('should default userCancelled to false', () => {
      const error = new SubscriptionError('Test message', 'TEST_CODE');

      expect(error.userCancelled).toBe(false);
    });
  });

  describe('getSubscriptionDetails', () => {
    it('should return FREE tier when no customer info', () => {
      const details = getSubscriptionDetails(null);

      expect(details.isProUser).toBe(false);
      expect(details.tier).toBe('FREE');
      expect(details.expiresAt).toBeNull();
      expect(details.willRenew).toBe(false);
    });

    it('should return FREE tier when no pro entitlement', () => {
      const details = getSubscriptionDetails({
        entitlements: {
          active: {},
        },
      });

      expect(details.isProUser).toBe(false);
      expect(details.tier).toBe('FREE');
    });

    it('should return PRO_MONTHLY tier for monthly subscription', () => {
      const expirationDate = '2026-02-04T00:00:00.000Z';
      const details = getSubscriptionDetails({
        entitlements: {
          active: {
            [PRO_ENTITLEMENT]: {
              productIdentifier: MONTHLY_PRODUCT_ID,
              expirationDate: expirationDate,
              willRenew: true,
            },
          },
        },
      });

      expect(details.isProUser).toBe(true);
      expect(details.tier).toBe('PRO_MONTHLY');
      expect(details.expiresAt).toBeInstanceOf(Date);
      expect(details.expiresAt?.toISOString()).toBe(expirationDate);
      expect(details.willRenew).toBe(true);
    });

    it('should return PRO_ANNUAL tier for annual subscription', () => {
      const expirationDate = '2027-01-04T00:00:00.000Z';
      const details = getSubscriptionDetails({
        entitlements: {
          active: {
            [PRO_ENTITLEMENT]: {
              productIdentifier: ANNUAL_PRODUCT_ID,
              expirationDate: expirationDate,
              willRenew: false,
            },
          },
        },
      });

      expect(details.isProUser).toBe(true);
      expect(details.tier).toBe('PRO_ANNUAL');
      expect(details.expiresAt?.toISOString()).toBe(expirationDate);
      expect(details.willRenew).toBe(false);
    });

    it('should handle missing expiration date', () => {
      const details = getSubscriptionDetails({
        entitlements: {
          active: {
            [PRO_ENTITLEMENT]: {
              productIdentifier: MONTHLY_PRODUCT_ID,
              willRenew: true,
            },
          },
        },
      });

      expect(details.isProUser).toBe(true);
      expect(details.tier).toBe('PRO_MONTHLY');
      expect(details.expiresAt).toBeNull();
    });

    it('should handle missing willRenew (defaults to false)', () => {
      const details = getSubscriptionDetails({
        entitlements: {
          active: {
            [PRO_ENTITLEMENT]: {
              productIdentifier: ANNUAL_PRODUCT_ID,
              expirationDate: '2027-01-04T00:00:00.000Z',
            },
          },
        },
      });

      expect(details.willRenew).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should export correct product IDs', () => {
      expect(MONTHLY_PRODUCT_ID).toBe('giglet_pro_monthly');
      expect(ANNUAL_PRODUCT_ID).toBe('giglet_pro_annual');
    });

    it('should export correct entitlement ID', () => {
      expect(PRO_ENTITLEMENT).toBe('pro');
    });
  });

  describe('restorePurchases (Story 8-6)', () => {
    it('should throw SubscriptionError when RevenueCat is not available', async () => {
      // RevenueCat is mocked to throw, so isRevenueCatAvailable should be false
      expect(isSubscriptionServiceAvailable()).toBe(false);

      await expect(restorePurchases()).rejects.toThrow(SubscriptionError);
    });

    it('should throw SubscriptionError with NOT_AVAILABLE code when RevenueCat unavailable', async () => {
      try {
        await restorePurchases();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SubscriptionError);
        const subError = error as SubscriptionError;
        expect(subError.code).toBe('NOT_AVAILABLE');
        expect(subError.message).toContain('not available');
        expect(subError.userCancelled).toBe(false);
      }
    });

    it('should have SubscriptionError that can be used for error handling', () => {
      const error = new SubscriptionError('Failed to restore purchases.', 'NETWORK_ERROR', false);

      expect(error.name).toBe('SubscriptionError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Failed to restore purchases.');
      expect(error.userCancelled).toBe(false);
    });

    it('should have SubscriptionError that indicates when user cancels', () => {
      const error = new SubscriptionError('Purchase was cancelled', 'PURCHASE_CANCELLED', true);

      expect(error.userCancelled).toBe(true);
    });
  });
});
