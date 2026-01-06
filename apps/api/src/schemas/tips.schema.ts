import { z } from 'zod';

export const TipSizeSchema = z.enum(['NONE', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'XXLARGE']);

export const CreateTipLogSchema = z.object({
  body: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    tipSize: TipSizeSchema,
  }),
});

/**
 * TipSize hierarchy order for filtering
 * When filtering by tipSize, return that size AND ABOVE
 */
export const TIP_SIZE_ORDER: Record<z.infer<typeof TipSizeSchema>, number> = {
  NONE: 0,
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
  XLARGE: 4,
  XXLARGE: 5,
};

/**
 * Get tip sizes at or above the specified minimum
 */
export function getTipSizesAbove(minSize: z.infer<typeof TipSizeSchema>): z.infer<typeof TipSizeSchema>[] {
  const minOrder = TIP_SIZE_ORDER[minSize];
  return Object.entries(TIP_SIZE_ORDER)
    .filter(([, order]) => order >= minOrder)
    .map(([size]) => size as z.infer<typeof TipSizeSchema>);
}

export const GetTipsQuerySchema = z.object({
  query: z.object({
    // Filter by minimum tip size (returns this size and above)
    tipSize: TipSizeSchema.optional(),
    // Date range filter
    startDate: z.string().datetime({ message: 'Invalid date format. Use ISO 8601 format.' }).optional(),
    endDate: z.string().datetime({ message: 'Invalid date format. Use ISO 8601 format.' }).optional(),
    // Viewport bounds filter
    minLat: z.coerce.number().min(-90).max(90).optional(),
    maxLat: z.coerce.number().min(-90).max(90).optional(),
    minLng: z.coerce.number().min(-180).max(180).optional(),
    maxLng: z.coerce.number().min(-180).max(180).optional(),
    // Pagination
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }).refine(
    (data) => {
      // Validate that if viewport bounds are provided, all four are present
      const hasBounds = data.minLat !== undefined || data.maxLat !== undefined ||
                        data.minLng !== undefined || data.maxLng !== undefined;
      if (hasBounds) {
        return data.minLat !== undefined && data.maxLat !== undefined &&
               data.minLng !== undefined && data.maxLng !== undefined;
      }
      return true;
    },
    { message: 'All viewport bounds (minLat, maxLat, minLng, maxLng) must be provided together' }
  ).refine(
    (data) => {
      // Validate minLat < maxLat and minLng < maxLng
      if (data.minLat !== undefined && data.maxLat !== undefined) {
        if (data.minLat >= data.maxLat) return false;
      }
      if (data.minLng !== undefined && data.maxLng !== undefined) {
        if (data.minLng >= data.maxLng) return false;
      }
      return true;
    },
    { message: 'minLat must be less than maxLat, and minLng must be less than maxLng' }
  ).refine(
    (data) => {
      // Validate startDate < endDate
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: 'startDate must be before or equal to endDate' }
  ),
});

export type CreateTipLogInput = z.infer<typeof CreateTipLogSchema>;
export type GetTipsQueryInput = z.infer<typeof GetTipsQuerySchema>;
export type TipSize = z.infer<typeof TipSizeSchema>;
