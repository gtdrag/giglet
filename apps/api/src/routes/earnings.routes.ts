import { Router } from 'express';
import { earningsController } from '../controllers/earnings.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { GetEarningsSummarySchema, GetDeliveriesSchema } from '../schemas/earnings.schema';

const router = Router();

/**
 * Earnings Routes
 *
 * All routes require authentication
 *
 * GET /api/v1/earnings/summary    - Get earnings summary for a period
 * GET /api/v1/earnings/deliveries - Get list of individual deliveries
 */

// All earnings routes require authentication
router.use(requireAuth);

// Get earnings summary
router.get(
  '/summary',
  validateRequest(GetEarningsSummarySchema),
  earningsController.getSummary.bind(earningsController)
);

// Get individual deliveries
router.get(
  '/deliveries',
  validateRequest(GetDeliveriesSchema),
  earningsController.getDeliveries.bind(earningsController)
);

export default router;
