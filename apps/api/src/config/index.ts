import dotenv from 'dotenv';

dotenv.config();

// Default dev encryption key - MUST be overridden in production
const DEV_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  appleBundleId: process.env.APPLE_BUNDLE_ID || 'app.giglet.driver',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  encryptionKey: process.env.ENCRYPTION_KEY || DEV_ENCRYPTION_KEY,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
} as const;

export type Config = typeof config;
