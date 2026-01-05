import { useCallback, useEffect } from 'react';
import {
  useSubscriptionStore,
  PRO_FEATURES,
  type SubscriptionTier,
  type ProFeature,
} from '../stores/subscriptionStore';

/**
 * Convenience hook for subscription state and feature gating
 *
 * Usage:
 * ```tsx
 * const { isProUser, canAccess, tier } = useSubscription();
 *
 * if (!canAccess('taxExport')) {
 *   showPaywall();
 * }
 * ```
 */
export function useSubscription() {
  const {
    tier,
    isProUser,
    expiresAt,
    isLoading,
    error,
    loadSubscription,
    canAccess,
    clearError,
  } = useSubscriptionStore();

  // Load subscription on mount if not already loaded
  useEffect(() => {
    if (!isLoading && tier === 'FREE' && !error) {
      // Only auto-load if we haven't loaded yet
      // This prevents repeated calls
    }
  }, [isLoading, tier, error]);

  // Wrapper for canAccess that provides better typing
  const checkAccess = useCallback(
    (feature: ProFeature | string): boolean => {
      return canAccess(feature);
    },
    [canAccess]
  );

  // Check if a specific feature requires Pro
  const isProFeature = useCallback((feature: string): boolean => {
    return PRO_FEATURES.includes(feature as ProFeature);
  }, []);

  // Get human-readable tier name
  const getTierName = useCallback((): string => {
    switch (tier) {
      case 'PRO_MONTHLY':
        return 'Pro Monthly';
      case 'PRO_ANNUAL':
        return 'Pro Annual';
      default:
        return 'Free';
    }
  }, [tier]);

  // Get days until subscription expires (null if no expiry or free tier)
  const getDaysUntilExpiry = useCallback((): number | null => {
    if (!expiresAt || tier === 'FREE') {
      return null;
    }

    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }, [expiresAt, tier]);

  return {
    // State
    tier,
    isProUser,
    expiresAt,
    isLoading,
    error,

    // Actions
    loadSubscription,
    clearError,

    // Helpers
    canAccess: checkAccess,
    isProFeature,
    getTierName,
    getDaysUntilExpiry,

    // Constants
    PRO_FEATURES,
  };
}

// Re-export types for convenience
export type { SubscriptionTier, ProFeature };
export { PRO_FEATURES };
