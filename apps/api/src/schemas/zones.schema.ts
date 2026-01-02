import { z } from 'zod';

const parseAndValidateFloat = (val: string, min: number, max: number, fieldName: string) => {
  const num = parseFloat(val);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
};

// Common IANA timezones for validation (non-exhaustive, allows any string but validates format)
const validateTimezone = (tz: string): string => {
  // Basic format validation - should look like "America/Los_Angeles" or "UTC"
  if (!/^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$|^GMT$/.test(tz)) {
    // Allow it through anyway - date-fns-tz will fall back to UTC if invalid
    console.warn(`Potentially invalid timezone: ${tz}, will fall back to UTC if invalid`);
  }
  return tz;
};

export const GetZonesSchema = z.object({
  query: z.object({
    lat: z.string().transform((val) => parseAndValidateFloat(val, -90, 90, 'lat')),
    lng: z.string().transform((val) => parseAndValidateFloat(val, -180, 180, 'lng')),
    radius: z
      .string()
      .optional()
      .default('5')
      .transform((val) => {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0 || num > 50) {
          throw new Error('radius must be between 0 and 50 km');
        }
        return num;
      }),
    timezone: z
      .string()
      .optional()
      .default('UTC')
      .transform(validateTimezone),
  }),
});

export const GetZoneScoreSchema = z.object({
  query: z.object({
    timezone: z
      .string()
      .optional()
      .default('UTC')
      .transform(validateTimezone),
  }),
});

export type GetZonesQuery = z.infer<typeof GetZonesSchema>['query'];
export type GetZoneScoreQuery = z.infer<typeof GetZoneScoreSchema>['query'];
