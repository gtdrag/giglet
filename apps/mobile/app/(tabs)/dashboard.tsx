import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ManualDeliveryModal } from '../../src/components/ManualDeliveryModal';
import { useEarningsStore } from '../../src/stores/earningsStore';
import type { EarningsPeriod } from '../../src/services/earnings';

// Platform colors for breakdown display
const PLATFORM_COLORS = {
  DOORDASH: '#FF3008',
  UBEREATS: '#06C167',
};

const PLATFORM_NAMES = {
  DOORDASH: 'DoorDash',
  UBEREATS: 'Uber Eats',
};

// Period display labels
const PERIOD_LABELS: Record<EarningsPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

// Format date range for display (e.g., "Jan 1 - Jan 4")
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = startDate.toLocaleDateString('en-US', options);
  const endStr = endDate.toLocaleDateString('en-US', options);
  return startStr === endStr ? startStr : `${startStr} - ${endStr}`;
}

// Format currency
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default function DashboardPage() {
  const [showManualModal, setShowManualModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Connect to earnings store
  const {
    summary,
    period,
    isLoading,
    error,
    fetchSummary,
    fetchDeliveries,
    refresh,
    clearError,
    setPeriod,
  } = useEarningsStore();

  // Handle period change
  const handlePeriodChange = useCallback((newPeriod: EarningsPeriod) => {
    if (newPeriod !== period) {
      setPeriod(newPeriod);
    }
  }, [period, setPeriod]);

  // Fetch data on mount - set period to 'week' for dashboard display
  useEffect(() => {
    // Set period to 'week' and this will trigger data fetch
    setPeriod('week');
  }, [setPeriod]);

  // Handle manual delivery success - refresh data
  const handleManualDeliverySuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Retry on error
  const handleRetry = useCallback(() => {
    clearError();
    fetchSummary();
    fetchDeliveries();
  }, [clearError, fetchSummary, fetchDeliveries]);

  // Calculate earnings display values
  const totalEarnings = summary?.total ?? 0;
  const hasEarnings = totalEarnings > 0;
  const platformBreakdown = summary?.platformBreakdown ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#06B6D4"
            colors={['#06B6D4']}
          />
        }
      >
        {/* Earnings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="wallet" size={20} color="#22C55E" />
            </View>
            <Text style={styles.cardTitle}>Earnings</Text>
          </View>

          {/* Loading State */}
          {isLoading && !summary && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#06B6D4" />
              <Text style={styles.loadingText}>Loading earnings...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Earnings Display */}
          {!isLoading && !error && (
            <>
              {/* Total Amount */}
              <Text style={styles.earningsAmount}>{formatCurrency(totalEarnings)}</Text>
              <Text style={styles.cardSubtext}>
                {PERIOD_LABELS[period]}
                {summary?.dateRange && ` (${formatDateRange(summary.dateRange.start, summary.dateRange.end)})`}
              </Text>

              {/* Platform Breakdown */}
              {hasEarnings && platformBreakdown.length > 0 && (
                <View style={styles.breakdownContainer}>
                  {platformBreakdown.map((platform) => (
                    <View key={platform.platform} style={styles.breakdownRow}>
                      <View style={styles.breakdownLeft}>
                        <View
                          style={[
                            styles.platformDot,
                            { backgroundColor: PLATFORM_COLORS[platform.platform] },
                          ]}
                        />
                        <Text style={styles.breakdownPlatform}>
                          {PLATFORM_NAMES[platform.platform]}
                        </Text>
                      </View>
                      <Text style={styles.breakdownAmount}>
                        {formatCurrency(platform.total)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Empty State */}
              {!hasEarnings && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {period === 'today'
                      ? 'No earnings today. Start delivering to see earnings!'
                      : `Import your earnings to see your ${period === 'year' ? 'yearly' : period + 'ly'} total`}
                  </Text>
                </View>
              )}

              {/* Period Selector */}
              <View style={styles.periodSelector}>
                <PeriodButton
                  label="Today"
                  active={period === 'today'}
                  onPress={() => handlePeriodChange('today')}
                />
                <PeriodButton
                  label="Week"
                  active={period === 'week'}
                  onPress={() => handlePeriodChange('week')}
                />
                <PeriodButton
                  label="Month"
                  active={period === 'month'}
                  onPress={() => handlePeriodChange('month')}
                />
                <PeriodButton
                  label="Year"
                  active={period === 'year'}
                  onPress={() => handlePeriodChange('year')}
                />
              </View>

              {/* Links */}
              <View style={styles.earningsLinks}>
                <Pressable
                  style={styles.cardLink}
                  onPress={() => router.push('/deliveries' as any)}
                >
                  <Text style={styles.cardLinkText}>View all deliveries</Text>
                  <Ionicons name="chevron-forward" size={16} color="#06B6D4" />
                </Pressable>
                <Pressable
                  style={styles.addDeliveryButton}
                  onPress={() => setShowManualModal(true)}
                >
                  <Ionicons name="add-circle" size={18} color="#22C55E" />
                  <Text style={styles.addDeliveryText}>Add Delivery</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Import Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="download" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.cardTitle}>Import Earnings</Text>
          </View>
          <Text style={styles.cardSubtext}>
            {hasEarnings
              ? `${summary?.deliveryCount ?? 0} deliveries imported`
              : 'No imports yet'}
          </Text>
          <View style={styles.importButtons}>
            <Pressable
              style={[styles.importButton, styles.importButtonDoordash]}
              onPress={() => router.push('/import?platform=DOORDASH' as any)}
            >
              <Text style={styles.importButtonText}>DoorDash CSV</Text>
            </Pressable>
            <Pressable
              style={[styles.importButton, styles.importButtonUbereats]}
              onPress={() => router.push('/import?platform=UBEREATS' as any)}
            >
              <Text style={styles.importButtonText}>Uber Eats CSV</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.cardLinkHistory}
            onPress={() => router.push('/import-history' as any)}
          >
            <Ionicons name="time-outline" size={16} color="#06B6D4" />
            <Text style={styles.cardLinkText}>View Import History</Text>
          </Pressable>
        </View>

        {/* Tax Export Card (Pro) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="document-text" size={20} color="#EAB308" />
            </View>
            <Text style={styles.cardTitle}>Tax Export</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>Pro</Text>
            </View>
          </View>
          <Text style={styles.cardSubtext}>Export mileage log & earnings for taxes</Text>
          <Pressable style={[styles.cardLink, styles.cardLinkDisabled]}>
            <Ionicons name="lock-closed" size={14} color="#71717A" />
            <Text style={styles.cardLinkTextDisabled}>Upgrade to Pro</Text>
            <Ionicons name="chevron-forward" size={16} color="#71717A" />
          </Pressable>
        </View>

        {/* Settings Card */}
        <Pressable style={styles.card} onPress={() => router.push('/accounts')}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="settings" size={20} color="#A1A1AA" />
            </View>
            <Text style={styles.cardTitle}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#71717A" />
          </View>
          <Text style={styles.cardSubtext}>Profile, notifications, account</Text>
        </Pressable>
      </ScrollView>

      <ManualDeliveryModal
        visible={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={handleManualDeliverySuccess}
      />
    </SafeAreaView>
  );
}

interface PeriodButtonProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

function PeriodButton({ label, active = false, onPress }: PeriodButtonProps) {
  return (
    <Pressable
      style={[styles.periodButton, active && styles.periodButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.periodButtonText, active && styles.periodButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FAFAFA',
    flex: 1,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#71717A',
    marginBottom: 12,
  },
  earningsAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  // Loading state
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#71717A',
  },
  // Error state
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#27272A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#06B6D4',
  },
  // Platform breakdown
  breakdownContainer: {
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  platformDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownPlatform: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  // Empty state
  emptyState: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
  },
  // Period selector
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#27272A',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#3F3F46',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717A',
  },
  periodButtonTextActive: {
    color: '#FAFAFA',
  },
  // Links
  earningsLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#06B6D4',
  },
  addDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addDeliveryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#22C55E',
  },
  cardLinkDisabled: {
    opacity: 0.7,
  },
  cardLinkTextDisabled: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717A',
    flex: 1,
  },
  importButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardLinkHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  importButton: {
    flex: 1,
    backgroundColor: '#27272A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  importButtonDoordash: {
    borderWidth: 1,
    borderColor: '#FF3008',
  },
  importButtonUbereats: {
    borderWidth: 1,
    borderColor: '#06C167',
  },
  proBadge: {
    backgroundColor: '#422006',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EAB308',
  },
});
