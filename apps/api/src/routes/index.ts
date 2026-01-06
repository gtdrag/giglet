import { Router } from 'express';
import { healthController } from '../controllers/health.controller';
import authRoutes from './auth.routes';
import platformRoutes from './platform.routes';
import earningsRoutes from './earnings.routes';
import zonesRoutes from './zones.routes';
import subscriptionsRoutes from './subscriptions.routes';
import usersRoutes from './users.routes';
import tipsRoutes from './tips.routes';

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

// Platform routes (Epic 3)
router.use('/platforms', platformRoutes);

// Earnings routes (Epic 4)
router.use('/earnings', earningsRoutes);

// Zones routes (Epic 5)
router.use('/zones', zonesRoutes);

// Subscriptions routes (Epic 8)
router.use('/subscriptions', subscriptionsRoutes);

// Users routes (Epic 9)
router.use('/users', usersRoutes);

// Tips routes (Epic 10)
router.use('/tips', tipsRoutes);

// Future route modules will be added here:
// router.use('/mileage', mileageRoutes);
// router.use('/exports', exportRoutes);

export default router;
