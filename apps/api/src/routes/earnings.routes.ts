import { Router } from 'express';
import { earningsController } from '../controllers/earnings.controller';
import { requireAuth } from '../middleware/auth.middleware';

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
router.get('/summary', (req, res, next) => earningsController.getSummary(req, res, next));

// Get individual deliveries
router.get('/deliveries', (req, res, next) => earningsController.getDeliveries(req, res, next));

export default router;
