import { create } from 'zustand';
import * as earningsService from '../services/earnings';

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

interface EarningsState {
  summary: earningsService.EarningsSummary | null;
  deliveries: earningsService.Delivery[];
  deliveriesTotal: number;
  period: earningsService.EarningsPeriod;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Actions
  setPeriod: (period: earningsService.EarningsPeriod) => void;
  fetchSummary: () => Promise<void>;
  fetchDeliveries: (loadMore?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useEarningsStore = create<EarningsState>((set, get) => ({
  summary: null,
  deliveries: [],
  deliveriesTotal: 0,
  period: 'today',
  isLoading: false,
  isLoadingMore: false,
  error: null,

  setPeriod: (period) => {
    set({ period, summary: null, deliveries: [], deliveriesTotal: 0 });
    // Trigger fetch when period changes
    get().fetchSummary();
    get().fetchDeliveries();
  },

  fetchSummary: async () => {
    const { period } = get();
    set({ isLoading: true, error: null });

    try {
      const timezone = getTimezone();
      const summary = await earningsService.getEarningsSummary(period, timezone);
      set({ summary, isLoading: false });
    } catch (error) {
      const message = error instanceof earningsService.EarningsError ? error.message : 'Failed to fetch earnings';
      set({ error: message, isLoading: false });
    }
  },

  fetchDeliveries: async (loadMore = false) => {
    const { period, deliveries } = get();

    if (loadMore) {
      set({ isLoadingMore: true });
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      const timezone = getTimezone();
      const offset = loadMore ? deliveries.length : 0;
      const result = await earningsService.getDeliveries(period, timezone, 20, offset);

      if (loadMore) {
        set({
          deliveries: [...deliveries, ...result.deliveries],
          deliveriesTotal: result.total,
          isLoadingMore: false,
        });
      } else {
        set({
          deliveries: result.deliveries,
          deliveriesTotal: result.total,
          isLoading: false,
        });
      }
    } catch (error) {
      const message = error instanceof earningsService.EarningsError ? error.message : 'Failed to fetch deliveries';
      set({ error: message, isLoading: false, isLoadingMore: false });
    }
  },

  refresh: async () => {
    const { fetchSummary, fetchDeliveries } = get();
    set({ deliveries: [], deliveriesTotal: 0 });
    await Promise.all([fetchSummary(), fetchDeliveries()]);
  },

  clearError: () => set({ error: null }),
}));
