import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse } from '../types/api.types';
import type { RegisterInput } from '../schemas/auth.schema';

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
}

export const authController = new AuthController();
