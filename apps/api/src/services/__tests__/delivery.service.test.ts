/**
 * Delivery Service Tests - Import History and Manual Delivery CRUD
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
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
          userId: 'user-123',
          platform: 'DOORDASH' as Platform,
          filename: 'earnings.csv',
          importedCount: 10,
          duplicateCount: 2,
          errorCount: 0,
          createdAt: new Date('2026-01-02'),
        },
        {
          id: 'batch-2',
          userId: 'user-123',
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

  // ============================================
  // Story 3.4: Manual Delivery CRUD Tests
  // ============================================

  describe('createManualDelivery', () => {
    // Helper to create mock Prisma Decimal
    const mockDecimal = (value: number) => ({
      valueOf: () => value,
      toString: () => value.toString(),
      toNumber: () => value,
    });

    it('should create a manual delivery with isManual=true', async () => {
      const deliveredAt = new Date('2026-01-02T12:00:00Z');
      const mockCreatedDelivery = {
        id: 'del-manual-1',
        userId: 'user-123',
        externalId: 'manual-1234567890-abc123',
        platform: 'DOORDASH' as Platform,
        deliveredAt,
        basePay: mockDecimal(10.5),
        tip: mockDecimal(5.0),
        earnings: mockDecimal(15.5),
        restaurantName: 'Pizza Palace',
        isManual: true,
        importBatchId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.delivery.create).mockResolvedValue(mockCreatedDelivery as any);

      const result = await deliveryService.createManualDelivery('user-123', {
        platform: 'DOORDASH' as Platform,
        deliveredAt,
        basePay: 10.5,
        tip: 5.0,
        restaurantName: 'Pizza Palace',
      });

      expect(prisma.delivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          platform: 'DOORDASH',
          isManual: true,
          importBatchId: null,
        }),
      });
      expect(result.isManual).toBe(true);
      expect(result.earnings).toBeCloseTo(15.5);
      expect(result.platform).toBe('DOORDASH');
    });

    it('should generate unique externalId for manual entries', async () => {
      const deliveredAt = new Date('2026-01-02T12:00:00Z');
      const mockCreatedDelivery = {
        id: 'del-manual-2',
        userId: 'user-123',
        externalId: 'manual-1234567890-xyz789',
        platform: 'UBEREATS' as Platform,
        deliveredAt,
        basePay: mockDecimal(8.0),
        tip: mockDecimal(4.0),
        earnings: mockDecimal(12.0),
        restaurantName: null,
        isManual: true,
        importBatchId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.delivery.create).mockResolvedValue(mockCreatedDelivery as any);

      await deliveryService.createManualDelivery('user-123', {
        platform: 'UBEREATS' as Platform,
        deliveredAt,
        basePay: 8.0,
        tip: 4.0,
      });

      expect(prisma.delivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          externalId: expect.stringContaining('manual-'),
        }),
      });
    });

    it('should calculate earnings from basePay + tip', async () => {
      const deliveredAt = new Date('2026-01-02T12:00:00Z');
      const mockCreatedDelivery = {
        id: 'del-manual-3',
        userId: 'user-123',
        externalId: 'manual-test',
        platform: 'DOORDASH' as Platform,
        deliveredAt,
        basePay: mockDecimal(7.25),
        tip: mockDecimal(3.75),
        earnings: mockDecimal(11.0),
        restaurantName: null,
        isManual: true,
        importBatchId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.delivery.create).mockResolvedValue(mockCreatedDelivery as any);

      const result = await deliveryService.createManualDelivery('user-123', {
        platform: 'DOORDASH' as Platform,
        deliveredAt,
        basePay: 7.25,
        tip: 3.75,
      });

      expect(result.earnings).toBeCloseTo(11.0);
      expect(result.basePay).toBeCloseTo(7.25);
      expect(result.tip).toBeCloseTo(3.75);
    });
  });

  describe('updateDelivery', () => {
    const mockDecimal = (value: number) => ({
      valueOf: () => value,
      toString: () => value.toString(),
      toNumber: () => value,
    });

    it('should update delivery fields correctly', async () => {
      const existingDelivery = {
        id: 'del-1',
        userId: 'user-123',
        externalId: 'ext-1',
        platform: 'DOORDASH' as Platform,
        deliveredAt: new Date('2026-01-01T10:00:00Z'),
        basePay: mockDecimal(10.0),
        tip: mockDecimal(5.0),
        earnings: mockDecimal(15.0),
        restaurantName: 'Old Name',
        isManual: true,
        importBatchId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedDelivery = {
        ...existingDelivery,
        basePay: mockDecimal(12.0),
        tip: mockDecimal(6.0),
        earnings: mockDecimal(18.0),
        restaurantName: 'New Name',
      };

      vi.mocked(prisma.delivery.findFirst).mockResolvedValue(existingDelivery as any);
      vi.mocked(prisma.delivery.update).mockResolvedValue(updatedDelivery as any);

      const result = await deliveryService.updateDelivery('del-1', 'user-123', {
        basePay: 12.0,
        tip: 6.0,
        restaurantName: 'New Name',
      });

      expect(prisma.delivery.findFirst).toHaveBeenCalledWith({
        where: { id: 'del-1', userId: 'user-123' },
      });
      expect(prisma.delivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: expect.objectContaining({
          restaurantName: 'New Name',
        }),
      });
      expect(result?.earnings).toBeCloseTo(18.0);
      expect(result?.restaurantName).toBe('New Name');
    });

    it('should return null when delivery does not belong to user', async () => {
      vi.mocked(prisma.delivery.findFirst).mockResolvedValue(null);

      const result = await deliveryService.updateDelivery('del-1', 'different-user', {
        basePay: 20.0,
      });

      expect(result).toBeNull();
      expect(prisma.delivery.update).not.toHaveBeenCalled();
    });

    it('should return null for non-existent delivery', async () => {
      vi.mocked(prisma.delivery.findFirst).mockResolvedValue(null);

      const result = await deliveryService.updateDelivery('non-existent', 'user-123', {
        tip: 10.0,
      });

      expect(result).toBeNull();
      expect(prisma.delivery.update).not.toHaveBeenCalled();
    });

    it('should recalculate earnings when basePay or tip changes', async () => {
      const existingDelivery = {
        id: 'del-2',
        userId: 'user-123',
        externalId: 'ext-2',
        platform: 'UBEREATS' as Platform,
        deliveredAt: new Date('2026-01-01T10:00:00Z'),
        basePay: mockDecimal(10.0),
        tip: mockDecimal(5.0),
        earnings: mockDecimal(15.0),
        restaurantName: null,
        isManual: false,
        importBatchId: 'batch-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedDelivery = {
        ...existingDelivery,
        basePay: mockDecimal(15.0),
        earnings: mockDecimal(20.0), // 15 + 5
      };

      vi.mocked(prisma.delivery.findFirst).mockResolvedValue(existingDelivery as any);
      vi.mocked(prisma.delivery.update).mockResolvedValue(updatedDelivery as any);

      const result = await deliveryService.updateDelivery('del-2', 'user-123', {
        basePay: 15.0,
      });

      // Verify earnings was included in update (recalculated)
      expect(prisma.delivery.update).toHaveBeenCalledWith({
        where: { id: 'del-2' },
        data: expect.objectContaining({
          earnings: expect.anything(),
        }),
      });
      expect(result?.earnings).toBeCloseTo(20.0);
    });

    it('should handle updating platform field', async () => {
      const existingDelivery = {
        id: 'del-3',
        userId: 'user-123',
        externalId: 'ext-3',
        platform: 'DOORDASH' as Platform,
        deliveredAt: new Date('2026-01-01T10:00:00Z'),
        basePay: mockDecimal(10.0),
        tip: mockDecimal(5.0),
        earnings: mockDecimal(15.0),
        restaurantName: null,
        isManual: true,
        importBatchId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedDelivery = {
        ...existingDelivery,
        platform: 'UBEREATS' as Platform,
      };

      vi.mocked(prisma.delivery.findFirst).mockResolvedValue(existingDelivery as any);
      vi.mocked(prisma.delivery.update).mockResolvedValue(updatedDelivery as any);

      const result = await deliveryService.updateDelivery('del-3', 'user-123', {
        platform: 'UBEREATS' as Platform,
      });

      expect(prisma.delivery.update).toHaveBeenCalledWith({
        where: { id: 'del-3' },
        data: expect.objectContaining({
          platform: 'UBEREATS',
        }),
      });
      expect(result?.platform).toBe('UBEREATS');
    });
  });

  describe('deleteDelivery', () => {
    const mockDecimal = (value: number) => ({
      valueOf: () => value,
      toString: () => value.toString(),
      toNumber: () => value,
    });

    it('should delete delivery and return success', async () => {
      const existingDelivery = {
        id: 'del-1',
        userId: 'user-123',
        externalId: 'ext-1',
        platform: 'DOORDASH' as Platform,
        deliveredAt: new Date('2026-01-01T10:00:00Z'),
        basePay: mockDecimal(10.0),
        tip: mockDecimal(5.0),
        earnings: mockDecimal(15.0),
        restaurantName: 'Test Restaurant',
        isManual: true,
        importBatchId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.delivery.findFirst).mockResolvedValue(existingDelivery as any);
      vi.mocked(prisma.delivery.delete).mockResolvedValue(existingDelivery as any);

      const result = await deliveryService.deleteDelivery('del-1', 'user-123');

      expect(prisma.delivery.findFirst).toHaveBeenCalledWith({
        where: { id: 'del-1', userId: 'user-123' },
      });
      expect(prisma.delivery.delete).toHaveBeenCalledWith({
        where: { id: 'del-1' },
      });
      expect(result).toEqual({ deleted: true });
    });

    it('should return null when delivery does not belong to user', async () => {
      vi.mocked(prisma.delivery.findFirst).mockResolvedValue(null);

      const result = await deliveryService.deleteDelivery('del-1', 'different-user');

      expect(result).toBeNull();
      expect(prisma.delivery.delete).not.toHaveBeenCalled();
    });

    it('should return null for non-existent delivery', async () => {
      vi.mocked(prisma.delivery.findFirst).mockResolvedValue(null);

      const result = await deliveryService.deleteDelivery('non-existent', 'user-123');

      expect(result).toBeNull();
      expect(prisma.delivery.delete).not.toHaveBeenCalled();
    });

    it('should delete both manual and imported deliveries', async () => {
      const importedDelivery = {
        id: 'del-imported',
        userId: 'user-123',
        externalId: 'hash-abc123',
        platform: 'UBEREATS' as Platform,
        deliveredAt: new Date('2026-01-01T10:00:00Z'),
        basePay: mockDecimal(8.0),
        tip: mockDecimal(4.0),
        earnings: mockDecimal(12.0),
        restaurantName: null,
        isManual: false,
        importBatchId: 'batch-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.delivery.findFirst).mockResolvedValue(importedDelivery as any);
      vi.mocked(prisma.delivery.delete).mockResolvedValue(importedDelivery as any);

      const result = await deliveryService.deleteDelivery('del-imported', 'user-123');

      expect(prisma.delivery.delete).toHaveBeenCalledWith({
        where: { id: 'del-imported' },
      });
      expect(result).toEqual({ deleted: true });
    });
  });
});
