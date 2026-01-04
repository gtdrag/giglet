import { Router } from 'express';
import multer from 'multer';
import { earningsController } from '../controllers/earnings.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  GetEarningsSummarySchema,
  GetDeliveriesSchema,
  GetCompareSchema,
  GetHourlyRateSchema,
  ImportCSVSchema,
  GetImportHistorySchema,
  GetImportBatchSchema,
  DeleteImportBatchSchema,
  CreateDeliverySchema,
  UpdateDeliverySchema,
  DeleteDeliverySchema,
} from '../schemas/earnings.schema';

const router = Router();

// Configure multer for file uploads
// Store in memory as Buffer, 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    // Accept CSV files
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'text/comma-separated-values' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * Earnings Routes
 *
 * All routes require authentication
 *
 * GET    /api/v1/earnings/summary         - Get earnings summary for a period
 * GET    /api/v1/earnings/deliveries      - Get list of individual deliveries
 * POST   /api/v1/earnings/import          - Import earnings from CSV file
 * GET    /api/v1/earnings/imports         - Get import history
 * GET    /api/v1/earnings/imports/:batchId - Get import batch details
 * DELETE /api/v1/earnings/imports/:batchId - Delete import batch
 */

// All earnings routes require authentication
router.use(requireAuth);

// Get earnings summary
router.get(
  '/summary',
  validateRequest(GetEarningsSummarySchema),
  earningsController.getSummary.bind(earningsController)
);

// Get period comparison
router.get(
  '/compare',
  validateRequest(GetCompareSchema),
  earningsController.getComparison.bind(earningsController)
);

// Get hourly rate
router.get(
  '/hourly-rate',
  validateRequest(GetHourlyRateSchema),
  earningsController.getHourlyRate.bind(earningsController)
);

// Get individual deliveries
router.get(
  '/deliveries',
  validateRequest(GetDeliveriesSchema),
  earningsController.getDeliveries.bind(earningsController)
);

// Import earnings from CSV
router.post(
  '/import',
  upload.single('file'),
  validateRequest(ImportCSVSchema),
  earningsController.importCSV.bind(earningsController)
);

// Get import history
router.get(
  '/imports',
  validateRequest(GetImportHistorySchema),
  earningsController.getImportHistory.bind(earningsController)
);

// Get import batch details
router.get(
  '/imports/:batchId',
  validateRequest(GetImportBatchSchema),
  earningsController.getImportBatchDetails.bind(earningsController)
);

// Delete import batch
router.delete(
  '/imports/:batchId',
  validateRequest(DeleteImportBatchSchema),
  earningsController.deleteImportBatch.bind(earningsController)
);

// Create manual delivery
router.post(
  '/deliveries',
  validateRequest(CreateDeliverySchema),
  earningsController.createDelivery.bind(earningsController)
);

// Update delivery
router.put(
  '/deliveries/:deliveryId',
  validateRequest(UpdateDeliverySchema),
  earningsController.updateDelivery.bind(earningsController)
);

// Delete delivery
router.delete(
  '/deliveries/:deliveryId',
  validateRequest(DeleteDeliverySchema),
  earningsController.deleteDelivery.bind(earningsController)
);

export default router;
