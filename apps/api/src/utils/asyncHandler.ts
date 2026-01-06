/**
 * Async Handler Utility
 *
 * Wraps async Express route handlers to automatically catch errors
 * and pass them to the error handling middleware via next().
 *
 * This eliminates the need for try-catch blocks in every controller method.
 *
 * @example
 * // Before:
 * async handler(req: Request, res: Response, next: NextFunction) {
 *   try {
 *     const data = await service.getData();
 *     res.json(data);
 *   } catch (error) {
 *     next(error);
 *   }
 * }
 *
 * // After:
 * handler = asyncHandler(async (req: Request, res: Response) => {
 *   const data = await service.getData();
 *   res.json(data);
 * });
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Wraps an async route handler to catch any errors and pass them to next()
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Type-safe version that preserves request body typing
 * Use this when you need access to validated request body types
 */
export const asyncHandlerTyped = <TBody = unknown>(
  fn: (
    req: Request<unknown, unknown, TBody>,
    res: Response,
    next: NextFunction
  ) => Promise<void>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as Request<unknown, unknown, TBody>, res, next)).catch(next);
  };
};
