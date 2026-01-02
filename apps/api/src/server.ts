import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import prisma from './lib/prisma';
import { closeRedisConnection } from './lib/redis';
import { closeQueues } from './lib/queue';
import { startWorker, stopWorker } from './jobs/worker';
import { startScheduler, stopScheduler } from './jobs/scheduler';

const { port, nodeEnv } = config;

// Check if we should run the worker (can be disabled for API-only mode)
const RUN_WORKER = process.env.RUN_WORKER !== 'false';

const server = app.listen(port, async () => {
  logger.info(`Server started`, {
    port,
    env: nodeEnv,
    url: `http://localhost:${port}`,
    workerEnabled: RUN_WORKER,
  });
  logger.info(`Health check: http://localhost:${port}/health`);
  logger.info(`API docs: http://localhost:${port}/api/v1`);

  // Start background worker and scheduler if enabled
  if (RUN_WORKER) {
    try {
      startWorker();
      await startScheduler();
      logger.info('Background worker and scheduler started');
    } catch (error) {
      logger.error('Failed to start background services', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't fail server startup - can run in API-only mode
    }
  }
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  // Stop background services first
  if (RUN_WORKER) {
    stopScheduler();
    await stopWorker();
    await closeQueues();
    await closeRedisConnection();
    logger.info('Background services stopped');
  }

  server.close(async () => {
    logger.info('HTTP server closed');

    // Disconnect Prisma
    await prisma.$disconnect();
    logger.info('Database connection closed');

    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
