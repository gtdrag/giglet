import { Router } from 'express';
import { tipsController } from '../controllers/tips.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { CreateTipLogSchema, GetTipsQuerySchema } from '../schemas/tips.schema';

const router = Router();

/**
 * Tips Routes
 *
 * All routes require authentication
 *
 * GET  /api/v1/tips - Query tip logs with optional filters
 * POST /api/v1/tips - Create a new tip log entry
 */

// All tips routes require authentication
router.use(requireAuth);

// Query tip logs
router.get(
  '/',
  validateRequest(GetTipsQuerySchema),
  tipsController.getTips.bind(tipsController)
);

// Create tip log
router.post(
  '/',
  validateRequest(CreateTipLogSchema),
  tipsController.createTipLog.bind(tipsController)
);

export default router;
