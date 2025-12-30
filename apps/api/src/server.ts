import app from './app';
import { config } from './config';
import { logger } from './utils/logger';

const { port, nodeEnv } = config;

app.listen(port, () => {
  logger.info(`Server started`, {
    port,
    env: nodeEnv,
    url: `http://localhost:${port}`,
  });
  logger.info(`Health check: http://localhost:${port}/health`);
  logger.info(`API docs: http://localhost:${port}/api/v1`);
});
