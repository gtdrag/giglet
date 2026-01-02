import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse } from '../types/api.types';
import type { RegisterInput, LoginInput, RefreshTokenInput, AppleAuthInput, GoogleAuthInput } from '../schemas/auth.schema';

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
}

export const authController = new AuthController();
