import { z } from 'zod';

/**
 * RevenueCat webhook event types
 * https://www.revenuecat.com/docs/webhooks
 */
export const RevenueCatEventType = z.enum([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_PAUSED',
  'BILLING_ISSUE',
  'PRODUCT_CHANGE',
  'EXPIRATION',
  'TRANSFER',
  'TEST',
]);

export type RevenueCatEventType = z.infer<typeof RevenueCatEventType>;

/**
 * RevenueCat webhook event schema
 * Subset of fields we actually use
 */
export const RevenueCatWebhookEventSchema = z.object({
  type: RevenueCatEventType,
  app_user_id: z.string(),
  product_id: z.string().optional(),
  period_type: z.string().optional(),
  purchased_at_ms: z.number().optional(),
  expiration_at_ms: z.number().optional().nullable(),
  store: z.string().optional(),
  environment: z.string().optional(),
  original_app_user_id: z.string().optional(),
  // Price info (may not be present for all events)
  price: z.number().optional(),
  currency: z.string().optional(),
  // Cancellation info
  cancel_reason: z.string().optional(),
});

export type RevenueCatWebhookEvent = z.infer<typeof RevenueCatWebhookEventSchema>;

/**
 * Full RevenueCat webhook payload schema
 */
export const RevenueCatWebhookSchema = z.object({
  api_version: z.string().optional(),
  event: RevenueCatWebhookEventSchema,
});

export type RevenueCatWebhookPayload = z.infer<typeof RevenueCatWebhookSchema>;

/**
 * Subscription status response schema
 */
export const SubscriptionStatusSchema = z.object({
  tier: z.enum(['FREE', 'PRO_MONTHLY', 'PRO_ANNUAL']),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELED', 'GRACE_PERIOD']),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  isProUser: z.boolean(),
});

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
