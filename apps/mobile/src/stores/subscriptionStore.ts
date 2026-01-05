import { create } from 'zustand';
import api from '../services/api';
import { getCustomerInfo, getSubscriptionDetails } from '../services/subscriptions';

// Subscription tier types matching backend enum
export type SubscriptionTier = 'FREE' | 'PRO_MONTHLY' | 'PRO_ANNUAL';

// Pro features that require subscription
export const PRO_FEATURES = [
  'autoMileageTracking',
  'taxExport',
  'unlimitedHistory',
  'zoneAlerts',
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];

interface SubscriptionState {
  tier: SubscriptionTier;
  isProUser: boolean;
  expiresAt: Date | null;
  willRenew: boolean;
  isCanceled: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSubscription: () => Promise<void>;
  canAccess: (feature: string) => boolean;
  setTier: (tier: SubscriptionTier) => void;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: 'FREE',
  isProUser: false,
  expiresAt: null,
  willRenew: false,
  isCanceled: false,
  isLoading: false,
  error: null,

  loadSubscription: async () => {
    set({ isLoading: true, error: null });

    try {
      // Fetch user profile which includes subscription info
      const response = await api.get('/auth/me');
      const user = response.data.data;

      // Extract subscription info from user response
      const subscription = user.subscription;

      // Also get willRenew from RevenueCat if available
      let willRenew = true; // Default to true (assume renewing)
      try {
        const customerInfo = await getCustomerInfo();
        if (customerInfo) {
          const details = getSubscriptionDetails(customerInfo);
          willRenew = details.willRenew;
        }
      } catch {
        // RevenueCat not available (e.g., Expo Go), default to renewing
        willRenew = true;
      }

      if (subscription) {
        const tier = subscription.tier as SubscriptionTier;
        const isProUser = tier !== 'FREE';
        const expiresAt = subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd)
          : null;

        // Subscription is canceled if user is Pro but willRenew is false
        const isCanceled = isProUser && !willRenew;

        set({
          tier,
          isProUser,
          expiresAt,
          willRenew,
          isCanceled,
          isLoading: false,
        });
      } else {
        // No subscription record means free tier
        set({
          tier: 'FREE',
          isProUser: false,
          expiresAt: null,
          willRenew: false,
          isCanceled: false,
          isLoading: false,
        });
      }
    } catch (error) {
      // On error, default to free tier
      set({
        tier: 'FREE',
        isProUser: false,
        expiresAt: null,
        willRenew: false,
        isCanceled: false,
        isLoading: false,
        error: 'Failed to load subscription status',
      });
    }
  },

  canAccess: (feature: string) => {
    const { tier } = get();

    // Pro users can access everything
    if (tier !== 'FREE') {
      return true;
    }

    // Free users cannot access Pro features
    return !PRO_FEATURES.includes(feature as ProFeature);
  },

  setTier: (tier: SubscriptionTier) => {
    set({
      tier,
      isProUser: tier !== 'FREE',
    });
  },

  clearError: () => set({ error: null }),
}));
