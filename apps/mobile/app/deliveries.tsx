/**
 * Deliveries Page - List all deliveries with manual indicator and edit capability
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getDeliveries, Delivery, EarningsPeriod } from '../src/services/earnings';
import { ManualDeliveryModal } from '../src/components/ManualDeliveryModal';

const PERIODS: { label: string; value: EarningsPeriod }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<EarningsPeriod>('week');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchDeliveries = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await getDeliveries(period, timezone, 100, 0);
      setDeliveries(result.deliveries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deliveries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [fetchDeliveries])
  );

  const handleDeliveryPress = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedDelivery(null);
    fetchDeliveries();
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchDeliveries();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getPlatformColor = (platform: string) => {
    return platform === 'DOORDASH' ? '#FF3008' : '#06C167';
  };

  const renderDelivery = ({ item }: { item: Delivery }) => (
    <Pressable
      style={styles.deliveryItem}
      onPress={() => handleDeliveryPress(item)}
    >
      <View style={styles.deliveryLeft}>
        <View style={[styles.platformDot, { backgroundColor: getPlatformColor(item.platform) }]} />
        <View style={styles.deliveryInfo}>
          <View style={styles.deliveryHeader}>
            <Text style={styles.deliveryPlatform}>
              {item.platform === 'DOORDASH' ? 'DoorDash' : 'Uber Eats'}
            </Text>
            {item.isManual && (
              <View style={styles.manualBadge}>
                <Ionicons name="create-outline" size={10} color="#06B6D4" />
                <Text style={styles.manualBadgeText}>Manual</Text>
              </View>
            )}
          </View>
          <Text style={styles.deliveryDate}>{formatDate(item.deliveredAt)}</Text>
          {item.restaurantName && (
            <Text style={styles.restaurantName} numberOfLines={1}>
              {item.restaurantName}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.deliveryRight}>
        <View style={styles.earningsInfo}>
          <Text style={styles.deliveryEarnings}>${item.earnings.toFixed(2)}</Text>
          <Text style={styles.deliveryTip}>
            ${item.basePay.toFixed(2)} + ${item.tip.toFixed(2)} tip
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#52525B" />
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={48} color="#52525B" />
      <Text style={styles.emptyTitle}>No Deliveries</Text>
      <Text style={styles.emptySubtitle}>
        Import from CSV or add manually
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.headerTitle}>Deliveries</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={28} color="#22C55E" />
        </Pressable>
      </View>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.value}
            style={[styles.periodButton, period === p.value && styles.periodButtonActive]}
            onPress={() => setPeriod(p.value)}
          >
            <Text
              style={[
                styles.periodButtonText,
                period === p.value && styles.periodButtonTextActive,
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchDeliveries()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id}
          renderItem={renderDelivery}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDeliveries(true)}
              tintColor="#22C55E"
            />
          }
        />
      )}

      {/* Edit Modal */}
      <ManualDeliveryModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedDelivery(null);
        }}
        onSuccess={handleEditSuccess}
        editDelivery={selectedDelivery}
      />

      {/* Add Modal */}
      <ManualDeliveryModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
    marginLeft: 12,
  },
  addButton: {
    padding: 4,
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    margin: 16,
    borderRadius: 10,
    padding: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#27272A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  deliveryItem: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  deliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryPlatform: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  manualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#06B6D4',
  },
  deliveryDate: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  restaurantName: {
    fontSize: 12,
    color: '#52525B',
    marginTop: 2,
  },
  deliveryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earningsInfo: {
    alignItems: 'flex-end',
  },
  deliveryEarnings: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
  deliveryTip: {
    fontSize: 11,
    color: '#52525B',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#71717A',
  },
});
