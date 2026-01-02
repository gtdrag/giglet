import { Router } from 'express';
import { zonesController } from '../controllers/zones.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { GetZonesSchema, GetZoneScoreSchema } from '../schemas/zones.schema';

const router = Router();

/**
 * Zones Routes
 *
 * GET /api/v1/zones       - Get zones with scores near location (supports ?timezone=)
 * GET /api/v1/zones/score - Get current score calculation (supports ?timezone=)
 * POST /api/v1/zones/refresh - Manually refresh scores (dev/admin)
 */

// All zones routes require authentication
router.use(requireAuth);

// Get zones near a location
router.get(
  '/',
  validateRequest(GetZonesSchema),
  zonesController.getZones.bind(zonesController)
);

// Get current score (no location needed)
router.get(
  '/score',
  validateRequest(GetZoneScoreSchema),
  zonesController.getCurrentScore.bind(zonesController)
);

// Refresh scores (would be admin-only in production)
router.post('/refresh', zonesController.refreshScores.bind(zonesController));

export default router;
