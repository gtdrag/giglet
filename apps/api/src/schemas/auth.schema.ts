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

/**
 * Apple Sign In request schema
 */
export const AppleAuthSchema = z.object({
  identityToken: z.string({ message: 'Identity token is required' }),
  user: z.string().optional(), // Apple user identifier (only provided on first sign-in)
  email: z.string().email().optional(), // Only provided on first sign-in if user allows
  fullName: z
    .object({
      givenName: z.string().nullable().optional(),
      familyName: z.string().nullable().optional(),
    })
    .optional(),
});

export type AppleAuthInput = z.infer<typeof AppleAuthSchema>;

/**
 * Google Sign In request schema
 */
export const GoogleAuthSchema = z.object({
  idToken: z.string({ message: 'ID token is required' }),
});

export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;

/**
 * Forgot password request schema
 */
export const ForgotPasswordSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Please enter a valid email')
    .transform((val) => val.toLowerCase().trim()),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/**
 * Reset password request schema
 */
export const ResetPasswordSchema = z.object({
  token: z.string({ message: 'Reset token is required' }),
  newPassword: z
    .string({ message: 'New password is required' })
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => /\d/.test(val), 'Password must contain at least 1 number'),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
