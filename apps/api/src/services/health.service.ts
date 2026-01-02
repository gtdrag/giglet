import prisma from '../lib/prisma';
import { HealthStatus } from '../types/api.types';

const startTime = Date.now();

/**
 * Health Service
 *
 * Provides health check functionality for the API.
 * This is an example of the service layer pattern:
 * - Services contain business logic
 * - Services are called by controllers
 * - Services can be tested independently
 */
export class HealthService {
  /**
   * Get current health status including database connectivity
   */
  async getHealthStatus(): Promise<HealthStatus> {
    let databaseStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'disconnected';
    }

    const status = databaseStatus === 'connected' ? 'ok' : 'degraded';

    return {
      status,
      database: databaseStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  }
}

// Export singleton instance
export const healthService = new HealthService();
