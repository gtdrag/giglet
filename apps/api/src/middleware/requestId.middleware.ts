import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type to include requestId
declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

/**
 * Middleware that assigns a unique request ID to each incoming request.
 * The ID is:
 * - Attached to req.requestId for use in logging/tracing
 * - Added to response headers as X-Request-ID
 * - Can be passed from client via X-Request-ID header (for distributed tracing)
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use client-provided ID if present, otherwise generate new one
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
