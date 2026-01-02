import { Router } from 'express';
import { healthController } from '../controllers/health.controller';
import authRoutes from './auth.routes';

const router = Router();

/**
 * API Routes
 *
 * All routes are mounted under /api/v1
 *
 * Route organization pattern:
 * - /api/v1          - API info
 * - /api/v1/health   - API health check
 * - /api/v1/auth     - Authentication (Epic 2)
 * - /api/v1/accounts - Linked accounts (Epic 3)
 * - /api/v1/earnings - Earnings data (Epic 4)
 * - /api/v1/zones    - Focus zones (Epic 5)
 * - /api/v1/mileage  - Mileage tracking (Epic 6)
 * - /api/v1/exports  - Tax exports (Epic 7)
 * - /api/v1/subscription - Subscription management (Epic 8)
 * - /api/v1/users    - User profile (Epic 9)
 */

// API info endpoint
router.get('/', (req, res) => healthController.getApiInfo(req, res));

// Health check endpoint (under /api/v1)
router.get('/health', (req, res, next) => healthController.getHealth(req, res, next));

// Auth routes (Epic 2)
router.use('/auth', authRoutes);

// Future route modules will be added here:
// router.use('/accounts', accountRoutes);
// router.use('/earnings', earningsRoutes);
// router.use('/zones', zonesRoutes);
// router.use('/mileage', mileageRoutes);
// router.use('/exports', exportRoutes);
// router.use('/subscription', subscriptionRoutes);
// router.use('/users', userRoutes);

export default router;
