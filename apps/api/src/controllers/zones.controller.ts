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
   * GET /api/v1/zones/nearby
   * Get nearby zones with scores, filtered for land only
   * Main endpoint for mobile app
   */
  async getNearbyZones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, timezone } = req.query as unknown as GetZonesQuery;

      const zones = await zonesService.getNearbyZones(lat, lng, timezone);

      res.json({
        success: true,
        data: {
          zones,
          meta: {
            center: { lat, lng },
            totalZones: zones.length,
            calculatedAt: new Date().toISOString(),
            timezone,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/zones/stream
   * Stream nearby zones one-by-one as they're geocoded using SSE
   * Returns Server-Sent Events format for React Native compatibility
   * Cached zones appear instantly, uncached take ~1 sec each (Nominatim rate limit)
   */
  async streamNearbyZones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, timezone } = req.query as unknown as GetZonesQuery;

      // Set headers for SSE streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send initial meta event with total expected zones (5x5 grid = 25)
      res.write(`event: meta\ndata: ${JSON.stringify({ totalCandidates: 25, center: { lat, lng } })}\n\n`);

      let zoneCount = 0;
      let processed = 0;

      for await (const zone of zonesService.streamNearbyZones(lat, lng, timezone)) {
        zoneCount++;
        processed++;
        // Send zone event
        res.write(`event: zone\ndata: ${JSON.stringify({ zone, processed, total: 25 })}\n\n`);
      }

      // Account for zones that were filtered (water)
      const totalProcessed = 25; // Grid is always 5x5

      // Send completion event
      res.write(`event: complete\ndata: ${JSON.stringify({ totalZones: zoneCount, totalProcessed })}\n\n`);
      res.end();
    } catch (error) {
      // Send error event before failing
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Stream failed' })}\n\n`);
      res.end();
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
