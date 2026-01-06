import api from './api';

// TipSize must match the backend enum
export type TipSize = 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE' | 'XXLARGE';

export interface TipLog {
  id: string;
  lat: number;
  lng: number;
  tipSize: TipSize;
  createdAt: string;
}

export interface CreateTipLogData {
  lat: number;
  lng: number;
  tipSize: TipSize;
}

export interface GetTipsFilters {
  tipSize?: TipSize;
  startDate?: string;
  endDate?: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  limit?: number;
  offset?: number;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface GetTipsResponse {
  tips: TipLog[];
  pagination: Pagination;
}

/**
 * Create a new tip log entry
 * @param data Tip log data with lat, lng, and tipSize
 * @returns Created tip log record
 */
export async function logTip(data: CreateTipLogData): Promise<TipLog> {
  const response = await api.post<{ success: boolean; data: TipLog }>(
    '/tips',
    data
  );

  return response.data.data;
}

/**
 * Query tip logs with optional filters
 * @param filters Optional filters (tipSize, date range, viewport bounds, pagination)
 * @returns Tips array and pagination info
 */
export async function getTips(filters: GetTipsFilters = {}): Promise<GetTipsResponse> {
  // Build query params, only including defined values
  const params = new URLSearchParams();

  if (filters.tipSize) {
    params.append('tipSize', filters.tipSize);
  }
  if (filters.startDate) {
    params.append('startDate', filters.startDate);
  }
  if (filters.endDate) {
    params.append('endDate', filters.endDate);
  }
  if (filters.minLat !== undefined) {
    params.append('minLat', filters.minLat.toString());
  }
  if (filters.maxLat !== undefined) {
    params.append('maxLat', filters.maxLat.toString());
  }
  if (filters.minLng !== undefined) {
    params.append('minLng', filters.minLng.toString());
  }
  if (filters.maxLng !== undefined) {
    params.append('maxLng', filters.maxLng.toString());
  }
  if (filters.limit !== undefined) {
    params.append('limit', filters.limit.toString());
  }
  if (filters.offset !== undefined) {
    params.append('offset', filters.offset.toString());
  }

  const queryString = params.toString();
  const url = queryString ? `/tips?${queryString}` : '/tips';

  const response = await api.get<{ success: boolean; data: GetTipsResponse }>(url);

  return response.data.data;
}

/**
 * Get tips within a map viewport
 * Convenience wrapper around getTips for viewport queries
 */
export async function getTipsInViewport(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  options: { tipSize?: TipSize; limit?: number } = {}
): Promise<GetTipsResponse> {
  return getTips({
    ...bounds,
    tipSize: options.tipSize,
    limit: options.limit,
  });
}

/**
 * Get display label for tip size
 */
export function getTipSizeLabel(tipSize: TipSize): string {
  const labels: Record<TipSize, string> = {
    NONE: 'None',
    SMALL: 'S',
    MEDIUM: 'M',
    LARGE: 'L',
    XLARGE: 'XL',
    XXLARGE: 'XXL',
  };
  return labels[tipSize];
}

/**
 * Get color for tip size (for visual feedback)
 */
export function getTipSizeColor(tipSize: TipSize): string {
  const colors: Record<TipSize, string> = {
    NONE: '#71717A',    // Gray
    SMALL: '#EF4444',   // Red
    MEDIUM: '#F97316',  // Orange
    LARGE: '#EAB308',   // Yellow
    XLARGE: '#22C55E',  // Green
    XXLARGE: '#10B981', // Emerald
  };
  return colors[tipSize];
}
