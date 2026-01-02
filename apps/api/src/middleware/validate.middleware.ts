import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './error.middleware';

/**
 * Validation middleware factory using Zod schemas
 *
 * Usage:
 * ```ts
 * router.post('/register', validate(RegisterSchema), authController.register);
 * ```
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const formattedErrors = formatZodErrors(result.error);
        throw new AppError('VALIDATION_ERROR', 'Invalid request data', 400, {
          errors: formattedErrors,
        });
      }

      // Replace body with validated data (includes defaults and transformations)
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Format Zod errors into a user-friendly structure
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}
