import { z } from 'zod';

/**
 * Schema for updating user notification preferences
 * PUT /api/v1/users/preferences
 */
export const UpdatePreferencesSchema = z.object({
  body: z.object({
    notificationsEnabled: z.boolean().optional(),
    zoneAlertsEnabled: z.boolean().optional(),
    syncErrorAlertsEnabled: z.boolean().optional(),
  }),
});

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>['body'];

/**
 * User preferences response type
 */
export interface UserPreferencesResponse {
  notificationsEnabled: boolean;
  zoneAlertsEnabled: boolean;
  syncErrorAlertsEnabled: boolean;
}
