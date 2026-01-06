import { Request, Response, NextFunction } from 'express';
import { Platform } from '@prisma/client';
import { earningsService } from '../services/earnings.service';
import { csvParserService } from '../services/csv-parser.service';
import { deliveryService } from '../services/delivery.service';
import { successResponse } from '../types/api.types';
import { errors, AppError } from '../middleware/error.middleware';
import type {
  GetEarningsSummaryInput,
  GetDeliveriesInput,
  GetCompareInput,
  GetHourlyRateInput,
  ImportCSVInput,
  GetImportHistoryInput,
  GetImportBatchInput,
  DeleteImportBatchInput,
  CreateDeliveryInput,
  UpdateDeliveryInput,
  DeleteDeliveryInput,
} from '../schemas/earnings.schema';

class EarningsController {
  /**
   * GET /api/v1/earnings/summary
   * Get earnings summary for a period
   *
   * Query params are validated by middleware before reaching this handler
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      // Query params are validated and typed by middleware
      const { period, timezone } = req.query as unknown as GetEarningsSummaryInput['query'];

      const summary = await earningsService.getEarningsSummary(userId, period, timezone);

      res.json(successResponse(summary));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/earnings/deliveries
   * Get list of individual deliveries
   *
   * Query params are validated by middleware before reaching this handler
   */
  async getDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      // Query params are validated and typed by middleware
      const { period, timezone, limit, offset, platform } = req.query as unknown as GetDeliveriesInput['query'];

      const result = await earningsService.getDeliveries(
        userId,
        period,
        timezone,
        Number(limit) || 50,
        Number(offset) || 0,
        platform as Platform | undefined
      );

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/earnings/compare
   * Get period comparison (current vs previous)
   */
  async getComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const { period, timezone } = req.query as unknown as GetCompareInput['query'];

      const result = await earningsService.getComparison(userId, period, timezone);

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/earnings/hourly-rate
   * Get hourly rate calculated from earnings and trip hours
   */
  async getHourlyRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const { period, timezone } = req.query as unknown as GetHourlyRateInput['query'];

      const result = await earningsService.getHourlyRate(userId, period, timezone);

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/earnings/import
   * Import earnings from CSV file
   *
   * Expects multipart/form-data with:
   * - file: CSV file (max 10MB)
   * - platform: 'DOORDASH' | 'UBEREATS'
   */
  async importCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      // File is attached by multer middleware
      const file = req.file;
      if (!file) {
        throw new AppError('VALIDATION_ERROR', 'No file uploaded', 400);
      }

      // Platform is validated by Zod schema
      const { platform } = req.body as ImportCSVInput['body'];
      if (!platform) {
        throw new AppError('VALIDATION_ERROR', 'Platform is required', 400);
      }

      // Validate platform is a valid enum value
      if (platform !== 'DOORDASH' && platform !== 'UBEREATS') {
        throw new AppError('VALIDATION_ERROR', 'Platform must be DOORDASH or UBEREATS', 400);
      }

      // Parse the CSV file
      let parseResult;
      try {
        parseResult = await csvParserService.parseCSV(file.buffer, platform as Platform);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to parse CSV file';
        throw new AppError('PARSE_ERROR', message, 400);
      }

      // Create import batch
      const batch = await deliveryService.createImportBatch({
        userId,
        platform: platform as Platform,
        filename: file.originalname,
      });

      // Import deliveries
      const result = await deliveryService.createManyFromImport(
        userId,
        batch.id,
        parseResult.deliveries,
        parseResult.skippedRows.length
      );

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/earnings/imports
   * Get user's import history
   */
  async getImportHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const { limit } = req.query as unknown as GetImportHistoryInput['query'];

      const imports = await deliveryService.getImportHistory(userId, limit);

      res.json(successResponse({ imports }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/earnings/imports/:batchId
   * Get import batch details with all deliveries
   */
  async getImportBatchDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const { batchId } = req.params as unknown as GetImportBatchInput['params'];

      const result = await deliveryService.getImportBatchDetails(batchId, userId);

      if (!result) {
        throw errors.notFound('Import batch not found');
      }

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/earnings/imports/:batchId
   * Delete import batch and all associated deliveries
   */
  async deleteImportBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const { batchId } = req.params as unknown as DeleteImportBatchInput['params'];

      const result = await deliveryService.deleteImportBatch(batchId, userId);

      if (!result) {
        throw errors.notFound('Import batch not found');
      }

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/earnings/deliveries
   * Create a manual delivery entry
   */
  async createDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const { platform, deliveredAt, basePay, tip, restaurantName } =
        req.body as CreateDeliveryInput['body'];

      const delivery = await deliveryService.createManualDelivery(userId, {
        platform: platform as Platform,
        deliveredAt: new Date(deliveredAt),
        basePay,
        tip,
        restaurantName,
      });

      res.status(201).json(successResponse(delivery));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/earnings/deliveries/:deliveryId
   * Update an existing delivery
   */
  async updateDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const { deliveryId } = req.params as unknown as UpdateDeliveryInput['params'];
      const { platform, deliveredAt, basePay, tip, restaurantName } =
        req.body as UpdateDeliveryInput['body'];

      const delivery = await deliveryService.updateDelivery(deliveryId, userId, {
        platform: platform as Platform | undefined,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined,
        basePay,
        tip,
        restaurantName,
      });

      if (!delivery) {
        throw errors.notFound('Delivery not found');
      }

      res.json(successResponse(delivery));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/earnings/deliveries/:deliveryId
   * Delete a delivery
   */
  async deleteDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw errors.unauthorized('User not authenticated');
      }

      const { deliveryId } = req.params as unknown as DeleteDeliveryInput['params'];

      const result = await deliveryService.deleteDelivery(deliveryId, userId);

      if (!result) {
        throw errors.notFound('Delivery not found');
      }

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
}

export const earningsController = new EarningsController();
