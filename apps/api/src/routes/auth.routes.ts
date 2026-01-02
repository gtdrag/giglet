import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '../schemas/auth.schema';

const router = Router();

/**
 * Auth Routes
 *
 * POST /api/v1/auth/register - Register with email/password
 * POST /api/v1/auth/login    - Login with email/password
 * POST /api/v1/auth/refresh  - Refresh access token
 * POST /api/v1/auth/logout   - Logout and revoke refresh token
 */

// Register a new user
router.post('/register', validate(RegisterSchema), (req, res, next) =>
  authController.register(req, res, next)
);

// Login with email/password
router.post('/login', validate(LoginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

// Refresh access token
router.post('/refresh', validate(RefreshTokenSchema), (req, res, next) =>
  authController.refresh(req, res, next)
);

// Logout and revoke refresh token
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

export default router;
