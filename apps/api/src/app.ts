import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://giglet.app']
        : ['http://localhost:8081', 'http://localhost:19006'],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.body,
    });
    next();
  });
}

// Mount routes
app.use('/api/v1', routes);

// Health check at root (for Railway/infrastructure)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handling (must be last)
app.use(errorHandler);

export default app;
