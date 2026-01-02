import { Request, Response, NextFunction } from 'express';
import { zonesService } from '../services/zones.service';
import type { GetZonesQuery, GetZoneScoreQuery } from '../schemas/zones.schema';

class ZonesController {
  /**
   * GET /api/v1/zones
   * Get zones with scores near a location
   */
  async getZones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, radius, timezone } = req.query as unknown as GetZonesQuery;

      const zones = await zonesService.getZonesNearLocation(lat, lng, radius, timezone);

      // Also return current score calculation info
      const { score, factors } = zonesService.calculateScore(new Date(), timezone);

      res.json({
        success: true,
        data: {
          zones,
          currentScore: {
            score,
            label: zonesService.getScoreLabel(score),
            factors,
            calculatedAt: new Date().toISOString(),
            timezone,
          },
          meta: {
            center: { lat, lng },
            radiusKm: radius,
            totalZones: zones.length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/zones/score
   * Get current score calculation
   * If lat/lng provided, includes weather and event boosts
   */
  async getCurrentScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, timezone } = req.query as unknown as GetZoneScoreQuery;

      // If lat/lng provided, use full calculation with weather and events
      if (lat !== undefined && lng !== undefined) {
        const { score, factors, weatherDescription, nearbyEvents } =
          await zonesService.calculateScoreWithWeather(lat, lng, new Date(), timezone);

        res.json({
          success: true,
          data: {
            score,
            label: zonesService.getScoreLabel(score),
            factors,
            weatherDescription,
            nearbyEvents,
            calculatedAt: new Date().toISOString(),
            timezone,
            nextRefresh: this.getNextRefreshTime(),
          },
        });
        return;
      }

      // Otherwise, use basic calculation (no external APIs)
      const { score, factors } = zonesService.calculateScore(new Date(), timezone);

      res.json({
        success: true,
        data: {
          score,
          label: zonesService.getScoreLabel(score),
          factors,
          calculatedAt: new Date().toISOString(),
          timezone,
          nextRefresh: this.getNextRefreshTime(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/zones/refresh (admin only in production)
   * Manually trigger score refresh
   */
  async refreshScores(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedCount = await zonesService.refreshAllScores();

      res.json({
        success: true,
        data: {
          message: 'Zone scores refreshed',
          zonesUpdated: updatedCount,
          refreshedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  private getNextRefreshTime(): string {
    const now = new Date();
    const minutes = now.getMinutes();
    const nextRefreshMinute = Math.ceil(minutes / 15) * 15;
    const next = new Date(now);
    next.setMinutes(nextRefreshMinute, 0, 0);
    if (next <= now) {
      next.setMinutes(next.getMinutes() + 15);
    }
    return next.toISOString();
  }
}

export const zonesController = new ZonesController();
