/**
 * Delivery Service - Handle delivery CRUD and bulk import operations
 */

import { Platform, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import type { ParsedDelivery } from './csv-parser.service';

// Import batch creation input
export interface CreateImportBatchInput {
  userId: string;
  platform: Platform;
  filename: string;
}

// Import result
export interface ImportResult {
  importBatchId: string;
  imported: number;
  duplicatesSkipped: number;
  errorsSkipped: number;
  dateRange: {
    start: string;
    end: string;
  } | null;
  totalEarnings: number;
}

class DeliveryService {
  /**
   * Create an import batch record
   */
  async createImportBatch(input: CreateImportBatchInput) {
    const batch = await prisma.importBatch.create({
      data: {
        userId: input.userId,
        platform: input.platform,
        filename: input.filename,
        importedCount: 0,
        duplicateCount: 0,
        errorCount: 0,
      },
    });

    logger.info('Created import batch', {
      batchId: batch.id,
      userId: input.userId,
      platform: input.platform,
      filename: input.filename,
    });

    return batch;
  }

  /**
   * Import deliveries from parsed CSV data
   * Uses Prisma createMany with skipDuplicates for efficient bulk insert
   */
  async createManyFromImport(
    userId: string,
    importBatchId: string,
    deliveries: ParsedDelivery[],
    errorsSkipped: number
  ): Promise<ImportResult> {
    if (deliveries.length === 0) {
      // Update batch with error count only
      await prisma.importBatch.update({
        where: { id: importBatchId },
        data: {
          importedCount: 0,
          duplicateCount: 0,
          errorCount: errorsSkipped,
        },
      });

      return {
        importBatchId,
        imported: 0,
        duplicatesSkipped: 0,
        errorsSkipped,
        dateRange: null,
        totalEarnings: 0,
      };
    }

    // Prepare delivery data for Prisma
    const platform = deliveries[0].platform;
    const deliveryData: Prisma.DeliveryCreateManyInput[] = deliveries.map((d) => ({
      userId,
      externalId: d.externalId,
      platform: d.platform,
      deliveredAt: d.deliveredAt,
      basePay: new Prisma.Decimal(d.basePay),
      tip: new Prisma.Decimal(d.tip),
      earnings: new Prisma.Decimal(d.earnings),
      restaurantName: d.restaurantName,
      isManual: false,
      importBatchId,
    }));

    // Use createMany with skipDuplicates
    // This will skip any deliveries with duplicate (userId, externalId)
    const result = await prisma.delivery.createMany({
      data: deliveryData,
      skipDuplicates: true,
    });

    const imported = result.count;
    const duplicatesSkipped = deliveries.length - imported;

    // Calculate stats from successfully imported deliveries
    const dates = deliveries.map((d) => d.deliveredAt.getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const totalEarnings = deliveries.reduce((sum, d) => sum + d.earnings, 0);

    // Update the import batch with final counts
    await prisma.importBatch.update({
      where: { id: importBatchId },
      data: {
        importedCount: imported,
        duplicateCount: duplicatesSkipped,
        errorCount: errorsSkipped,
      },
    });

    logger.info('Completed import batch', {
      batchId: importBatchId,
      imported,
      duplicatesSkipped,
      errorsSkipped,
      platform,
    });

    return {
      importBatchId,
      imported,
      duplicatesSkipped,
      errorsSkipped,
      dateRange: {
        start: minDate.toISOString(),
        end: maxDate.toISOString(),
      },
      totalEarnings,
    };
  }

  /**
   * Get import batch by ID
   */
  async getImportBatch(batchId: string, userId: string) {
    return prisma.importBatch.findFirst({
      where: {
        id: batchId,
        userId,
      },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });
  }

  /**
   * Get user's import history
   */
  async getImportHistory(userId: string, limit = 20) {
    return prisma.importBatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
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
  }

  /**
   * Get import batch details with all deliveries and summary
   */
  async getImportBatchDetails(batchId: string, userId: string) {
    const batch = await prisma.importBatch.findFirst({
      where: {
        id: batchId,
        userId,
      },
    });

    if (!batch) {
      return null;
    }

    // Get all deliveries for this batch
    const deliveries = await prisma.delivery.findMany({
      where: { importBatchId: batchId },
      orderBy: { deliveredAt: 'desc' },
      select: {
        id: true,
        deliveredAt: true,
        earnings: true,
        tip: true,
        basePay: true,
        restaurantName: true,
      },
    });

    // Calculate summary
    let totalEarnings = 0;
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const delivery of deliveries) {
      totalEarnings += Number(delivery.earnings);
      if (!minDate || delivery.deliveredAt < minDate) {
        minDate = delivery.deliveredAt;
      }
      if (!maxDate || delivery.deliveredAt > maxDate) {
        maxDate = delivery.deliveredAt;
      }
    }

    return {
      batch: {
        id: batch.id,
        platform: batch.platform,
        filename: batch.filename,
        importedCount: batch.importedCount,
        duplicateCount: batch.duplicateCount,
        errorCount: batch.errorCount,
        createdAt: batch.createdAt,
      },
      deliveries: deliveries.map((d) => ({
        id: d.id,
        deliveredAt: d.deliveredAt.toISOString(),
        earnings: Number(d.earnings),
        tip: Number(d.tip),
        basePay: Number(d.basePay),
        restaurantName: d.restaurantName,
      })),
      summary: {
        totalEarnings,
        dateRange:
          minDate && maxDate
            ? { start: minDate.toISOString(), end: maxDate.toISOString() }
            : null,
      },
    };
  }

  /**
   * Delete an import batch and all associated deliveries
   * Uses manual cascade since Prisma doesn't auto-cascade on importBatchId
   */
  async deleteImportBatch(batchId: string, userId: string) {
    // Verify batch belongs to user
    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, userId },
    });

    if (!batch) {
      return null;
    }

    // Delete deliveries first, then batch (manual cascade)
    const deletedDeliveries = await prisma.delivery.deleteMany({
      where: { importBatchId: batchId },
    });

    await prisma.importBatch.delete({
      where: { id: batchId },
    });

    logger.info('Deleted import batch', {
      batchId,
      userId,
      deletedDeliveries: deletedDeliveries.count,
    });

    return {
      deletedDeliveries: deletedDeliveries.count,
    };
  }
}

export const deliveryService = new DeliveryService();
