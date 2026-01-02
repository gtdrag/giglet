import { z } from 'zod';

/**
 * Platform types
 */
export const PlatformEnum = z.enum(['DOORDASH', 'UBEREATS']);
export type Platform = z.infer<typeof PlatformEnum>;

/**
 * Connect platform request schema
 */
export const ConnectPlatformSchema = z.object({
  platform: PlatformEnum,
  email: z
    .string({ message: 'Email is required' })
    .email('Please enter a valid email'),
  password: z
    .string({ message: 'Password is required' })
    .min(1, 'Password is required'),
});

export type ConnectPlatformInput = z.infer<typeof ConnectPlatformSchema>;

/**
 * Disconnect platform request schema
 */
export const DisconnectPlatformSchema = z.object({
  platform: PlatformEnum,
});

export type DisconnectPlatformInput = z.infer<typeof DisconnectPlatformSchema>;
