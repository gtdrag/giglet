import { Router } from 'express';
import { subscriptionsController } from '../controllers/subscriptions.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * Subscription Routes
 *
 * POST /api/v1/subscriptions/webhook - RevenueCat webhook handler (no auth, verified by signature)
 * GET  /api/v1/subscriptions/status  - Get current user's subscription status (requires auth)
 */

// RevenueCat webhook handler (no auth - verified by signature)
router.post('/webhook', (req, res, next) =>
  subscriptionsController.handleWebhook(req, res, next)
);

// Get subscription status (requires authentication)
router.get('/status', requireAuth, (req, res, next) =>
  subscriptionsController.getStatus(req, res, next)
);

export default router;
