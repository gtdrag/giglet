import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Giglet API',
      version: '1.0.0',
      description: 'API for Giglet - Smart earnings tracker for food delivery drivers',
    },
  });
});

export default router;
