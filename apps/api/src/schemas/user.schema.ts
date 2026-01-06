import { z } from 'zod';

/**
 * Schema for updating user profile
 * PUT /api/v1/auth/me
 */
export const UpdateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name must be 100 characters or less'),
  }),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>['body'];
