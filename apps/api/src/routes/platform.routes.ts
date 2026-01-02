import { Router } from 'express';
import { platformController } from '../controllers/platform.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { ConnectPlatformSchema, DisconnectPlatformSchema } from '../schemas/platform.schema';

const router = Router();

/**
 * Platform Routes
 *
 * All routes require authentication
 *
 * GET    /api/v1/platforms               - List connected platforms
 * GET    /api/v1/platforms/:platform     - Get specific platform status
 * POST   /api/v1/platforms/connect       - Connect a platform (store credentials)
 * POST   /api/v1/platforms/disconnect    - Disconnect a platform
 * POST   /api/v1/platforms/:platform/sync - Trigger manual sync
 */

// All platform routes require authentication
router.use(requireAuth);

// List all connected platforms
router.get('/', (req, res, next) => platformController.list(req, res, next));

// Get specific platform status
router.get('/:platform', (req, res, next) => platformController.get(req, res, next));

// Connect a platform
router.post('/connect', validate(ConnectPlatformSchema), (req, res, next) =>
  platformController.connect(req, res, next)
);

// Disconnect a platform
router.post('/disconnect', validate(DisconnectPlatformSchema), (req, res, next) =>
  platformController.disconnect(req, res, next)
);

// Trigger manual sync for a platform
router.post('/:platform/sync', (req, res, next) =>
  platformController.sync(req, res, next)
);

export default router;
