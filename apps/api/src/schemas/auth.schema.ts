import { z } from 'zod';

/**
 * Password validation regex: at least one number
 */
const passwordRegex = /\d/;

/**
 * Registration request schema
 */
export const RegisterSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Please enter a valid email')
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => passwordRegex.test(val), 'Password must contain at least 1 number'),

  name: z.string().min(1).max(100).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Login request schema
 */
export const LoginSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Please enter a valid email')
    .transform((val) => val.toLowerCase().trim()),

  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Refresh token request schema
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string({ message: 'Refresh token is required' }),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
