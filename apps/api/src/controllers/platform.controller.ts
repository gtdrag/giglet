import { Request, Response, NextFunction } from 'express';
import { Platform } from '@prisma/client';
import { platformService } from '../services/platform.service';
import { successResponse } from '../types/api.types';
import { errors } from '../middleware/error.middleware';
import type { ConnectPlatformInput, DisconnectPlatformInput } from '../schemas/platform.schema';

class PlatformController {
  /**
   * POST /api/v1/platforms/connect
   * Connect a platform account (store encrypted credentials)
   */
  async connect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const input: ConnectPlatformInput = req.body;
      const account = await platformService.connectPlatform(userId, input);

      res.status(201).json(successResponse(account));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/platforms
   * List all connected platforms for the user
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const accounts = await platformService.getUserPlatforms(userId);

      res.json(successResponse({ platforms: accounts }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/platforms/:platform
   * Get a specific platform connection status
   */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const platform = req.params.platform.toUpperCase() as Platform;
      const account = await platformService.getPlatformAccount(userId, platform);

      if (!account) {
        throw errors.notFound(`${platform} account not found`);
      }

      res.json(successResponse(account));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/platforms/disconnect
   * Disconnect a platform account
   */
  async disconnect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const input: DisconnectPlatformInput = req.body;
      await platformService.disconnectPlatform(userId, input.platform);

      res.json(successResponse({ message: `${input.platform} account disconnected` }));
    } catch (error) {
      next(error);
    }
  }
}

export const platformController = new PlatformController();
