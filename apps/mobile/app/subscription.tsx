import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSubscriptionStore, SubscriptionTier } from '../src/stores/subscriptionStore';
import { getManagementUrl, restorePurchases, SubscriptionError } from '../src/services/subscriptions';
import { PaywallModal } from '../src/components/subscriptions/PaywallModal';

/**
 * Map internal tier to user-friendly display label
 */
function getTierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'PRO_ANNUAL':
      return 'Pro Annual';
    case 'PRO_MONTHLY':
      return 'Pro Monthly';
    case 'FREE':
    default:
      return 'Free';
  }
}

/**
 * Calculate days remaining until expiration
 */
function getDaysRemaining(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Format date for display
 */
function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function SubscriptionScreen() {
  const { tier, isProUser, expiresAt, isCanceled, isLoading, loadSubscription } = useSubscriptionStore();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleManageSubscription = async () => {
    const url = getManagementUrl();
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open subscription management. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open subscription management.');
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        await loadSubscription();
        Alert.alert('Success', 'Your subscription has been restored.');
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found to restore.');
      }
    } catch (error) {
      if (error instanceof SubscriptionError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to restore purchases. Please try again.');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  const handlePaywallClose = () => {
    setShowPaywall(false);
    loadSubscription();
  };

  const daysRemaining = getDaysRemaining(expiresAt);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.title}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator color="#10b981" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Current Plan Card */}
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planLabel}>Current Plan</Text>
                {isProUser && !isCanceled && (
                  <View style={styles.proBadge}>
                    <Ionicons name="star" size={12} color="#FAFAFA" />
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
                {isProUser && isCanceled && (
                  <View style={styles.canceledBadge}>
                    <Ionicons name="close-circle" size={12} color="#FAFAFA" />
                    <Text style={styles.canceledBadgeText}>CANCELED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planTier}>{getTierLabel(tier)}</Text>

              {isProUser && isCanceled && expiresAt && (
                <View style={styles.canceledBanner}>
                  <Ionicons name="warning" size={18} color="#f59e0b" />
                  <Text style={styles.canceledBannerText}>
                    Your subscription ends on {formatDate(expiresAt)}
                  </Text>
                </View>
              )}

              {isProUser && !isCanceled && expiresAt && (
                <View style={styles.renewalInfo}>
                  <View style={styles.renewalRow}>
                    <Ionicons name="calendar-outline" size={16} color="#A1A1AA" />
                    <Text style={styles.renewalLabel}>Renews on</Text>
                    <Text style={styles.renewalDate}>{formatDate(expiresAt)}</Text>
                  </View>
                  {daysRemaining !== null && (
                    <View style={styles.daysRemainingRow}>
                      <Ionicons name="time-outline" size={16} color="#A1A1AA" />
                      <Text style={styles.daysRemainingText}>
                        {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Pro User Actions */}
            {isProUser && !isCanceled && (
              <View style={styles.actionsSection}>
                <Pressable style={styles.manageButton} onPress={handleManageSubscription}>
                  <Ionicons name="settings-outline" size={20} color="#FAFAFA" />
                  <Text style={styles.manageButtonText}>Manage Subscription</Text>
                  <Ionicons name="open-outline" size={18} color="#A1A1AA" />
                </Pressable>

                <Text style={styles.manageHint}>
                  Opens the {getManagementUrl().includes('apple') ? 'App Store' : 'Play Store'} to manage your subscription
                </Text>

                <Pressable
                  style={styles.restoreButton}
                  onPress={handleRestorePurchases}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Canceled Subscription Re-subscribe */}
            {isProUser && isCanceled && (
              <View style={styles.actionsSection}>
                <Pressable style={styles.resubscribeButton} onPress={handleUpgrade}>
                  <Ionicons name="refresh" size={20} color="#FAFAFA" />
                  <Text style={styles.resubscribeButtonText}>Re-subscribe</Text>
                </Pressable>

                <Text style={styles.manageHint}>
                  Your Pro features will remain active until {formatDate(expiresAt)}
                </Text>
              </View>
            )}

            {/* Free User Upgrade Prompt */}
            {!isProUser && (
              <View style={styles.upgradeSection}>
                <View style={styles.upgradeCard}>
                  <View style={styles.upgradeIcon}>
                    <Ionicons name="rocket" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                  <Text style={styles.upgradeDescription}>
                    Unlock automatic mileage tracking, tax exports, unlimited history, and zone alerts.
                  </Text>
                  <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
                    <Text style={styles.upgradeButtonText}>View Pro Plans</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={styles.restoreButton}
                  onPress={handleRestorePurchases}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Pro Features List */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>
                {isProUser ? 'Your Pro Features' : 'Pro Features Include'}
              </Text>
              <View style={styles.featuresList}>
                <FeatureItem
                  icon="speedometer"
                  text="Automatic Mileage Tracking"
                  included={isProUser}
                />
                <FeatureItem
                  icon="document-text"
                  text="Tax Export & Reports"
                  included={isProUser}
                />
                <FeatureItem
                  icon="infinite"
                  text="Unlimited Earnings History"
                  included={isProUser}
                />
                <FeatureItem
                  icon="notifications"
                  text="Zone Alerts & Notifications"
                  included={isProUser}
                />
              </View>
            </View>
          </>
        )}
      </View>

      <PaywallModal visible={showPaywall} onClose={handlePaywallClose} />
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  included: boolean;
}

function FeatureItem({ icon, text, included }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, included && styles.featureIconIncluded]}>
        <Ionicons name={icon} size={18} color={included ? '#10b981' : '#71717A'} />
      </View>
      <Text style={[styles.featureText, included && styles.featureTextIncluded]}>{text}</Text>
      {included && <Ionicons name="checkmark-circle" size={18} color="#10b981" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  planCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planLabel: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  canceledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  canceledBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  canceledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  canceledBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#f59e0b',
  },
  planTier: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 16,
  },
  renewalInfo: {
    gap: 8,
  },
  renewalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  renewalLabel: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  renewalDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  daysRemainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  daysRemainingText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  actionsSection: {
    marginBottom: 24,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 12,
  },
  manageButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  manageHint: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  resubscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  resubscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  upgradeSection: {
    marginBottom: 24,
  },
  upgradeCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b98120',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  upgradeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 8,
  },
  upgradeDescription: {
    fontSize: 15,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreButtonText: {
    fontSize: 15,
    color: '#10b981',
    fontWeight: '500',
  },
  featuresSection: {
    marginTop: 8,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconIncluded: {
    backgroundColor: '#10b98120',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#71717A',
  },
  featureTextIncluded: {
    color: '#FAFAFA',
  },
});
