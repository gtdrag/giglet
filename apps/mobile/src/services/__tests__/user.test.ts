import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProfile, updateProfile, UserServiceError } from '../user';
import api from '../api';

// Mock the api module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProfile', () => {
    it('returns user profile on success', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        authProvider: 'EMAIL' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: { user: mockUser },
        },
      });

      const result = await getProfile();

      expect(result).toEqual(mockUser);
      expect(api.get).toHaveBeenCalledWith('/auth/me');
    });

    it('throws UserServiceError on API failure', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        },
      });

      await expect(getProfile()).rejects.toThrow(UserServiceError);
    });

    it('throws UserServiceError with network error message', async () => {
      vi.mocked(api.get).mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Network error' },
          },
        },
      });

      await expect(getProfile()).rejects.toThrow('Network error');
    });

    it('throws UserServiceError with default message on unknown error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unknown'));

      await expect(getProfile()).rejects.toThrow('Failed to fetch profile. Please try again.');
    });
  });

  describe('updateProfile', () => {
    const mockUpdatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Jane Doe',
      authProvider: 'EMAIL' as const,
      createdAt: '2024-01-01T00:00:00Z',
    };

    it('returns updated user on success', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          success: true,
          data: { user: mockUpdatedUser },
        },
      });

      const result = await updateProfile({ name: 'Jane Doe' });

      expect(result).toEqual(mockUpdatedUser);
      expect(api.put).toHaveBeenCalledWith('/auth/me', { name: 'Jane Doe' });
    });

    it('throws UserServiceError on API failure', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'UPDATE_ERROR', message: 'Update failed' },
        },
      });

      await expect(updateProfile({ name: 'Jane' })).rejects.toThrow(UserServiceError);
    });

    it('throws UserServiceError with validation error on 400 response', async () => {
      vi.mocked(api.put).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: { message: 'Name cannot be empty' },
          },
        },
      });

      try {
        await updateProfile({ name: '' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserServiceError);
        expect((error as UserServiceError).message).toBe('Name cannot be empty');
        expect((error as UserServiceError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('throws UserServiceError with network error on non-400 response', async () => {
      vi.mocked(api.put).mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: { message: 'Server error' },
          },
        },
      });

      try {
        await updateProfile({ name: 'Jane' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserServiceError);
        expect((error as UserServiceError).code).toBe('NETWORK_ERROR');
      }
    });

    it('throws UserServiceError with default message on unknown error', async () => {
      vi.mocked(api.put).mockRejectedValueOnce(new Error('Unknown'));

      await expect(updateProfile({ name: 'Jane' })).rejects.toThrow(
        'Failed to update profile. Please try again.'
      );
    });
  });

  describe('UserServiceError', () => {
    it('creates error with correct properties', () => {
      const error = new UserServiceError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('UserServiceError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
