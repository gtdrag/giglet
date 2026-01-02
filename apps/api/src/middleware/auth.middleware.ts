import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { errors } from './error.middleware';

// Extend Express Request to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

/**
 * Middleware to verify JWT access token
 * Extracts user info from token and attaches to request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(errors.unauthorized('Missing or invalid authorization header'));
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(errors.unauthorized('Invalid or expired access token'));
  }
}
