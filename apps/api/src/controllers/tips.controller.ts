import { Request, Response, NextFunction } from 'express';
import { tipsService } from '../services/tips.service';
import { successResponse } from '../types/api.types';
import { errors } from '../middleware/error.middleware';
import type { CreateTipLogInput, GetTipsQueryInput } from '../schemas/tips.schema';

class TipsController {
  /**
   * POST /api/v1/tips
   * Create a new tip log entry
   *
   * Body is validated by middleware before reaching this handler
   */
  async createTipLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      // Body is validated and typed by middleware
      const { lat, lng, tipSize } = req.body as CreateTipLogInput['body'];

      const tipLog = await tipsService.createTipLog(userId, { lat, lng, tipSize });

      res.status(201).json(successResponse({
        id: tipLog.id,
        lat: tipLog.lat,
        lng: tipLog.lng,
        tipSize: tipLog.tipSize,
        createdAt: tipLog.createdAt.toISOString(),
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/tips
   * Query tip logs for the authenticated user with optional filters
   *
   * Query params:
   * - tipSize: Minimum tip size filter (returns this size and above)
   * - startDate: Filter by start date (ISO 8601)
   * - endDate: Filter by end date (ISO 8601)
   * - minLat, maxLat, minLng, maxLng: Viewport bounds filter
   * - limit: Results per page (default 50, max 100)
   * - offset: Pagination offset (default 0)
   */
  async getTips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      // Query params are validated and typed by middleware
      const query = req.query as unknown as GetTipsQueryInput['query'];

      const result = await tipsService.queryTips(userId, {
        tipSize: query.tipSize,
        startDate: query.startDate,
        endDate: query.endDate,
        minLat: query.minLat,
        maxLat: query.maxLat,
        minLng: query.minLng,
        maxLng: query.maxLng,
        limit: query.limit,
        offset: query.offset,
      });

      // Format response
      const tips = result.tips.map(tip => ({
        id: tip.id,
        lat: tip.lat,
        lng: tip.lng,
        tipSize: tip.tipSize,
        createdAt: tip.createdAt.toISOString(),
      }));

      res.json(successResponse({
        tips,
        pagination: result.pagination,
      }));
    } catch (error) {
      next(error);
    }
  }
}

export const tipsController = new TipsController();
