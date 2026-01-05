import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { UpdatePreferencesInput, UserPreferencesResponse } from '../schemas/preferences.schema';

const prisma = new PrismaClient();

/**
 * Helper to create success response
 */
function successResponse<T>(data: T) {
  return { success: true, data };
}

class UsersController {
  /**
   * Get current user's notification preferences
   * GET /api/v1/users/preferences
   */
  async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      // Find or create user preferences
      let preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await prisma.userPreferences.create({
          data: {
            userId,
            notificationsEnabled: true,
            zoneAlertsEnabled: true,
            syncErrorAlertsEnabled: true,
          },
        });
      }

      const response: UserPreferencesResponse = {
        notificationsEnabled: preferences.notificationsEnabled,
        zoneAlertsEnabled: preferences.zoneAlertsEnabled,
        syncErrorAlertsEnabled: preferences.syncErrorAlertsEnabled,
      };

      res.json(successResponse({ preferences: response }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user's notification preferences
   * PUT /api/v1/users/preferences
   */
  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const input: UpdatePreferencesInput = req.body;

      // Build update data only with provided fields
      const updateData: {
        notificationsEnabled?: boolean;
        zoneAlertsEnabled?: boolean;
        syncErrorAlertsEnabled?: boolean;
      } = {};

      if (input.notificationsEnabled !== undefined) {
        updateData.notificationsEnabled = input.notificationsEnabled;
      }
      if (input.zoneAlertsEnabled !== undefined) {
        updateData.zoneAlertsEnabled = input.zoneAlertsEnabled;
      }
      if (input.syncErrorAlertsEnabled !== undefined) {
        updateData.syncErrorAlertsEnabled = input.syncErrorAlertsEnabled;
      }

      // Upsert preferences (create if not exists, update if exists)
      const preferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          notificationsEnabled: input.notificationsEnabled ?? true,
          zoneAlertsEnabled: input.zoneAlertsEnabled ?? true,
          syncErrorAlertsEnabled: input.syncErrorAlertsEnabled ?? true,
        },
      });

      const response: UserPreferencesResponse = {
        notificationsEnabled: preferences.notificationsEnabled,
        zoneAlertsEnabled: preferences.zoneAlertsEnabled,
        syncErrorAlertsEnabled: preferences.syncErrorAlertsEnabled,
      };

      res.json(successResponse({ preferences: response }));
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
