import { Request, Response, NextFunction } from 'express';
import { subscriptionsService } from '../services/subscriptions.service';
import { successResponse } from '../types/api.types';
import { RevenueCatWebhookSchema } from '../schemas/subscriptions.schema';
import { ZodError } from 'zod';

class SubscriptionsController {
  /**
   * POST /api/v1/subscriptions/webhook
   * Handle RevenueCat webhook events
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get raw body for signature verification
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers['x-revenuecat-signature'] as string | undefined;

      // Verify webhook signature
      if (!subscriptionsService.verifyWebhookSignature(rawBody, signature)) {
        console.error('[Subscriptions] Invalid webhook signature');
        res.status(401).json({ success: false, error: 'Invalid signature' });
        return;
      }

      // Parse and validate webhook payload
      const payload = RevenueCatWebhookSchema.parse(req.body);

      // Log the event for debugging
      console.log('[Subscriptions] Received webhook:', {
        type: payload.event.type,
        userId: payload.event.app_user_id,
        productId: payload.event.product_id,
      });

      // Process the event
      await subscriptionsService.handleWebhookEvent(payload.event);

      // Always return 200 to acknowledge receipt
      res.json(successResponse({ received: true }));
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('[Subscriptions] Invalid webhook payload:', error.issues);
        // Still return 200 to prevent retries for malformed payloads
        res.json(successResponse({ received: true, warning: 'Invalid payload format' }));
        return;
      }
      // For other errors, let error handler deal with it but still return 200
      console.error('[Subscriptions] Webhook processing error:', error);
      res.json(successResponse({ received: true, warning: 'Processing error' }));
    }
  }

  /**
   * GET /api/v1/subscriptions/status
   * Get current user's subscription status
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const status = await subscriptionsService.getSubscriptionStatus(userId);

      res.json(successResponse(status));
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionsController = new SubscriptionsController();
