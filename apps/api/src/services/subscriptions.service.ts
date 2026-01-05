import { prisma } from '../lib/prisma';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import type { RevenueCatWebhookEvent } from '../schemas/subscriptions.schema';
import crypto from 'crypto';

// Product ID to tier mapping
const PRODUCT_TIER_MAP: Record<string, SubscriptionTier> = {
  giglet_pro_monthly: 'PRO_MONTHLY',
  giglet_pro_annual: 'PRO_ANNUAL',
};

class SubscriptionsService {
  /**
   * Verify RevenueCat webhook signature
   * https://www.revenuecat.com/docs/webhooks#signature-verification
   */
  verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('REVENUECAT_WEBHOOK_SECRET not configured, skipping signature verification');
      return true; // Allow in development
    }

    if (!signature) {
      console.error('Missing webhook signature');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Handle RevenueCat webhook event
   */
  async handleWebhookEvent(event: RevenueCatWebhookEvent): Promise<void> {
    console.log(`[Subscriptions] Processing webhook event: ${event.type} for user ${event.app_user_id}`);

    switch (event.type) {
      case 'INITIAL_PURCHASE':
        await this.handleInitialPurchase(event);
        break;
      case 'RENEWAL':
        await this.handleRenewal(event);
        break;
      case 'CANCELLATION':
        await this.handleCancellation(event);
        break;
      case 'UNCANCELLATION':
        await this.handleUncancellation(event);
        break;
      case 'EXPIRATION':
        await this.handleExpiration(event);
        break;
      case 'BILLING_ISSUE':
        await this.handleBillingIssue(event);
        break;
      case 'PRODUCT_CHANGE':
        await this.handleProductChange(event);
        break;
      case 'TEST':
        console.log('[Subscriptions] Test webhook received');
        break;
      default:
        console.log(`[Subscriptions] Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle initial subscription purchase
   */
  private async handleInitialPurchase(event: RevenueCatWebhookEvent): Promise<void> {
    const userId = event.app_user_id;
    const productId = event.product_id || '';
    const tier = PRODUCT_TIER_MAP[productId] || 'PRO_MONTHLY';

    const periodStart = event.purchased_at_ms
      ? new Date(event.purchased_at_ms)
      : new Date();
    const periodEnd = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : null;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error(`[Subscriptions] User not found: ${userId}`);
      return;
    }

    // Upsert subscription
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        revenuecatId: event.original_app_user_id || userId,
        tier,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      update: {
        tier,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    console.log(`[Subscriptions] Created/updated subscription for user ${userId}: ${tier}`);
  }

  /**
   * Handle subscription renewal
   */
  private async handleRenewal(event: RevenueCatWebhookEvent): Promise<void> {
    const userId = event.app_user_id;

    const periodStart = event.purchased_at_ms
      ? new Date(event.purchased_at_ms)
      : new Date();
    const periodEnd = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : null;

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    console.log(`[Subscriptions] Renewed subscription for user ${userId}`);
  }

  /**
   * Handle subscription cancellation (user initiated, still active until period end)
   */
  private async handleCancellation(event: RevenueCatWebhookEvent): Promise<void> {
    const userId = event.app_user_id;

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELED',
      },
    });

    console.log(`[Subscriptions] Marked subscription as canceled for user ${userId}`);
  }

  /**
   * Handle uncancellation (user resubscribed before period end)
   */
  private async handleUncancellation(event: RevenueCatWebhookEvent): Promise<void> {
    const userId = event.app_user_id;

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
      },
    });

    console.log(`[Subscriptions] Reactivated subscription for user ${userId}`);
  }

  /**
   * Handle subscription expiration
   */
  private async handleExpiration(event: RevenueCatWebhookEvent): Promise<void> {
    const userId = event.app_user_id;

    await prisma.subscription.update({
      where: { userId },
      data: {
        tier: 'FREE',
        status: 'EXPIRED',
      },
    });

    console.log(`[Subscriptions] Expired subscription for user ${userId}`);
  }

  /**
   * Handle billing issue (card declined, etc.)
   */
  private async handleBillingIssue(event: RevenueCatWebhookEvent): Promise<void> {
    const userId = event.app_user_id;

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'GRACE_PERIOD',
      },
    });

    console.log(`[Subscriptions] Billing issue for user ${userId}, entering grace period`);
  }

  /**
   * Handle product change (upgrade/downgrade)
   */
  private async handleProductChange(event: RevenueCatWebhookEvent): Promise<void> {
    const userId = event.app_user_id;
    const productId = event.product_id || '';
    const tier = PRODUCT_TIER_MAP[productId] || 'PRO_MONTHLY';

    const periodStart = event.purchased_at_ms
      ? new Date(event.purchased_at_ms)
      : new Date();
    const periodEnd = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : null;

    await prisma.subscription.update({
      where: { userId },
      data: {
        tier,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    console.log(`[Subscriptions] Product changed for user ${userId}: ${tier}`);
  }

  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: string): Promise<{
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    isProUser: boolean;
  }> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return {
        tier: 'FREE',
        status: 'ACTIVE',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        isProUser: false,
      };
    }

    const isProUser =
      subscription.tier !== 'FREE' &&
      (subscription.status === 'ACTIVE' || subscription.status === 'GRACE_PERIOD');

    return {
      tier: subscription.tier,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      isProUser,
    };
  }
}

export const subscriptionsService = new SubscriptionsService();
