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
