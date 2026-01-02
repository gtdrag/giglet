import { Request, Response, NextFunction } from 'express';
import { earningsService } from '../services/earnings.service';
import { successResponse } from '../types/api.types';
import { errors } from '../middleware/error.middleware';
import type { GetEarningsSummaryInput, GetDeliveriesInput } from '../schemas/earnings.schema';

class EarningsController {
  /**
   * GET /api/v1/earnings/summary
   * Get earnings summary for a period
   *
   * Query params are validated by middleware before reaching this handler
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      // Query params are validated and typed by middleware
      const { period, timezone } = req.query as unknown as GetEarningsSummaryInput['query'];

      const summary = await earningsService.getEarningsSummary(userId, period, timezone);

      res.json(successResponse(summary));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/earnings/deliveries
   * Get list of individual deliveries
   *
   * Query params are validated by middleware before reaching this handler
   */
  async getDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      // Query params are validated and typed by middleware
      const { period, timezone, limit, offset } = req.query as unknown as GetDeliveriesInput['query'];

      const result = await earningsService.getDeliveries(userId, period, timezone, limit, offset);

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
}

export const earningsController = new EarningsController();
