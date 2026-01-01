import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import prisma from './lib/prisma';

const { port, nodeEnv } = config;

const server = app.listen(port, () => {
  logger.info(`Server started`, {
    port,
    env: nodeEnv,
    url: `http://localhost:${port}`,
  });
  logger.info(`Health check: http://localhost:${port}/health`);
  logger.info(`API docs: http://localhost:${port}/api/v1`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

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
