/**
 * Trip History Screen - Full list of all tracked trips with pagination
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TripListItem } from '../src/components/TripListItem';
import { TripDetailModal } from '../src/components/TripDetailModal';
import { getPaginatedTrips, type PaginatedTrips } from '../src/utils/locationStorage';
import type { CompletedTrip } from '../src/services/locationTracking';
import {
  getDeliveries,
  correlateTripsWithDeliveries,
  getDeliveriesByIds,
  type DeliveryRecord,
  type CorrelationResult,
} from '../src/utils/deliveryStorage';

const PAGE_SIZE = 20;

export default function TripHistoryScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<CompletedTrip[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTrip, setSelectedTrip] = useState<CompletedTrip | null>(null);
  const [showTripDetail, setShowTripDetail] = useState(false);

  // Delivery correlation state
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [correlationMap, setCorrelationMap] = useState<Map<string, CorrelationResult>>(new Map());
  const [selectedTripDeliveries, setSelectedTripDeliveries] = useState<DeliveryRecord[]>([]);

  // Load initial trips and deliveries
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // Load deliveries first (one-time load)
    const allDeliveries = await getDeliveries();
    setDeliveries(allDeliveries);
    // Then load trips
    loadTrips(1, allDeliveries);
  };

  const loadTrips = async (pageNum: number, allDeliveries?: DeliveryRecord[]) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const result: PaginatedTrips = await getPaginatedTrips(pageNum, PAGE_SIZE);

      let updatedTrips: CompletedTrip[];
      if (pageNum === 1) {
        updatedTrips = result.trips;
        setTrips(result.trips);
      } else {
        updatedTrips = [...trips, ...result.trips];
        setTrips(updatedTrips);
      }

      // Compute correlation for the new trips
      const deliveriesForCorrelation = allDeliveries ?? deliveries;
      if (deliveriesForCorrelation.length > 0) {
        const newCorrelations = correlateTripsWithDeliveries(
          result.trips,
          deliveriesForCorrelation
        );
        // Merge with existing correlations
        setCorrelationMap((prev) => {
          const merged = new Map(prev);
          newCorrelations.forEach((value, key) => merged.set(key, value));
          return merged;
        });
      }

      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadTrips(page + 1);
    }
  }, [isLoadingMore, hasMore, page]);

  const handleTripPress = useCallback(
    async (trip: CompletedTrip) => {
      setSelectedTrip(trip);

      // Load linked deliveries for the selected trip
      const correlation = correlationMap.get(trip.id);
      if (correlation && correlation.deliveryIds.length > 0) {
        const linkedDeliveries = await getDeliveriesByIds(correlation.deliveryIds);
        setSelectedTripDeliveries(linkedDeliveries);
      } else {
        setSelectedTripDeliveries([]);
      }

      setShowTripDetail(true);
    },
    [correlationMap]
  );

  const handleCloseTripDetail = useCallback(() => {
    setShowTripDetail(false);
    setSelectedTrip(null);
    setSelectedTripDeliveries([]);
  }, []);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const renderTripItem = useCallback(
    ({ item }: { item: CompletedTrip }) => {
      const correlation = correlationMap.get(item.id);
      return (
        <TripListItem
          trip={item}
          onPress={handleTripPress}
          deliveryCount={correlation?.deliveryCount}
        />
      );
    },
    [handleTripPress, correlationMap]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#06B6D4" />
        <Text style={styles.loadingMoreText}>Loading more trips...</Text>
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="car-outline" size={48} color="#52525B" />
        </View>
        <Text style={styles.emptyTitle}>No Trips Yet</Text>
        <Text style={styles.emptyDescription}>
          Your tracked trips will appear here. Start driving with tracking enabled to
          log your first trip.
        </Text>
      </View>
    );
  }, [isLoading]);

  const renderHeader = useCallback(() => {
    if (trips.length === 0) return null;
    return (
      <View style={styles.listHeader}>
        <Text style={styles.tripCount}>
          {totalCount} trip{totalCount !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  }, [trips.length, totalCount]);

  const keyExtractor = useCallback((item: CompletedTrip) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.headerTitle}>Trip History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTripItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Trip Detail Modal */}
      <TripDetailModal
        visible={showTripDetail}
        onClose={handleCloseTripDetail}
        trip={selectedTrip}
        linkedDeliveries={selectedTripDeliveries}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#71717A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listHeader: {
    marginBottom: 16,
  },
  tripCount: {
    fontSize: 14,
    color: '#71717A',
  },
  separator: {
    height: 12,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: '#71717A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 20,
  },
});
