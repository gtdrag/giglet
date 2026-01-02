import { z } from 'zod';

export const EarningsPeriodSchema = z.enum(['today', 'week', 'month', 'year']);

export const GetEarningsSummarySchema = z.object({
  query: z.object({
    period: EarningsPeriodSchema.optional().default('today'),
    timezone: z.string().optional().default('UTC'),
  }),
});

export const GetDeliveriesSchema = z.object({
  query: z.object({
    period: EarningsPeriodSchema.optional().default('today'),
    timezone: z.string().optional().default('UTC'),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  }),
});

export type GetEarningsSummaryInput = z.infer<typeof GetEarningsSummarySchema>;
export type GetDeliveriesInput = z.infer<typeof GetDeliveriesSchema>;
