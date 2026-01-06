/**
 * Unit tests for Tips Service
 * Story 10-1: Tip Logging Button and UI
 * Story 10-2: Tip Location Storage Backend
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for proper mock setup
const mockPost = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());

// Mock the API module
vi.mock('../api', () => ({
  default: {
    post: mockPost,
    get: mockGet,
  },
}));

// Import after mocking
import { logTip, getTips, getTipsInViewport, TipSize } from '../tips';

describe('Tips Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logTip', () => {
    it('should successfully log a tip with valid data', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'tip-123',
            userId: 'user-456',
            lat: 34.0522,
            lng: -118.2437,
            tipSize: 'MEDIUM' as TipSize,
            createdAt: '2026-01-06T12:00:00.000Z',
          },
        },
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await logTip({
        lat: 34.0522,
        lng: -118.2437,
        tipSize: 'MEDIUM',
      });

      expect(mockPost).toHaveBeenCalledWith('/tips', {
        lat: 34.0522,
        lng: -118.2437,
        tipSize: 'MEDIUM',
      });
      expect(result.id).toBe('tip-123');
      expect(result.tipSize).toBe('MEDIUM');
    });

    it('should handle all tip sizes', async () => {
      const tipSizes: TipSize[] = ['NONE', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE'];

      for (const tipSize of tipSizes) {
        mockPost.mockResolvedValue({
          data: {
            success: true,
            data: {
              id: `tip-${tipSize}`,
              tipSize,
              lat: 0,
              lng: 0,
              createdAt: new Date().toISOString(),
            },
          },
        });

        const result = await logTip({
          lat: 0,
          lng: 0,
          tipSize,
        });

        expect(result.tipSize).toBe(tipSize);
      }
    });

    it('should throw error when API call fails', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      await expect(
        logTip({
          lat: 34.0522,
          lng: -118.2437,
          tipSize: 'SMALL',
        })
      ).rejects.toThrow('Network error');
    });

    it('should send correct coordinates', async () => {
      mockPost.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 'tip-coord',
            lat: -33.8688,
            lng: 151.2093,
            tipSize: 'LARGE',
            createdAt: new Date().toISOString(),
          },
        },
      });

      await logTip({
        lat: -33.8688,
        lng: 151.2093,
        tipSize: 'LARGE',
      });

      expect(mockPost).toHaveBeenCalledWith('/tips', {
        lat: -33.8688,
        lng: 151.2093,
        tipSize: 'LARGE',
      });
    });
  });

  describe('TipSize type', () => {
    it('should have valid tip size values', () => {
      const validSizes: TipSize[] = ['NONE', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE'];
      expect(validSizes).toHaveLength(6);
    });
  });

  describe('getTips (Story 10-2)', () => {
    const mockTipsResponse = {
      tips: [
        { id: 'tip-1', lat: 34.0, lng: -118.0, tipSize: 'LARGE' as TipSize, createdAt: '2026-01-05T00:00:00.000Z' },
        { id: 'tip-2', lat: 34.1, lng: -118.1, tipSize: 'MEDIUM' as TipSize, createdAt: '2026-01-04T00:00:00.000Z' },
      ],
      pagination: {
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    };

    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: {
          success: true,
          data: mockTipsResponse,
        },
      });
    });

    it('should fetch tips with no filters', async () => {
      const result = await getTips();

      expect(mockGet).toHaveBeenCalledWith('/tips');
      expect(result.tips).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should include tipSize filter in query params', async () => {
      await getTips({ tipSize: 'LARGE' });

      expect(mockGet).toHaveBeenCalledWith('/tips?tipSize=LARGE');
    });

    it('should include date range filters in query params', async () => {
      await getTips({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-05T00:00:00.000Z',
      });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2026-01-01T00%3A00%3A00.000Z')
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2026-01-05T00%3A00%3A00.000Z')
      );
    });

    it('should include viewport bounds in query params', async () => {
      await getTips({
        minLat: 34.0,
        maxLat: 34.5,
        minLng: -118.5,
        maxLng: -118.0,
      });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('minLat=34')
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('maxLat=34.5')
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('minLng=-118.5')
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('maxLng=-118')
      );
    });

    it('should include pagination params in query', async () => {
      await getTips({ limit: 25, offset: 50 });

      expect(mockGet).toHaveBeenCalledWith('/tips?limit=25&offset=50');
    });

    it('should combine multiple filters', async () => {
      await getTips({
        tipSize: 'MEDIUM',
        limit: 10,
        offset: 0,
      });

      expect(mockGet).toHaveBeenCalledWith('/tips?tipSize=MEDIUM&limit=10&offset=0');
    });

    it('should throw error when API call fails', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(getTips()).rejects.toThrow('Network error');
    });
  });

  describe('getTipsInViewport', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: {
          success: true,
          data: {
            tips: [],
            pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
          },
        },
      });
    });

    it('should call getTips with viewport bounds', async () => {
      await getTipsInViewport({
        minLat: 34.0,
        maxLat: 34.5,
        minLng: -118.5,
        maxLng: -118.0,
      });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('minLat=34')
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('maxLat=34.5')
      );
    });

    it('should accept optional tipSize and limit', async () => {
      await getTipsInViewport(
        { minLat: 34.0, maxLat: 34.5, minLng: -118.5, maxLng: -118.0 },
        { tipSize: 'LARGE', limit: 100 }
      );

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('tipSize=LARGE')
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('limit=100')
      );
    });
  });
});
