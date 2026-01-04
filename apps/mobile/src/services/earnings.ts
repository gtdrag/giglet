import api from './api';

export type EarningsPeriod = 'today' | 'week' | 'month' | 'year';

export interface PlatformBreakdown {
  platform: 'DOORDASH' | 'UBEREATS';
  total: number;
  tipTotal: number;
  basePayTotal: number;
  deliveryCount: number;
}

export interface EarningsSummary {
  period: EarningsPeriod;
  dateRange: {
    start: string;
    end: string;
  };
  total: number;
  tipTotal: number;
  basePayTotal: number;
  deliveryCount: number;
  platformBreakdown: PlatformBreakdown[];
}

export interface Delivery {
  id: string;
  platform: 'DOORDASH' | 'UBEREATS';
  earnings: number;
  tip: number;
  basePay: number;
  restaurantName: string | null;
  deliveredAt: string;
  isManual?: boolean;
}

export interface DeliveriesResponse {
  deliveries: Delivery[];
  total: number;
  limit: number;
  offset: number;
}

export class EarningsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EarningsError';
  }
}

/**
 * Get earnings summary for a period
 */
export async function getEarningsSummary(
  period: EarningsPeriod = 'today',
  timezone?: string
): Promise<EarningsSummary> {
  try {
    const params = new URLSearchParams();
    params.append('period', period);
    if (timezone) {
      params.append('timezone', timezone);
    }

    const response = await api.get(`/earnings/summary?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to fetch earnings';
    throw new EarningsError(message);
  }
}

/**
 * Get list of individual deliveries
 */
export async function getDeliveries(
  period: EarningsPeriod = 'today',
  timezone?: string,
  limit: number = 50,
  offset: number = 0
): Promise<DeliveriesResponse> {
  try {
    const params = new URLSearchParams();
    params.append('period', period);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (timezone) {
      params.append('timezone', timezone);
    }

    const response = await api.get(`/earnings/deliveries?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to fetch deliveries';
    throw new EarningsError(message);
  }
}

// Import result from CSV upload
export interface ImportResult {
  importBatchId: string;
  imported: number;
  duplicatesSkipped: number;
  errorsSkipped: number;
  dateRange: {
    start: string;
    end: string;
  } | null;
  totalEarnings: number;
}

export type Platform = 'DOORDASH' | 'UBEREATS';

// Import batch for history display
export interface ImportBatch {
  id: string;
  platform: Platform;
  filename: string;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  createdAt: string;
}

// Import batch details with deliveries
export interface ImportBatchDetails {
  batch: ImportBatch;
  deliveries: {
    id: string;
    deliveredAt: string;
    earnings: number;
    tip: number;
    basePay: number;
    restaurantName: string | null;
  }[];
  summary: {
    totalEarnings: number;
    dateRange: { start: string; end: string } | null;
  };
}

/**
 * Import earnings from CSV file
 *
 * @param fileUri - Local file URI from document picker
 * @param fileName - Original file name
 * @param platform - Platform type (DOORDASH or UBEREATS)
 */
export async function importCSV(
  fileUri: string,
  fileName: string,
  platform: Platform
): Promise<ImportResult> {
  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Append file - React Native requires specific format
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'text/csv',
    } as unknown as Blob);

    // Append platform
    formData.append('platform', platform);

    // Send to API with multipart/form-data content type
    const response = await api.post('/earnings/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 second timeout for large files
    });

    return response.data.data;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to import earnings';
    throw new EarningsError(message);
  }
}

/**
 * Get import history
 */
export async function getImportHistory(limit: number = 20): Promise<ImportBatch[]> {
  try {
    const response = await api.get(`/earnings/imports?limit=${limit}`);
    return response.data.data.imports;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to fetch import history';
    throw new EarningsError(message);
  }
}

/**
 * Get import batch details with all deliveries
 */
export async function getImportBatchDetails(batchId: string): Promise<ImportBatchDetails> {
  try {
    const response = await api.get(`/earnings/imports/${batchId}`);
    return response.data.data;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to fetch import details';
    throw new EarningsError(message);
  }
}

/**
 * Delete an import batch and all associated deliveries
 */
export async function deleteImportBatch(batchId: string): Promise<{ deletedDeliveries: number }> {
  try {
    const response = await api.delete(`/earnings/imports/${batchId}`);
    return response.data.data;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to delete import batch';
    throw new EarningsError(message);
  }
}

// Manual delivery input
export interface CreateDeliveryInput {
  platform: Platform;
  deliveredAt: string; // ISO date string
  basePay: number;
  tip: number;
  restaurantName?: string;
}

export interface UpdateDeliveryInput {
  platform?: Platform;
  deliveredAt?: string;
  basePay?: number;
  tip?: number;
  restaurantName?: string | null;
}

/**
 * Create a manual delivery entry
 */
export async function createDelivery(input: CreateDeliveryInput): Promise<Delivery> {
  try {
    const response = await api.post('/earnings/deliveries', input);
    return response.data.data;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to create delivery';
    throw new EarningsError(message);
  }
}

/**
 * Update an existing delivery
 */
export async function updateDelivery(
  deliveryId: string,
  input: UpdateDeliveryInput
): Promise<Delivery> {
  try {
    const response = await api.put(`/earnings/deliveries/${deliveryId}`, input);
    return response.data.data;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to update delivery';
    throw new EarningsError(message);
  }
}

/**
 * Delete a delivery
 */
export async function deleteDelivery(deliveryId: string): Promise<{ deleted: boolean }> {
  try {
    const response = await api.delete(`/earnings/deliveries/${deliveryId}`);
    return response.data.data;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to delete delivery';
    throw new EarningsError(message);
  }
}
