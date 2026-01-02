import { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service';
import { successResponse, ApiInfo } from '../types/api.types';
import { config } from '../config';

/**
 * Health Controller
 *
 * Handles health check and API info endpoints.
 * This is an example of the controller layer pattern:
 * - Controllers handle HTTP request/response
 * - Controllers call services for business logic
 * - Controllers format responses consistently
 */
export class HealthController {
  /**
   * GET /health - Infrastructure health check
   * Used by Railway/load balancers to verify service is running
   */
  async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await healthService.getHealthStatus();

      const httpStatus = status.status === 'ok' ? 200 : 503;

      res.status(httpStatus).json(
        successResponse(status, {
          requestId: req.requestId,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1 - API information endpoint
   */
  getApiInfo(req: Request, res: Response): void {
    const info: ApiInfo = {
      name: 'Giglet API',
      version: '1.0.0',
      description: 'API for Giglet - Smart earnings tracker for food delivery drivers',
      environment: config.nodeEnv,
    };

    res.json(
      successResponse(info, {
        requestId: req.requestId,
      })
    );
  }
}

// Export singleton instance
export const healthController = new HealthController();
