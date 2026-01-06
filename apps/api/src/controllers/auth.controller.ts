import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse } from '../types/api.types';
import { prisma } from '../lib/prisma';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  AppleAuthInput,
  GoogleAuthInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../schemas/auth.schema';
import type { UpdateProfileInput } from '../schemas/user.schema';

class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register a new user with email and password
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: RegisterInput = req.body;
      const result = await authService.register(input);

      res.status(201).json(
        successResponse({
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   * Login with email and password
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const result = await authService.login(input);

      res.json(
        successResponse({
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          accountRecovered: result.accountRecovered || false,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: RefreshTokenInput = req.body;
      const tokens = await authService.refresh(input);

      res.json(
        successResponse({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Logout user by invalidating refresh token
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      res.json(successResponse({ message: 'Logged out successfully' }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/apple
   * Sign in with Apple
   */
  async appleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: AppleAuthInput = req.body;
      const result = await authService.appleAuth(input);

      res.json(
        successResponse({
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/google
   * Sign in with Google
   */
  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: GoogleAuthInput = req.body;
      const result = await authService.googleAuth(input);

      res.json(
        successResponse({
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset email
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: ForgotPasswordInput = req.body;
      await authService.forgotPassword(input);

      // Always return success to prevent email enumeration
      res.json(successResponse({ message: 'If an account exists, a reset email has been sent.' }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * Reset password using token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: ResetPasswordInput = req.body;
      await authService.resetPassword(input);

      res.json(successResponse({ message: 'Password reset successfully. You can now log in.' }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current user's profile including subscription status
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true,
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // Return user data with subscription info
      res.json(
        successResponse({
          id: user.id,
          email: user.email,
          name: user.name,
          subscription: user.subscription
            ? {
                tier: user.subscription.tier,
                status: user.subscription.status,
                currentPeriodStart: user.subscription.currentPeriodStart,
                currentPeriodEnd: user.subscription.currentPeriodEnd,
              }
            : {
                tier: 'FREE',
                status: 'ACTIVE',
                currentPeriodStart: null,
                currentPeriodEnd: null,
              },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/auth/me
   * Update current user's profile (name only)
   */
  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const input: UpdateProfileInput = req.body;

      // Update user name
      const user = await prisma.user.update({
        where: { id: userId },
        data: { name: input.name },
        include: {
          subscription: true,
        },
      });

      // Return updated user data
      res.json(
        successResponse({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            authProvider: user.authProvider,
            createdAt: user.createdAt,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/auth/account
   * Delete user account (soft delete with 30-day grace period)
   */
  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await authService.deleteAccount(userId);

      res.json(
        successResponse({
          message: 'Account scheduled for deletion',
          deletionScheduledAt: result.deletionScheduledAt.toISOString(),
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
