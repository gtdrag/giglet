/**
 * Stores barrel export
 * Centralized exports for all Zustand stores
 */

// Auth store
export { useAuthStore } from './authStore';
export type { User } from './authStore';

// Earnings store
export { useEarningsStore } from './earningsStore';

// Local settings store (device-specific preferences)
export {
  useLocalSettingsStore,
  getTipFilterLabel,
} from './localSettingsStore';
export type { TipFilterValue } from './localSettingsStore';

// Mileage store
export { useMileageStore } from './mileageStore';
export type {
  PermissionStatus,
  PeriodType,
  TripState,
  ActiveTrip,
  CompletedTrip,
  TripStats,
} from './mileageStore';

// Platform store
export { usePlatformStore } from './platformStore';

// Settings store (user account preferences)
export { useSettingsStore } from './settingsStore';

// Subscription store
export {
  useSubscriptionStore,
  PRO_FEATURES,
} from './subscriptionStore';
export type { SubscriptionTier, ProFeature } from './subscriptionStore';

// Tab navigation store
export { useTabNavigationStore } from './tabNavigationStore';
export type { TabPage } from './tabNavigationStore';
