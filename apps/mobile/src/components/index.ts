/**
 * Components barrel export
 * Centralized exports for all reusable components
 */

// Date selection
export { DateRangeSelector } from './DateRangeSelector';

// Earnings & Stats
export { HourlyRateCard } from './HourlyRateCard';
export { PeriodComparisonCard } from './PeriodComparisonCard';
export { PlatformBreakdownChart } from './PlatformBreakdownChart';
export { YTDSummaryCard } from './YTDSummaryCard';

// Mileage
export {
  MileageStatsCard,
  MileageStatsCardCompact,
} from './MileageStatsCard';
export type { PeriodType } from './MileageStatsCard';
export { ManualTripModal } from './ManualTripModal';
export type { ManualTripData } from './ManualTripModal';
export { TripDetailModal } from './TripDetailModal';
export {
  TripListItem,
  formatTripDate,
  formatTripTime,
  formatTimeRange,
} from './TripListItem';

// Import
export {
  ImportTutorial,
  hasTutorialBeenSeen,
  markTutorialAsSeen,
  resetTutorialPreference,
  openPlatformEarnings,
} from './ImportTutorial';
export { ManualDeliveryModal } from './ManualDeliveryModal';

// Modals
export { IRSRateInfoModal } from './IRSRateInfoModal';
export { ZoneDetailModal } from './ZoneDetailModal';

// Zone recommendations
export { RecommendationBanner } from './RecommendationBanner';

// Tip components (re-export from subdirectory)
export * from './tips';
