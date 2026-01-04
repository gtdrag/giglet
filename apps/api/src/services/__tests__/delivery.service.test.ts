/**
 * Delivery Service Tests - Import History functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deliveryService } from '../delivery.service';
import { prisma } from '../../lib/prisma';
import { Platform } from '@prisma/client';

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    importBatch: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    delivery: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('DeliveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getImportHistory', () => {
    it('should return import batches for the user ordered by createdAt desc', async () => {
      const mockBatches = [
        {
          id: 'batch-1',
          platform: 'DOORDASH' as Platform,
          filename: 'earnings.csv',
          importedCount: 10,
          duplicateCount: 2,
          errorCount: 0,
          createdAt: new Date('2026-01-02'),
        },
        {
          id: 'batch-2',
          platform: 'UBEREATS' as Platform,
          filename: 'uber.csv',
          importedCount: 5,
          duplicateCount: 0,
          errorCount: 1,
          createdAt: new Date('2026-01-01'),
        },
      ];

      vi.mocked(prisma.importBatch.findMany).mockResolvedValue(mockBatches);

      const result = await deliveryService.getImportHistory('user-123', 20);

      expect(prisma.importBatch.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          platform: true,
          filename: true,
          importedCount: true,
          duplicateCount: true,
          errorCount: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(mockBatches);
      expect(result).toHaveLength(2);
    });

    it('should respect the limit parameter', async () => {
      vi.mocked(prisma.importBatch.findMany).mockResolvedValue([]);

      await deliveryService.getImportHistory('user-123', 5);

      expect(prisma.importBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should return empty array when no batches exist', async () => {
      vi.mocked(prisma.importBatch.findMany).mockResolvedValue([]);

      const result = await deliveryService.getImportHistory('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getImportBatchDetails', () => {
    it('should return batch with deliveries and summary', async () => {
      const mockBatch = {
        id: 'batch-1',
        userId: 'user-123',
        platform: 'DOORDASH' as Platform,
        filename: 'earnings.csv',
        importedCount: 3,
        duplicateCount: 0,
        errorCount: 0,
        createdAt: new Date('2026-01-02'),
      };

      // Mock Prisma Decimal objects - they convert to number via valueOf()
      const mockDecimal = (value: number) => ({
        valueOf: () => value,
        toString: () => value.toString(),
        toNumber: () => value,
      });

      const mockDeliveries = [
        {
          id: 'del-1',
          deliveredAt: new Date('2026-01-02T12:00:00Z'),
          earnings: mockDecimal(15.5),
          tip: mockDecimal(5.0),
          basePay: mockDecimal(10.5),
          restaurantName: 'Pizza Place',
        },
        {
          id: 'del-2',
          deliveredAt: new Date('2026-01-01T10:00:00Z'),
          earnings: mockDecimal(12.0),
          tip: mockDecimal(4.0),
          basePay: mockDecimal(8.0),
          restaurantName: null,
        },
      ];

      vi.mocked(prisma.importBatch.findFirst).mockResolvedValue(mockBatch);
      vi.mocked(prisma.delivery.findMany).mockResolvedValue(mockDeliveries as any);

      const result = await deliveryService.getImportBatchDetails('batch-1', 'user-123');

      expect(prisma.importBatch.findFirst).toHaveBeenCalledWith({
        where: { id: 'batch-1', userId: 'user-123' },
      });
      expect(result).not.toBeNull();
      expect(result?.batch.id).toBe('batch-1');
      expect(result?.deliveries).toHaveLength(2);
      expect(result?.summary.totalEarnings).toBeCloseTo(27.5);
      expect(result?.summary.dateRange).not.toBeNull();
    });

    it('should return null for non-existent batch', async () => {
      vi.mocked(prisma.importBatch.findFirst).mockResolvedValue(null);

      const result = await deliveryService.getImportBatchDetails('non-existent', 'user-123');

      expect(result).toBeNull();
    });

    it('should return null when batch belongs to different user', async () => {
      vi.mocked(prisma.importBatch.findFirst).mockResolvedValue(null);

      const result = await deliveryService.getImportBatchDetails('batch-1', 'different-user');

      expect(result).toBeNull();
    });
  });

  describe('deleteImportBatch', () => {
    it('should delete deliveries first, then batch (cascade)', async () => {
      const mockBatch = {
        id: 'batch-1',
        userId: 'user-123',
        platform: 'DOORDASH' as Platform,
        filename: 'earnings.csv',
        importedCount: 5,
        duplicateCount: 0,
        errorCount: 0,
        createdAt: new Date(),
      };

      vi.mocked(prisma.importBatch.findFirst).mockResolvedValue(mockBatch);
      vi.mocked(prisma.delivery.deleteMany).mockResolvedValue({ count: 5 });
      vi.mocked(prisma.importBatch.delete).mockResolvedValue(mockBatch);

      const result = await deliveryService.deleteImportBatch('batch-1', 'user-123');

      // Verify cascade order: deliveries deleted first
      expect(prisma.delivery.deleteMany).toHaveBeenCalledWith({
        where: { importBatchId: 'batch-1' },
      });
      // Then batch deleted
      expect(prisma.importBatch.delete).toHaveBeenCalledWith({
        where: { id: 'batch-1' },
      });
      expect(result).toEqual({ deletedDeliveries: 5 });
    });

    it('should return null for non-existent batch', async () => {
      vi.mocked(prisma.importBatch.findFirst).mockResolvedValue(null);

      const result = await deliveryService.deleteImportBatch('non-existent', 'user-123');

      expect(result).toBeNull();
      expect(prisma.delivery.deleteMany).not.toHaveBeenCalled();
      expect(prisma.importBatch.delete).not.toHaveBeenCalled();
    });

    it('should return null when batch belongs to different user', async () => {
      vi.mocked(prisma.importBatch.findFirst).mockResolvedValue(null);

      const result = await deliveryService.deleteImportBatch('batch-1', 'different-user');

      expect(result).toBeNull();
      expect(prisma.delivery.deleteMany).not.toHaveBeenCalled();
    });

    it('should handle batch with no deliveries', async () => {
      const mockBatch = {
        id: 'batch-empty',
        userId: 'user-123',
        platform: 'DOORDASH' as Platform,
        filename: 'empty.csv',
        importedCount: 0,
        duplicateCount: 0,
        errorCount: 0,
        createdAt: new Date(),
      };

      vi.mocked(prisma.importBatch.findFirst).mockResolvedValue(mockBatch);
      vi.mocked(prisma.delivery.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.importBatch.delete).mockResolvedValue(mockBatch);

      const result = await deliveryService.deleteImportBatch('batch-empty', 'user-123');

      expect(result).toEqual({ deletedDeliveries: 0 });
    });
  });
});
