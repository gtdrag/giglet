import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  AppleAuthSchema,
  GoogleAuthSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../schemas/auth.schema';
import { UpdateProfileSchema } from '../schemas/user.schema';

const router = Router();

/**
 * Auth Routes
 *
 * POST /api/v1/auth/register        - Register with email/password
 * POST /api/v1/auth/login           - Login with email/password
 * POST /api/v1/auth/apple           - Sign in with Apple
 * POST /api/v1/auth/google          - Sign in with Google
 * POST /api/v1/auth/forgot-password - Request password reset
 * POST /api/v1/auth/reset-password  - Reset password with token
 * POST /api/v1/auth/refresh         - Refresh access token
 * POST /api/v1/auth/logout          - Logout and revoke refresh token
 * GET  /api/v1/auth/me              - Get current user profile with subscription
 * PUT  /api/v1/auth/me              - Update current user profile (name only)
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

// Sign in with Apple
router.post('/apple', validate(AppleAuthSchema), (req, res, next) =>
  authController.appleAuth(req, res, next)
);

// Sign in with Google
router.post('/google', validate(GoogleAuthSchema), (req, res, next) =>
  authController.googleAuth(req, res, next)
);

// Request password reset
router.post('/forgot-password', validate(ForgotPasswordSchema), (req, res, next) =>
  authController.forgotPassword(req, res, next)
);

// Reset password with token
router.post('/reset-password', validate(ResetPasswordSchema), (req, res, next) =>
  authController.resetPassword(req, res, next)
);

// Get current user profile (requires authentication)
router.get('/me', requireAuth, (req, res, next) =>
  authController.getMe(req, res, next)
);

// Update current user profile (requires authentication)
router.put('/me', requireAuth, validate(UpdateProfileSchema), (req, res, next) =>
  authController.updateMe(req, res, next)
);

// Delete user account (soft delete with 30-day grace period)
router.delete('/account', requireAuth, (req, res, next) =>
  authController.deleteAccount(req, res, next)
);

export default router;
