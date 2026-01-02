import { Request, Response, NextFunction } from 'express';
import { earningsService, EarningsPeriod } from '../services/earnings.service';
import { successResponse } from '../types/api.types';
import { errors } from '../middleware/error.middleware';

class EarningsController {
  /**
   * GET /api/v1/earnings/summary
   * Get earnings summary for a period
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const period = (req.query.period as EarningsPeriod) || 'today';
      const timezone = (req.query.timezone as string) || 'UTC';

      const summary = await earningsService.getEarningsSummary(userId, period, timezone);

      res.json(successResponse(summary));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/earnings/deliveries
   * Get list of individual deliveries
   */
  async getDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const period = (req.query.period as EarningsPeriod) || 'today';
      const timezone = (req.query.timezone as string) || 'UTC';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await earningsService.getDeliveries(userId, period, timezone, limit, offset);

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
}

export const earningsController = new EarningsController();
