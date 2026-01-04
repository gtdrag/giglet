/**
 * Import History Screen - View and manage CSV import history
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getImportHistory,
  getImportBatchDetails,
  deleteImportBatch,
  type ImportBatch,
  type ImportBatchDetails,
} from '../src/services/earnings';

// Platform styling
const PLATFORM_COLORS = {
  DOORDASH: '#FF3008',
  UBEREATS: '#06C167',
};

const PLATFORM_NAMES = {
  DOORDASH: 'DoorDash',
  UBEREATS: 'Uber Eats',
};

const PLATFORM_ICONS = {
  DOORDASH: 'car',
  UBEREATS: 'bicycle',
} as const;

export default function ImportHistoryScreen() {
  const router = useRouter();
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail modal state
  const [selectedBatch, setSelectedBatch] = useState<ImportBatchDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Load imports on mount
  useEffect(() => {
    loadImports();
  }, []);

  const loadImports = async () => {
    try {
      setError(null);
      const data = await getImportHistory(50);
      setImports(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load import history';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadImports();
  }, []);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleViewDetails = async (batch: ImportBatch) => {
    try {
      setIsLoadingDetails(true);
      setShowDetails(true);
      const details = await getImportBatchDetails(batch.id);
      setSelectedBatch(details);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load details';
      Alert.alert('Error', message);
      setShowDetails(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedBatch(null);
  };

  const handleDeleteBatch = (batch: ImportBatch) => {
    Alert.alert(
      'Delete Import',
      `This will remove ${batch.importedCount} deliveries from "${batch.filename}". This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteImportBatch(batch.id);
              Alert.alert('Deleted', `Removed ${result.deletedDeliveries} deliveries`);
              loadImports(); // Refresh list
              if (showDetails && selectedBatch?.batch.id === batch.id) {
                handleCloseDetails();
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderImportItem = ({ item }: { item: ImportBatch }) => {
    const platformColor = PLATFORM_COLORS[item.platform];
    const platformIcon = PLATFORM_ICONS[item.platform];

    return (
      <Pressable
        style={styles.importItem}
        onPress={() => handleViewDetails(item)}
      >
        <View style={styles.importItemLeft}>
          <View style={[styles.platformIcon, { backgroundColor: platformColor + '20' }]}>
            <Ionicons name={platformIcon} size={20} color={platformColor} />
          </View>
          <View style={styles.importItemInfo}>
            <Text style={styles.importFilename} numberOfLines={1}>
              {item.filename}
            </Text>
            <Text style={styles.importDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.importItemRight}>
          <View style={styles.importStats}>
            <Text style={styles.importCount}>{item.importedCount} imported</Text>
            {item.duplicateCount > 0 && (
              <Text style={styles.duplicateCount}>{item.duplicateCount} skipped</Text>
            )}
          </View>
          <Pressable
            style={styles.deleteButton}
            onPress={() => handleDeleteBatch(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={48} color="#52525B" />
        <Text style={styles.emptyTitle}>No imports yet</Text>
        <Text style={styles.emptyDescription}>
          Import your earnings CSV files to see them here
        </Text>
        <Pressable
          style={styles.importButton}
          onPress={() => router.push('/import')}
        >
          <Text style={styles.importButtonText}>Import CSV</Text>
        </Pressable>
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!showDetails) return null;

    return (
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={handleCloseDetails} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import Details</Text>
            <Pressable onPress={handleCloseDetails}>
              <Ionicons name="close" size={24} color="#A1A1AA" />
            </Pressable>
          </View>

          {isLoadingDetails ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#06B6D4" />
            </View>
          ) : selectedBatch ? (
            <>
              <View style={styles.batchSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Platform</Text>
                  <Text style={styles.summaryValue}>
                    {PLATFORM_NAMES[selectedBatch.batch.platform]}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>File</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {selectedBatch.batch.filename}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Earnings</Text>
                  <Text style={[styles.summaryValue, styles.earningsValue]}>
                    ${selectedBatch.summary.totalEarnings.toFixed(2)}
                  </Text>
                </View>
                {selectedBatch.summary.dateRange && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date Range</Text>
                    <Text style={styles.summaryValue}>
                      {new Date(selectedBatch.summary.dateRange.start).toLocaleDateString()} -{' '}
                      {new Date(selectedBatch.summary.dateRange.end).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.deliveriesTitle}>
                Deliveries ({selectedBatch.deliveries.length})
              </Text>
              <FlatList
                data={selectedBatch.deliveries}
                keyExtractor={(item) => item.id}
                style={styles.deliveriesList}
                renderItem={({ item }) => (
                  <View style={styles.deliveryItem}>
                    <View>
                      <Text style={styles.deliveryDate}>
                        {new Date(item.deliveredAt).toLocaleDateString()}
                      </Text>
                      {item.restaurantName && (
                        <Text style={styles.deliveryRestaurant}>{item.restaurantName}</Text>
                      )}
                    </View>
                    <Text style={styles.deliveryEarnings}>${item.earnings.toFixed(2)}</Text>
                  </View>
                )}
              />

              <Pressable
                style={styles.deleteModalButton}
                onPress={() => handleDeleteBatch(selectedBatch.batch)}
              >
                <Ionicons name="trash-outline" size={18} color="#FAFAFA" />
                <Text style={styles.deleteModalButtonText}>Delete Import</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    );
  };

  if (error && !isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#FAFAFA" />
          </Pressable>
          <Text style={styles.headerTitle}>Import History</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadImports}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.headerTitle}>Import History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
        </View>
      ) : (
        <FlatList
          data={imports}
          keyExtractor={(item) => item.id}
          renderItem={renderImportItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#06B6D4"
            />
          }
        />
      )}

      {renderDetailModal()}
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
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  importItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  importItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  importFilename: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  importDate: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  importItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  importStats: {
    alignItems: 'flex-end',
  },
  importCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
  },
  duplicateCount: {
    fontSize: 12,
    color: '#EAB308',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  importButton: {
    marginTop: 24,
    backgroundColor: '#06B6D4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  importButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#27272A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  modalLoading: {
    padding: 60,
    alignItems: 'center',
  },
  batchSummary: {
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#71717A',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAFA',
    maxWidth: '60%',
  },
  earningsValue: {
    fontSize: 16,
    color: '#22C55E',
  },
  deliveriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    paddingHorizontal: 16,
    paddingTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveriesList: {
    maxHeight: 300,
    marginTop: 8,
  },
  deliveryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  deliveryDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  deliveryRestaurant: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  deliveryEarnings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  deleteModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  deleteModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
});
