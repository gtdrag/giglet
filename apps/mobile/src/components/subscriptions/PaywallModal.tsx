import { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  purchaseMonthly,
  purchaseAnnual,
  SubscriptionError,
} from '../../services/subscriptions';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

// Feature display names for the paywall
const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  autoMileageTracking: 'Automatic Mileage Tracking',
  taxExport: 'Tax Export',
  unlimitedHistory: 'Unlimited History',
  zoneAlerts: 'Zone Alerts',
};

// Feature descriptions for the paywall
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  autoMileageTracking:
    'Track your miles automatically in the background while you deliver. Perfect for tax deductions.',
  taxExport:
    'Export your mileage log and earnings summary for tax filing. IRS-compliant formats.',
  unlimitedHistory:
    'Access your complete delivery and mileage history. Free tier is limited to 7 days.',
  zoneAlerts:
    'Get notified when high-demand zones appear near you. Never miss a hot spot.',
};

// Pro benefits to show in the modal
const PRO_BENEFITS = [
  { icon: 'car' as const, text: 'Automatic mileage tracking' },
  { icon: 'document-text' as const, text: 'Tax-ready exports' },
  { icon: 'time' as const, text: 'Unlimited history access' },
  { icon: 'notifications' as const, text: 'Hot zone alerts' },
  { icon: 'flash' as const, text: 'Priority support' },
];

type PlanType = 'monthly' | 'annual';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  onUpgrade?: () => void;
}

export function PaywallModal({
  visible,
  onClose,
  feature,
  onUpgrade,
}: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useSubscriptionStore((state) => state.loadSubscription);

  const featureName = feature
    ? FEATURE_DISPLAY_NAMES[feature] || feature
    : 'Pro Feature';
  const featureDescription = feature
    ? FEATURE_DESCRIPTIONS[feature] || 'This feature requires a Pro subscription.'
    : 'Unlock all Pro features to get the most out of Giglet.';

  const handlePurchase = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const purchaseFn = selectedPlan === 'monthly' ? purchaseMonthly : purchaseAnnual;
      const success = await purchaseFn();

      if (success) {
        // Refresh subscription status from backend
        await loadSubscription();
        // Call onUpgrade callback if provided
        onUpgrade?.();
        // Close the modal
        onClose();
      }
      // If success is false, user cancelled - just dismiss loading state
    } catch (err) {
      if (err instanceof SubscriptionError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlan, loadSubscription, onUpgrade, onClose]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  }, [isLoading, onClose]);

  const handleRetry = useCallback(() => {
    setError(null);
    handlePurchase();
  }, [handlePurchase]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Lock Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={48} color="#EAB308" />
            </View>

            {/* Feature Name */}
            <Text style={styles.title}>{featureName}</Text>
            <Text style={styles.description}>{featureDescription}</Text>

            {/* Pro Badge */}
            <View style={styles.proBadge}>
              <Ionicons name="star" size={16} color="#EAB308" />
              <Text style={styles.proBadgeText}>Pro Feature</Text>
            </View>

            {/* Benefits List */}
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>Upgrade to Pro and get:</Text>
              {PRO_BENEFITS.map((benefit, index) => (
                <View key={index} style={styles.benefitRow}>
                  <Ionicons name={benefit.icon} size={20} color="#22C55E" />
                  <Text style={styles.benefitText}>{benefit.text}</Text>
                </View>
              ))}
            </View>

            {/* Pricing Cards */}
            <View style={styles.pricingSection}>
              {/* Monthly Option */}
              <Pressable
                style={[
                  styles.pricingCard,
                  selectedPlan === 'monthly' && styles.pricingCardSelected,
                ]}
                onPress={() => setSelectedPlan('monthly')}
                disabled={isLoading}
              >
                {selectedPlan === 'monthly' && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  </View>
                )}
                <Text style={styles.pricingLabel}>Monthly</Text>
                <Text style={styles.pricingAmount}>$4.99</Text>
                <Text style={styles.pricingPeriod}>/month</Text>
              </Pressable>

              {/* Annual Option (Recommended) */}
              <Pressable
                style={[
                  styles.pricingCard,
                  styles.pricingCardHighlighted,
                  selectedPlan === 'annual' && styles.pricingCardSelected,
                ]}
                onPress={() => setSelectedPlan('annual')}
                disabled={isLoading}
              >
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>Save 42%</Text>
                </View>
                {selectedPlan === 'annual' && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  </View>
                )}
                <Text style={styles.pricingLabel}>Annual</Text>
                <Text style={styles.pricingAmount}>$34.99</Text>
                <Text style={styles.pricingPeriod}>/year</Text>
                <Text style={styles.pricingMonthly}>$2.92/mo</Text>
              </Pressable>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={handleRetry}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* CTA Buttons */}
            <Pressable
              style={[styles.upgradeButton, isLoading && styles.upgradeButtonDisabled]}
              onPress={handlePurchase}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="rocket" size={20} color="#FFFFFF" />
                  <Text style={styles.upgradeButtonText}>
                    {selectedPlan === 'monthly' ? 'Subscribe Monthly' : 'Subscribe Annually'}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.laterButton}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={[styles.laterButtonText, isLoading && styles.laterButtonTextDisabled]}>
                Maybe Later
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#422006',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FAFAFA',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#422006',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 24,
  },
  proBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EAB308',
  },
  benefitsSection: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 15,
    color: '#E4E4E7',
  },
  pricingSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#27272A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#27272A',
    position: 'relative',
  },
  pricingCardHighlighted: {
    backgroundColor: '#0E3A42',
  },
  pricingCardSelected: {
    borderColor: '#06B6D4',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pricingLabel: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 4,
    marginTop: 8,
  },
  pricingAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FAFAFA',
  },
  pricingPeriod: {
    fontSize: 14,
    color: '#71717A',
  },
  pricingMonthly: {
    fontSize: 12,
    color: '#22C55E',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  retryButton: {
    backgroundColor: '#27272A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 52,
  },
  upgradeButtonDisabled: {
    opacity: 0.7,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 15,
    color: '#71717A',
  },
  laterButtonTextDisabled: {
    opacity: 0.5,
  },
});
