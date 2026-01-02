import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { RegisterSchema } from '../schemas/auth.schema';

const router = Router();

/**
 * Auth Routes
 *
 * POST /api/v1/auth/register - Register with email/password
 * POST /api/v1/auth/login    - Login with email/password (Story 2.2)
 * POST /api/v1/auth/refresh  - Refresh access token (Story 2.2)
 * POST /api/v1/auth/logout   - Logout and revoke refresh token (Story 2.2)
 */

// Register a new user
router.post('/register', validate(RegisterSchema), (req, res, next) =>
  authController.register(req, res, next)
);

export default router;
