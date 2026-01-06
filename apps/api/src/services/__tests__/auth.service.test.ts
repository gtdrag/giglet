/**
 * Unit tests for Auth Service - Account Deletion
 * Story 9-4: Account Deletion functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to properly define mocks before hoisting
const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  refreshTokenDeleteMany: vi.fn(),
  transaction: vi.fn(),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Mock Prisma with hoisted mocks
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    refreshToken: {
      deleteMany: mocks.refreshTokenDeleteMany,
      create: vi.fn(),
    },
    $transaction: mocks.transaction,
  },
}));

// Mock config
vi.mock('../../config', () => ({
  config: {
    jwtSecret: 'test-secret',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    appleBundleId: 'com.test.app',
    googleClientId: 'test-client-id',
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock jwt utils
vi.mock('../../utils/jwt', () => ({
  generateAccessToken: vi.fn().mockReturnValue('mock_access_token'),
  generateRefreshToken: vi.fn().mockReturnValue('mock_refresh_token'),
  parseExpiry: vi.fn().mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
}));

// Import after mocking
import { authService } from '../auth.service';
import { AppError } from '../../middleware/error.middleware';

describe('AuthService - Account Deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteAccount', () => {
    it('should schedule account deletion 30 days in the future', async () => {
      const userId = 'user-123';
      const mockUser = { id: userId, email: 'test@example.com' };

      mocks.userFindUnique.mockResolvedValue(mockUser);
      mocks.transaction.mockResolvedValue([{}, {}]);

      const result = await authService.deleteAccount(userId);

      // Check that deletion is scheduled ~30 days from now
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);

      expect(result.deletionScheduledAt).toBeDefined();
      // Allow 1 second tolerance for test timing
      const timeDiff = Math.abs(result.deletionScheduledAt.getTime() - expectedDate.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should throw error if user not found', async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      await expect(authService.deleteAccount('nonexistent-user')).rejects.toThrow();
    });

    it('should call prisma transaction to update user and delete tokens', async () => {
      const userId = 'user-123';
      mocks.userFindUnique.mockResolvedValue({ id: userId, email: 'test@example.com' });
      mocks.transaction.mockResolvedValue([{}, {}]);

      await authService.deleteAccount(userId);

      // Verify transaction was called (it receives an array of Prisma operations)
      expect(mocks.transaction).toHaveBeenCalledTimes(1);
      expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('cancelDeletion', () => {
    it('should set deletionScheduledAt to null', async () => {
      const userId = 'user-123';
      mocks.userUpdate.mockResolvedValue({ id: userId, deletionScheduledAt: null });

      await authService.cancelDeletion(userId);

      expect(mocks.userUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: { deletionScheduledAt: null },
      });
    });
  });

  describe('login - account recovery', () => {
    const loginInput = { email: 'test@example.com', password: 'password123' };

    it('should recover account if deletion is pending', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // 15 days in the future

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: 'Test User',
        deletionScheduledAt: futureDate,
      };

      mocks.userFindUnique.mockResolvedValue(mockUser);
      mocks.userUpdate.mockResolvedValue({ ...mockUser, deletionScheduledAt: null });

      const result = await authService.login(loginInput);

      expect(result.accountRecovered).toBe(true);
      expect(mocks.userUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { deletionScheduledAt: null },
      });
    });

    it('should not set accountRecovered if deletion not pending', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: 'Test User',
        deletionScheduledAt: null,
      };

      mocks.userFindUnique.mockResolvedValue(mockUser);

      const result = await authService.login(loginInput);

      expect(result.accountRecovered).toBe(false);
    });

    it('should throw error if account deletion date has passed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days in the past

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: 'Test User',
        deletionScheduledAt: pastDate,
      };

      mocks.userFindUnique.mockResolvedValue(mockUser);

      await expect(authService.login(loginInput)).rejects.toThrow('This account has been deleted');
    });

    it('should throw error for invalid password', async () => {
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: 'Test User',
        deletionScheduledAt: null,
      };

      mocks.userFindUnique.mockResolvedValue(mockUser);

      await expect(authService.login(loginInput)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for non-existent user', async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      await expect(authService.login(loginInput)).rejects.toThrow('Invalid email or password');
    });
  });
});
