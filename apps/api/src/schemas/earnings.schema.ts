import { z } from 'zod';

export const EarningsPeriodSchema = z.enum(['today', 'week', 'month', 'year']);

/**
 * Validate timezone string by attempting to use it with Intl.DateTimeFormat
 */
const TimezoneSchema = z
  .string()
  .optional()
  .default('UTC')
  .refine(
    (tz) => {
      try {
        Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid timezone. Use IANA timezone format (e.g., "America/New_York")' }
  );

export const GetEarningsSummarySchema = z.object({
  query: z.object({
    period: EarningsPeriodSchema.optional().default('today'),
    timezone: TimezoneSchema,
  }),
});

export const GetDeliveriesSchema = z.object({
  query: z.object({
    period: EarningsPeriodSchema.optional().default('today'),
    timezone: TimezoneSchema,
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }),
});

export type GetEarningsSummaryInput = z.infer<typeof GetEarningsSummarySchema>;
export type GetDeliveriesInput = z.infer<typeof GetDeliveriesSchema>;

// Platform enum for import
export const PlatformSchema = z.enum(['DOORDASH', 'UBEREATS']);

// Import CSV schema - validates the body after multer processing
export const ImportCSVSchema = z.object({
  body: z.object({
    platform: PlatformSchema,
  }),
});

export type ImportCSVInput = z.infer<typeof ImportCSVSchema>;

// Import History schemas
export const GetImportHistorySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const GetImportBatchSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, 'Batch ID is required'),
  }),
});

export const DeleteImportBatchSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, 'Batch ID is required'),
  }),
});

export type GetImportHistoryInput = z.infer<typeof GetImportHistorySchema>;
export type GetImportBatchInput = z.infer<typeof GetImportBatchSchema>;
export type DeleteImportBatchInput = z.infer<typeof DeleteImportBatchSchema>;

// Manual Delivery CRUD schemas
export const CreateDeliverySchema = z.object({
  body: z.object({
    platform: PlatformSchema,
    deliveredAt: z.string().datetime({ message: 'Invalid datetime format. Use ISO 8601 format.' }).refine(
      (date) => new Date(date) <= new Date(),
      { message: 'Delivery date cannot be in the future' }
    ),
    basePay: z.number().min(0, 'Base pay must be positive').max(1000, 'Base pay cannot exceed 1000'),
    tip: z.number().min(0, 'Tip must be positive').max(500, 'Tip cannot exceed 500'),
    restaurantName: z.string().max(100, 'Restaurant name cannot exceed 100 characters').optional(),
  }),
});

export const UpdateDeliverySchema = z.object({
  params: z.object({
    deliveryId: z.string().min(1, 'Delivery ID is required'),
  }),
  body: z.object({
    platform: PlatformSchema.optional(),
    deliveredAt: z.string().datetime({ message: 'Invalid datetime format. Use ISO 8601 format.' }).refine(
      (date) => new Date(date) <= new Date(),
      { message: 'Delivery date cannot be in the future' }
    ).optional(),
    basePay: z.number().min(0, 'Base pay must be positive').max(1000, 'Base pay cannot exceed 1000').optional(),
    tip: z.number().min(0, 'Tip must be positive').max(500, 'Tip cannot exceed 500').optional(),
    restaurantName: z.string().max(100, 'Restaurant name cannot exceed 100 characters').nullable().optional(),
  }),
});

export const DeleteDeliverySchema = z.object({
  params: z.object({
    deliveryId: z.string().min(1, 'Delivery ID is required'),
  }),
});

export type CreateDeliveryInput = z.infer<typeof CreateDeliverySchema>;
export type UpdateDeliveryInput = z.infer<typeof UpdateDeliverySchema>;
export type DeleteDeliveryInput = z.infer<typeof DeleteDeliverySchema>;
