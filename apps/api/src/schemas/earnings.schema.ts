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
