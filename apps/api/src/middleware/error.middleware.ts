import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factory functions
export const errors = {
  validation: (message: string, details?: Record<string, unknown>) =>
    new AppError('VALIDATION_ERROR', message, 400, details),

  unauthorized: (message = 'Unauthorized') => new AppError('UNAUTHORIZED', message, 401),

  forbidden: (message = 'Forbidden') => new AppError('FORBIDDEN', message, 403),

  notFound: (resource = 'Resource') => new AppError('NOT_FOUND', `${resource} not found`, 404),

  conflict: (message: string) => new AppError('CONFLICT', message, 409),

  rateLimited: (message = 'Too many requests') => new AppError('RATE_LIMITED', message, 429),

  internal: (message = 'Internal server error') => new AppError('SERVER_ERROR', message, 500),
};

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Log unexpected errors
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
