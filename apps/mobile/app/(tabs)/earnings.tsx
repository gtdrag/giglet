import { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEarningsStore } from '../../src/stores/earningsStore';
import type { EarningsPeriod, Delivery } from '../../src/services/earnings';

const PERIOD_OPTIONS: { label: string; value: EarningsPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateRange(startISO: string, endISO: string, period: EarningsPeriod): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  // End is exclusive, so subtract 1 day for display
  end.setDate(end.getDate() - 1);

  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const yearFormat: Intl.DateTimeFormatOptions = { ...formatOptions, year: 'numeric' };

  if (period === 'today') {
    return start.toLocaleDateString('en-US', yearFormat);
  }

  const startStr = start.toLocaleDateString('en-US', formatOptions);
  const endStr = end.toLocaleDateString('en-US', yearFormat);

  // If same month, simplify (e.g., "Jan 1 - 7, 2026")
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${startStr} - ${endStr}`;
}

function getPlatformColor(platform: string): string {
  switch (platform) {
    case 'DOORDASH':
      return '#FF3008';
    case 'UBEREATS':
      return '#06C167';
    default:
      return '#A1A1AA';
  }
}

function getPlatformIcon(platform: string): string {
  switch (platform) {
    case 'DOORDASH':
      return 'restaurant';
    case 'UBEREATS':
      return 'car';
    default:
      return 'receipt';
  }
}

interface DeliveryItemProps {
  delivery: Delivery;
}

function DeliveryItem({ delivery }: DeliveryItemProps) {
  return (
    <View style={styles.deliveryItem}>
      <View style={[styles.platformBadge, { backgroundColor: getPlatformColor(delivery.platform) }]}>
        <Ionicons name={getPlatformIcon(delivery.platform) as 'restaurant' | 'car' | 'receipt'} size={16} color="#FFFFFF" />
      </View>
      <View style={styles.deliveryInfo}>
        <Text style={styles.deliveryRestaurant} numberOfLines={1}>
          {delivery.restaurantName || 'Unknown Restaurant'}
        </Text>
        <Text style={styles.deliveryTime}>
          {formatDate(delivery.deliveredAt)} at {formatTime(delivery.deliveredAt)}
        </Text>
      </View>
      <View style={styles.deliveryEarnings}>
        <Text style={styles.deliveryAmount}>{formatCurrency(delivery.earnings)}</Text>
        {delivery.tip > 0 && <Text style={styles.deliveryTip}>+{formatCurrency(delivery.tip)} tip</Text>}
      </View>
    </View>
  );
}

export default function EarningsScreen() {
  const {
    summary,
    deliveries,
    deliveriesTotal,
    period,
    isLoading,
    isLoadingMore,
    error,
    setPeriod,
    fetchSummary,
    fetchDeliveries,
    refresh,
  } = useEarningsStore();

  useEffect(() => {
    fetchSummary();
    fetchDeliveries();
  }, []);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && deliveries.length < deliveriesTotal) {
      fetchDeliveries(true);
    }
  }, [isLoadingMore, deliveries.length, deliveriesTotal, fetchDeliveries]);

  const renderDeliveryItem = useCallback(
    ({ item }: { item: Delivery }) => <DeliveryItem delivery={item} />,
    []
  );

  const renderHeader = () => (
    <>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {PERIOD_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.periodButton, period === option.value && styles.periodButtonActive]}
            onPress={() => setPeriod(option.value)}
          >
            <Text style={[styles.periodButtonText, period === option.value && styles.periodButtonTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        {isLoading && !summary ? (
          <ActivityIndicator size="large" color="#22C55E" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <Text style={styles.summaryLabel}>
              {period === 'today' ? "Today's" : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year'} Earnings
            </Text>
            {summary?.dateRange && (
              <Text style={styles.dateRangeText}>
                {formatDateRange(summary.dateRange.start, summary.dateRange.end, period)}
              </Text>
            )}
            <Text style={styles.summaryValue}>{formatCurrency(summary?.total ?? 0)}</Text>
            <View style={styles.summaryDetails}>
              <View style={styles.summaryDetailItem}>
                <Text style={styles.detailLabel}>Deliveries</Text>
                <Text style={styles.detailValue}>{summary?.deliveryCount ?? 0}</Text>
              </View>
              <View style={styles.summaryDetailItem}>
                <Text style={styles.detailLabel}>Tips</Text>
                <Text style={styles.detailValue}>{formatCurrency(summary?.tipTotal ?? 0)}</Text>
              </View>
              <View style={styles.summaryDetailItem}>
                <Text style={styles.detailLabel}>Base Pay</Text>
                <Text style={styles.detailValue}>{formatCurrency(summary?.basePayTotal ?? 0)}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Platform Breakdown */}
      {summary && summary.platformBreakdown.length > 0 && (
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>By Platform</Text>
          {summary.platformBreakdown.map((platform) => (
            <View key={platform.platform} style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.platformDot, { backgroundColor: getPlatformColor(platform.platform) }]} />
                <Text style={styles.breakdownPlatform}>
                  {platform.platform === 'DOORDASH' ? 'DoorDash' : 'Uber Eats'}
                </Text>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={styles.breakdownAmount}>{formatCurrency(platform.total)}</Text>
                <Text style={styles.breakdownCount}>{platform.deliveryCount} deliveries</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Deliveries Header */}
      <View style={styles.deliveriesHeader}>
        <Text style={styles.sectionTitle}>Recent Deliveries</Text>
        <Text style={styles.deliveriesCount}>{deliveriesTotal} total</Text>
      </View>
    </>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#A1A1AA" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="receipt-outline" size={48} color="#3F3F46" />
        <Text style={styles.emptyText}>No deliveries yet</Text>
        <Text style={styles.emptySubtext}>Connect a platform to start tracking your earnings</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
      </View>

      <FlatList
        data={deliveries}
        renderItem={renderDeliveryItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={isLoading && !!summary} onRefresh={handleRefresh} tintColor="#A1A1AA" />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FAFAFA',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#27272A',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717A',
  },
  periodButtonTextActive: {
    color: '#FAFAFA',
  },
  summaryCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    minHeight: 150,
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 4,
  },
  dateRangeText: {
    fontSize: 12,
    color: '#71717A',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 16,
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryDetailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#71717A',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  breakdownSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  breakdownPlatform: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
  breakdownCount: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  deliveriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveriesCount: {
    fontSize: 14,
    color: '#71717A',
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  platformBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryRestaurant: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  deliveryTime: {
    fontSize: 13,
    color: '#71717A',
  },
  deliveryEarnings: {
    alignItems: 'flex-end',
  },
  deliveryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
  deliveryTip: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#A1A1AA',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
