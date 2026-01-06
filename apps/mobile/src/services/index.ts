/**
 * Services barrel export
 * Centralized exports for all service modules
 *
 * Note: Some modules have overlapping type names (e.g., Platform).
 * Import directly from specific modules when you need those specific types.
 */

// Core API
export { default as api, storeTokens, clearTokens, hasStoredTokens, TOKEN_KEYS } from './api';

// Auth - full exports
export * from './auth';

// Tips - full exports
export * from './tips';

// Earnings - specific exports to avoid Platform conflict
export {
  type EarningsPeriod,
  type PlatformBreakdown as EarningsPlatformBreakdown,
  type EarningsSummary,
  type Delivery,
  type DeliveriesResponse,
  type HourlyRateData,
  type PeriodComparison,
  type ImportResult as EarningsImportResult,
  type ImportBatch,
  type ImportBatchDetails,
  type CreateDeliveryInput,
  type UpdateDeliveryInput,
  EarningsError,
  getEarningsSummary,
  getDeliveries,
  getComparison,
  getHourlyRate,
  importCSV,
  getImportHistory,
  getImportBatchDetails,
  deleteImportBatch,
  createDelivery,
  updateDelivery,
  deleteDelivery,
} from './earnings';

// User - full exports
export * from './user';

// Settings - full exports
export * from './settings';

// Subscriptions - full exports
export * from './subscriptions';

// Location tracking - full exports
export * from './locationTracking';

// Platforms - full exports (primary source for Platform type)
export * from './platforms';

// CSV parsing - specific exports to avoid Platform conflict
export {
  type ImportPreview,
  type ParsedDelivery,
  CSVParseError,
  parseCSV,
  detectPlatform,
} from './csvParser';

// Zones - full exports
export * from './zones';

// Share - full exports
export * from './share';

// Export functionality (main module)
export * from './export';

// Export sub-modules - specific exports to avoid PlatformBreakdown conflict
export {
  // CSV generators
  generateMileageCSV,
  convertTripsToExportRows,
  generateCSVFilename,
  type MileageExportRow,
  // PDF generators
  generateMileagePDF,
  generatePDFFilename,
  // Earnings CSV
  convertDeliveriesToExportRows,
  aggregateByPlatform,
  aggregateByMonth,
  calculateExportSummary,
  generateEarningsCSV,
  generateEarningsCSVFilename,
  type EarningsExportRow,
  type MonthlyBreakdown,
  type EarningsExportSummary,
  // Earnings PDF
  generateEarningsPDF,
  generateEarningsPDFFilename,
} from './export/index';
