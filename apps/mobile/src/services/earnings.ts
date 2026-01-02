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
