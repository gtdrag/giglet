import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { UpdatePreferencesSchema } from '../schemas/preferences.schema';
import { usersController } from '../controllers/users.controller';

const router = Router();

/**
 * User Routes
 *
 * All routes require authentication via requireAuth middleware
 *
 * GET  /preferences - Get user notification preferences
 * PUT  /preferences - Update user notification preferences
 */

// Get user preferences
router.get('/preferences', requireAuth, (req, res, next) =>
  usersController.getPreferences(req, res, next)
);

// Update user preferences
router.put(
  '/preferences',
  requireAuth,
  validateRequest(UpdatePreferencesSchema),
  (req, res, next) => usersController.updatePreferences(req, res, next)
);

export default router;
