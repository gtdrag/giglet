/**
 * Standard API Response Types for Giglet API
 *
 * All API responses follow this consistent structure:
 * - Success: { success: true, data: T, meta?: ResponseMeta }
 * - Error: { success: false, error: ApiErrorResponse }
 */

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Health check response type
 */
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
  version: string;
  uptime: number;
}

/**
 * API info response type
 */
export interface ApiInfo {
  name: string;
  version: string;
  description: string;
  environment: string;
}

/**
 * Helper function to create success response
 */
export function successResponse<T>(data: T, meta?: Partial<ResponseMeta>): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Helper function to create error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}
