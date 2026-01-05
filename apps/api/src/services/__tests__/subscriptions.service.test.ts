/**
 * Unit tests for Subscriptions Service
 * Story 8-3: Pro Annual Subscription Purchase - Backend PRO_ANNUAL handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RevenueCatWebhookEvent } from '../../schemas/subscriptions.schema';

// Use vi.hoisted to properly define mocks before hoisting
const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  subscriptionFindUnique: vi.fn(),
  subscriptionUpsert: vi.fn(),
  subscriptionUpdate: vi.fn(),
}));

// Mock Prisma with hoisted mocks
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    subscription: {
      findUnique: mocks.subscriptionFindUnique,
      upsert: mocks.subscriptionUpsert,
      update: mocks.subscriptionUpdate,
    },
  },
}));

// Import after mocking
import { subscriptionsService } from '../subscriptions.service';

describe('SubscriptionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env
    delete process.env.REVENUECAT_WEBHOOK_SECRET;
  });

  describe('handleWebhookEvent - INITIAL_PURCHASE', () => {
    const baseEvent: RevenueCatWebhookEvent = {
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user-123',
      product_id: 'giglet_pro_annual',
      purchased_at_ms: Date.now(),
      expiration_at_ms: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
    };

    it('should create PRO_ANNUAL subscription for annual purchase', async () => {
      mocks.userFindUnique.mockResolvedValue({ id: 'user-123' });
      mocks.subscriptionUpsert.mockResolvedValue({
        id: 'sub-123',
        userId: 'user-123',
        tier: 'PRO_ANNUAL',
        status: 'ACTIVE',
      });

      await subscriptionsService.handleWebhookEvent(baseEvent);

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          create: expect.objectContaining({
            tier: 'PRO_ANNUAL',
            status: 'ACTIVE',
          }),
          update: expect.objectContaining({
            tier: 'PRO_ANNUAL',
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should create PRO_MONTHLY subscription for monthly purchase', async () => {
      const monthlyEvent: RevenueCatWebhookEvent = {
        ...baseEvent,
        product_id: 'giglet_pro_monthly',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000, // 1 month from now
      };

      mocks.userFindUnique.mockResolvedValue({ id: 'user-123' });
      mocks.subscriptionUpsert.mockResolvedValue({
        id: 'sub-123',
        tier: 'PRO_MONTHLY',
      });

      await subscriptionsService.handleWebhookEvent(monthlyEvent);

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            tier: 'PRO_MONTHLY',
          }),
          update: expect.objectContaining({
            tier: 'PRO_MONTHLY',
          }),
        })
      );
    });

    it('should set currentPeriodEnd to 1 year from purchase for annual', async () => {
      const purchaseTime = new Date('2026-01-04T12:00:00Z');
      const expirationTime = new Date('2027-01-04T12:00:00Z');

      const annualEvent: RevenueCatWebhookEvent = {
        ...baseEvent,
        purchased_at_ms: purchaseTime.getTime(),
        expiration_at_ms: expirationTime.getTime(),
      };

      mocks.userFindUnique.mockResolvedValue({ id: 'user-123' });
      mocks.subscriptionUpsert.mockResolvedValue({});

      await subscriptionsService.handleWebhookEvent(annualEvent);

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            currentPeriodEnd: expirationTime,
          }),
          update: expect.objectContaining({
            currentPeriodEnd: expirationTime,
          }),
        })
      );
    });

    it('should not create subscription if user does not exist', async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      await subscriptionsService.handleWebhookEvent(baseEvent);

      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    });

    it('should default to PRO_MONTHLY for unknown product_id', async () => {
      const unknownEvent: RevenueCatWebhookEvent = {
        ...baseEvent,
        product_id: 'unknown_product',
      };

      mocks.userFindUnique.mockResolvedValue({ id: 'user-123' });
      mocks.subscriptionUpsert.mockResolvedValue({});

      await subscriptionsService.handleWebhookEvent(unknownEvent);

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            tier: 'PRO_MONTHLY',
          }),
        })
      );
    });
  });

  describe('handleWebhookEvent - RENEWAL', () => {
    it('should update subscription period on renewal', async () => {
      const renewalEvent: RevenueCatWebhookEvent = {
        type: 'RENEWAL',
        app_user_id: 'user-123',
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + 365 * 24 * 60 * 60 * 1000,
      };

      mocks.subscriptionUpdate.mockResolvedValue({});

      await subscriptionsService.handleWebhookEvent(renewalEvent);

      expect(mocks.subscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          data: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('handleWebhookEvent - CANCELLATION', () => {
    it('should mark subscription as CANCELED', async () => {
      const cancelEvent: RevenueCatWebhookEvent = {
        type: 'CANCELLATION',
        app_user_id: 'user-123',
      };

      mocks.subscriptionUpdate.mockResolvedValue({});

      await subscriptionsService.handleWebhookEvent(cancelEvent);

      expect(mocks.subscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          data: { status: 'CANCELED' },
        })
      );
    });
  });

  describe('handleWebhookEvent - EXPIRATION', () => {
    it('should set tier to FREE and status to EXPIRED', async () => {
      const expireEvent: RevenueCatWebhookEvent = {
        type: 'EXPIRATION',
        app_user_id: 'user-123',
      };

      mocks.subscriptionUpdate.mockResolvedValue({});

      await subscriptionsService.handleWebhookEvent(expireEvent);

      expect(mocks.subscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          data: {
            tier: 'FREE',
            status: 'EXPIRED',
          },
        })
      );
    });
  });

  describe('handleWebhookEvent - PRODUCT_CHANGE', () => {
    it('should update tier when switching from monthly to annual', async () => {
      const changeEvent: RevenueCatWebhookEvent = {
        type: 'PRODUCT_CHANGE',
        app_user_id: 'user-123',
        product_id: 'giglet_pro_annual',
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + 365 * 24 * 60 * 60 * 1000,
      };

      mocks.subscriptionUpdate.mockResolvedValue({});

      await subscriptionsService.handleWebhookEvent(changeEvent);

      expect(mocks.subscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          data: expect.objectContaining({
            tier: 'PRO_ANNUAL',
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should update tier when switching from annual to monthly', async () => {
      const changeEvent: RevenueCatWebhookEvent = {
        type: 'PRODUCT_CHANGE',
        app_user_id: 'user-123',
        product_id: 'giglet_pro_monthly',
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      mocks.subscriptionUpdate.mockResolvedValue({});

      await subscriptionsService.handleWebhookEvent(changeEvent);

      expect(mocks.subscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tier: 'PRO_MONTHLY',
          }),
        })
      );
    });
  });

  describe('handleWebhookEvent - BILLING_ISSUE', () => {
    it('should set status to GRACE_PERIOD', async () => {
      const billingEvent: RevenueCatWebhookEvent = {
        type: 'BILLING_ISSUE',
        app_user_id: 'user-123',
      };

      mocks.subscriptionUpdate.mockResolvedValue({});

      await subscriptionsService.handleWebhookEvent(billingEvent);

      expect(mocks.subscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'GRACE_PERIOD' },
        })
      );
    });
  });

  describe('handleWebhookEvent - TEST', () => {
    it('should handle TEST event without errors', async () => {
      const testEvent: RevenueCatWebhookEvent = {
        type: 'TEST',
        app_user_id: 'test-user',
      };

      // Should not throw
      await expect(
        subscriptionsService.handleWebhookEvent(testEvent)
      ).resolves.not.toThrow();

      // Should not call any DB operations
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return PRO_ANNUAL status for annual subscriber', async () => {
      const expirationDate = new Date('2027-01-04T00:00:00Z');
      mocks.subscriptionFindUnique.mockResolvedValue({
        tier: 'PRO_ANNUAL',
        status: 'ACTIVE',
        currentPeriodStart: new Date('2026-01-04T00:00:00Z'),
        currentPeriodEnd: expirationDate,
      });

      const result = await subscriptionsService.getSubscriptionStatus('user-123');

      expect(result.tier).toBe('PRO_ANNUAL');
      expect(result.status).toBe('ACTIVE');
      expect(result.isProUser).toBe(true);
      expect(result.currentPeriodEnd).toEqual(expirationDate);
    });

    it('should return PRO_MONTHLY status for monthly subscriber', async () => {
      mocks.subscriptionFindUnique.mockResolvedValue({
        tier: 'PRO_MONTHLY',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      });

      const result = await subscriptionsService.getSubscriptionStatus('user-123');

      expect(result.tier).toBe('PRO_MONTHLY');
      expect(result.isProUser).toBe(true);
    });

    it('should return FREE status when no subscription exists', async () => {
      mocks.subscriptionFindUnique.mockResolvedValue(null);

      const result = await subscriptionsService.getSubscriptionStatus('user-123');

      expect(result.tier).toBe('FREE');
      expect(result.status).toBe('ACTIVE');
      expect(result.isProUser).toBe(false);
      expect(result.currentPeriodStart).toBeNull();
      expect(result.currentPeriodEnd).toBeNull();
    });

    it('should return isProUser=true for GRACE_PERIOD status', async () => {
      mocks.subscriptionFindUnique.mockResolvedValue({
        tier: 'PRO_ANNUAL',
        status: 'GRACE_PERIOD',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      });

      const result = await subscriptionsService.getSubscriptionStatus('user-123');

      expect(result.isProUser).toBe(true);
    });

    it('should return isProUser=false for EXPIRED status', async () => {
      mocks.subscriptionFindUnique.mockResolvedValue({
        tier: 'FREE',
        status: 'EXPIRED',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      });

      const result = await subscriptionsService.getSubscriptionStatus('user-123');

      expect(result.isProUser).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true when webhook secret not configured (dev mode)', () => {
      // process.env.REVENUECAT_WEBHOOK_SECRET is not set
      const result = subscriptionsService.verifyWebhookSignature(
        '{"test": "payload"}',
        'any_signature'
      );

      expect(result).toBe(true);
    });

    it('should return false when signature is missing', () => {
      process.env.REVENUECAT_WEBHOOK_SECRET = 'test_secret';

      const result = subscriptionsService.verifyWebhookSignature(
        '{"test": "payload"}',
        undefined
      );

      expect(result).toBe(false);
    });
  });
});
