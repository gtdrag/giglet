/**
 * Unit tests for Tips Service
 * Story 10-1: Tip Logging Button and UI
 * Story 10-2: Tip Location Storage Backend
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks for Prisma
const mockTipLogCreate = vi.hoisted(() => vi.fn());
const mockTipLogFindMany = vi.hoisted(() => vi.fn());
const mockTipLogCount = vi.hoisted(() => vi.fn());

vi.mock('../../lib/prisma', () => ({
  prisma: {
    tipLog: {
      create: mockTipLogCreate,
      findMany: mockTipLogFindMany,
      count: mockTipLogCount,
    },
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocking
import { tipsService } from '../tips.service';

describe('Tips Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTipLog', () => {
    it('should create a tip log with valid data', async () => {
      const mockTipLog = {
        id: 'tip-123',
        userId: 'user-456',
        lat: 34.0522,
        lng: -118.2437,
        tipSize: 'MEDIUM',
        createdAt: new Date('2026-01-06T12:00:00.000Z'),
      };
      mockTipLogCreate.mockResolvedValue(mockTipLog);

      const result = await tipsService.createTipLog('user-456', {
        lat: 34.0522,
        lng: -118.2437,
        tipSize: 'MEDIUM',
      });

      expect(mockTipLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          lat: 34.0522,
          lng: -118.2437,
          tipSize: 'MEDIUM',
        },
      });
      expect(result).toEqual(mockTipLog);
    });

    it('should handle NONE tip size', async () => {
      const mockTipLog = {
        id: 'tip-none',
        userId: 'user-456',
        lat: 0,
        lng: 0,
        tipSize: 'NONE',
        createdAt: new Date(),
      };
      mockTipLogCreate.mockResolvedValue(mockTipLog);

      const result = await tipsService.createTipLog('user-456', {
        lat: 0,
        lng: 0,
        tipSize: 'NONE',
      });

      expect(result.tipSize).toBe('NONE');
    });

    it('should handle XXLARGE tip size', async () => {
      const mockTipLog = {
        id: 'tip-xxl',
        userId: 'user-456',
        lat: 40.7128,
        lng: -74.006,
        tipSize: 'XXLARGE',
        createdAt: new Date(),
      };
      mockTipLogCreate.mockResolvedValue(mockTipLog);

      const result = await tipsService.createTipLog('user-456', {
        lat: 40.7128,
        lng: -74.006,
        tipSize: 'XXLARGE',
      });

      expect(result.tipSize).toBe('XXLARGE');
    });

    it('should accept negative coordinates', async () => {
      const mockTipLog = {
        id: 'tip-neg',
        userId: 'user-456',
        lat: -33.8688,
        lng: 151.2093,
        tipSize: 'SMALL',
        createdAt: new Date(),
      };
      mockTipLogCreate.mockResolvedValue(mockTipLog);

      const result = await tipsService.createTipLog('user-456', {
        lat: -33.8688,
        lng: 151.2093,
        tipSize: 'SMALL',
      });

      expect(mockTipLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          lat: -33.8688,
          lng: 151.2093,
          tipSize: 'SMALL',
        },
      });
      expect(result.lat).toBe(-33.8688);
      expect(result.lng).toBe(151.2093);
    });

    it('should propagate database errors', async () => {
      mockTipLogCreate.mockRejectedValue(new Error('Database connection error'));

      await expect(
        tipsService.createTipLog('user-456', {
          lat: 0,
          lng: 0,
          tipSize: 'MEDIUM',
        })
      ).rejects.toThrow('Database connection error');
    });
  });

  describe('queryTips (Story 10-2)', () => {
    const mockTips = [
      { id: 'tip-1', userId: 'user-456', lat: 34.0, lng: -118.0, tipSize: 'LARGE', createdAt: new Date('2026-01-05') },
      { id: 'tip-2', userId: 'user-456', lat: 34.1, lng: -118.1, tipSize: 'MEDIUM', createdAt: new Date('2026-01-04') },
      { id: 'tip-3', userId: 'user-456', lat: 34.2, lng: -118.2, tipSize: 'SMALL', createdAt: new Date('2026-01-03') },
    ];

    beforeEach(() => {
      mockTipLogCount.mockResolvedValue(3);
      mockTipLogFindMany.mockResolvedValue(mockTips);
    });

    it('should return all tips for a user with default pagination (AC: 1, 5)', async () => {
      const result = await tipsService.queryTips('user-456');

      expect(mockTipLogCount).toHaveBeenCalledWith({
        where: { userId: 'user-456' },
      });
      expect(mockTipLogFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-456' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result.tips).toEqual(mockTips);
      expect(result.pagination).toEqual({
        total: 3,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('should filter by tipSize hierarchy - LARGE returns LARGE, XLARGE, XXLARGE (AC: 2)', async () => {
      await tipsService.queryTips('user-456', { tipSize: 'LARGE' });

      expect(mockTipLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-456',
            tipSize: { in: ['LARGE', 'XLARGE', 'XXLARGE'] },
          }),
        })
      );
    });

    it('should filter by tipSize hierarchy - SMALL returns all except NONE (AC: 2)', async () => {
      await tipsService.queryTips('user-456', { tipSize: 'SMALL' });

      expect(mockTipLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tipSize: { in: ['SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE'] },
          }),
        })
      );
    });

    it('should filter by tipSize hierarchy - NONE returns all tips (AC: 2)', async () => {
      await tipsService.queryTips('user-456', { tipSize: 'NONE' });

      expect(mockTipLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tipSize: { in: ['NONE', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE'] },
          }),
        })
      );
    });

    it('should filter by date range (AC: 3)', async () => {
      await tipsService.queryTips('user-456', {
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-05T00:00:00.000Z',
      });

      expect(mockTipLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-456',
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter by startDate only (AC: 3)', async () => {
      await tipsService.queryTips('user-456', {
        startDate: '2026-01-01T00:00:00.000Z',
      });

      expect(mockTipLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter by viewport bounds (AC: 4)', async () => {
      await tipsService.queryTips('user-456', {
        minLat: 34.0,
        maxLat: 34.5,
        minLng: -118.5,
        maxLng: -118.0,
      });

      expect(mockTipLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-456',
            lat: { gte: 34.0, lte: 34.5 },
            lng: { gte: -118.5, lte: -118.0 },
          }),
        })
      );
    });

    it('should respect custom pagination (AC: 5)', async () => {
      await tipsService.queryTips('user-456', { limit: 10, offset: 20 });

      expect(mockTipLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should return hasMore=true when more results exist (AC: 5)', async () => {
      mockTipLogCount.mockResolvedValue(100);
      mockTipLogFindMany.mockResolvedValue(mockTips.slice(0, 2));

      const result = await tipsService.queryTips('user-456', { limit: 2, offset: 0 });

      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.total).toBe(100);
    });

    it('should combine multiple filters', async () => {
      await tipsService.queryTips('user-456', {
        tipSize: 'MEDIUM',
        startDate: '2026-01-01T00:00:00.000Z',
        minLat: 34.0,
        maxLat: 35.0,
        minLng: -119.0,
        maxLng: -118.0,
        limit: 25,
        offset: 5,
      });

      expect(mockTipLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-456',
            tipSize: { in: ['MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE'] },
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
            lat: { gte: 34.0, lte: 35.0 },
            lng: { gte: -119.0, lte: -118.0 },
          }),
          take: 25,
          skip: 5,
        })
      );
    });

    it('should propagate database errors', async () => {
      mockTipLogFindMany.mockRejectedValue(new Error('Query failed'));

      await expect(tipsService.queryTips('user-456')).rejects.toThrow('Query failed');
    });
  });
});
