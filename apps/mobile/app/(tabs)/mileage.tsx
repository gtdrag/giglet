import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useMileageStore } from '../../src/stores/mileageStore';

// IRS mileage rate for 2024
const IRS_MILEAGE_RATE = 0.67;

export default function MileagePage() {
  const {
    trackingEnabled,
    permissionStatus,
    isLoading,
    tripState,
    activeTrip,
    todayMiles,
    weekMiles,
    todayTrips,
    recentTrips,
    checkPermission,
    enableTracking,
    loadTripStats,
    endCurrentTrip,
  } = useMileageStore();

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showManualModeInfo, setShowManualModeInfo] = useState(false);

  // Check permission on mount and when tab is focused
  useEffect(() => {
    checkPermission();
    loadTripStats();
  }, [checkPermission, loadTripStats]);

  const handleEnableTracking = useCallback(() => {
    setShowPermissionModal(true);
  }, []);

  const handleConfirmEnable = useCallback(async () => {
    setShowPermissionModal(false);
    const success = await enableTracking();
    if (!success) {
      // Permission was denied, show manual mode info
      setShowManualModeInfo(true);
    }
  }, [enableTracking]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const handleUseManualMode = useCallback(() => {
    setShowManualModeInfo(false);
  }, []);

  const handleEndTrip = useCallback(() => {
    endCurrentTrip();
  }, [endCurrentTrip]);

  // Format miles display
  const formatMiles = (miles: number): string => {
    return miles.toFixed(1);
  };

  // Format tax estimate
  const formatTaxEstimate = (miles: number): string => {
    return `$${(miles * IRS_MILEAGE_RATE).toFixed(2)}`;
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Get trip state display
  const getTripStateDisplay = (): { label: string; color: string } => {
    switch (tripState) {
      case 'MOVING':
        return { label: 'Recording Trip', color: '#22C55E' };
      case 'PAUSED':
        return { label: 'Trip Paused', color: '#EAB308' };
      default:
        return { label: 'Idle', color: '#71717A' };
    }
  };

  // Show tracking active state
  if (trackingEnabled) {
    const tripStateDisplay = getTripStateDisplay();
    const currentMiles = activeTrip?.currentMiles ?? 0;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tracking Active Header */}
          <View style={styles.trackingActiveCard}>
            <View style={styles.trackingActiveHeader}>
              <View style={styles.trackingActiveDot} />
              <Text style={styles.trackingActiveText}>Tracking Active</Text>
            </View>
            <Text style={styles.trackingActiveSubtext}>
              Your miles are being tracked automatically
            </Text>
          </View>

          {/* Active Trip Card (if trip in progress) */}
          {tripState !== 'IDLE' && activeTrip && (
            <View style={styles.activeTripCard}>
              <View style={styles.activeTripHeader}>
                <View style={[styles.tripStateDot, { backgroundColor: tripStateDisplay.color }]} />
                <Text style={[styles.tripStateText, { color: tripStateDisplay.color }]}>
                  {tripStateDisplay.label}
                </Text>
                {tripState === 'MOVING' && (
                  <ActivityIndicator size="small" color="#22C55E" style={{ marginLeft: 8 }} />
                )}
              </View>
              <Text style={styles.activeTripMiles}>{formatMiles(currentMiles)} mi</Text>
              <Text style={styles.activeTripDuration}>
                Started {formatRelativeTime(activeTrip.startedAt.toISOString())}
              </Text>
              {tripState === 'PAUSED' && (
                <Pressable style={styles.endTripButton} onPress={handleEndTrip}>
                  <Ionicons name="stop-circle" size={18} color="#EF4444" />
                  <Text style={styles.endTripButtonText}>End Trip</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Today's Mileage Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="car" size={20} color="#06B6D4" />
              </View>
              <Text style={styles.cardTitle}>Today's Mileage</Text>
            </View>
            <Text style={styles.mileageAmount}>{formatMiles(todayMiles)} mi</Text>
            <Text style={styles.taxEstimate}>
              {formatTaxEstimate(todayMiles)} tax deduction estimate
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{todayTrips}</Text>
                <Text style={styles.statLabel}>trips today</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatMiles(weekMiles)}</Text>
                <Text style={styles.statLabel}>mi this week</Text>
              </View>
            </View>
          </View>

          {/* Recent Trips Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: '#2E1065' }]}>
                <Ionicons name="list" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.cardTitle}>Recent Trips</Text>
            </View>
            {recentTrips.length === 0 ? (
              <>
                <Text style={styles.noTripsText}>No trips recorded yet</Text>
                <Text style={styles.noTripsSubtext}>
                  Start driving to automatically log your first trip
                </Text>
              </>
            ) : (
              <View style={styles.tripsList}>
                {recentTrips.slice(0, 5).map((trip) => (
                  <View key={trip.id} style={styles.tripItem}>
                    <View style={styles.tripItemLeft}>
                      <Ionicons name="location" size={16} color="#71717A" />
                      <View>
                        <Text style={styles.tripItemMiles}>{formatMiles(trip.miles)} mi</Text>
                        <Text style={styles.tripItemTime}>
                          {formatRelativeTime(trip.startedAt)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tripItemTax}>{formatTaxEstimate(trip.miles)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show enable tracking or manual mode state
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Enable Tracking Card */}
        {permissionStatus !== 'denied' && (
          <View style={styles.enableCard}>
            <View style={styles.enableIconContainer}>
              <Ionicons name="location" size={48} color="#06B6D4" />
            </View>
            <Text style={styles.enableTitle}>Automatic Mileage Tracking</Text>
            <Text style={styles.enableDescription}>
              Let Giglet track your miles in the background while you deliver.
              Perfect for tax deductions - no manual logging needed.
            </Text>
            <View style={styles.benefitsList}>
              <BenefitItem icon="checkmark-circle" text="Automatic trip detection" />
              <BenefitItem icon="checkmark-circle" text="IRS-compliant mileage log" />
              <BenefitItem icon="checkmark-circle" text="Tax deduction estimates" />
              <BenefitItem icon="checkmark-circle" text="Battery-efficient tracking" />
            </View>
            <Pressable
              style={styles.enableButton}
              onPress={handleEnableTracking}
              disabled={isLoading}
            >
              <Ionicons name="navigate" size={20} color="#FAFAFA" />
              <Text style={styles.enableButtonText}>
                {isLoading ? 'Checking...' : 'Enable Automatic Tracking'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Manual Mode Card (shown when permission denied) */}
        {permissionStatus === 'denied' && (
          <View style={styles.manualModeCard}>
            <View style={styles.manualModeIconContainer}>
              <Ionicons name="hand-left" size={32} color="#EAB308" />
            </View>
            <Text style={styles.manualModeTitle}>Manual Mode</Text>
            <Text style={styles.manualModeDescription}>
              Location permission was not granted. You can still log trips manually,
              but automatic tracking won't work.
            </Text>
            <View style={styles.manualModeButtons}>
              <Pressable style={styles.settingsButton} onPress={handleOpenSettings}>
                <Ionicons name="settings" size={18} color="#06B6D4" />
                <Text style={styles.settingsButtonText}>Open Settings</Text>
              </Pressable>
              <Pressable style={styles.manualEntryButton}>
                <Ionicons name="add-circle" size={18} color="#FAFAFA" />
                <Text style={styles.manualEntryButtonText}>Add Trip Manually</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Or Manual Entry Option */}
        {permissionStatus !== 'denied' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="create" size={20} color="#71717A" />
              </View>
              <Text style={styles.cardTitle}>Prefer Manual Entry?</Text>
            </View>
            <Text style={styles.cardSubtext}>
              You can also add trips manually without enabling location tracking
            </Text>
            <Pressable style={styles.cardLink}>
              <Text style={styles.cardLinkText}>Add trip manually</Text>
              <Ionicons name="chevron-forward" size={16} color="#06B6D4" />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Permission Explanation Modal */}
      <Modal
        visible={showPermissionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="location" size={56} color="#06B6D4" />
            </View>
            <Text style={styles.modalTitle}>Background Location Access</Text>
            <Text style={styles.modalDescription}>
              To automatically track your mileage while you deliver, Giglet needs
              "Always Allow" location permission.
            </Text>
            <View style={styles.modalBenefits}>
              <ModalBenefitItem
                icon="car-outline"
                title="Track miles automatically"
                description="No need to start/stop tracking manually"
              />
              <ModalBenefitItem
                icon="battery-half-outline"
                title="Battery efficient"
                description="Uses less than 5% battery per day"
              />
              <ModalBenefitItem
                icon="shield-checkmark-outline"
                title="Your privacy matters"
                description="Location data stays on your device"
              />
            </View>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalPrimaryButton}
                onPress={handleConfirmEnable}
              >
                <Text style={styles.modalPrimaryButtonText}>Enable Tracking</Text>
              </Pressable>
              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => setShowPermissionModal(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>Not Now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Mode Info Modal */}
      <Modal
        visible={showManualModeInfo}
        animationType="fade"
        transparent
        onRequestClose={() => setShowManualModeInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, { backgroundColor: '#422006' }]}>
              <Ionicons name="information-circle" size={56} color="#EAB308" />
            </View>
            <Text style={styles.modalTitle}>Location Permission Required</Text>
            <Text style={styles.modalDescription}>
              Without location permission, automatic mileage tracking isn't available.
              You can still use Giglet in manual mode.
            </Text>
            <Text style={styles.modalListTitle}>In manual mode, you can:</Text>
            <View style={styles.modalList}>
              <Text style={styles.modalListItem}>• Add trips manually</Text>
              <Text style={styles.modalListItem}>• View your mileage history</Text>
              <Text style={styles.modalListItem}>• Export tax reports</Text>
            </View>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalPrimaryButton} onPress={handleOpenSettings}>
                <Text style={styles.modalPrimaryButtonText}>Open Settings</Text>
              </Pressable>
              <Pressable style={styles.modalSecondaryButton} onPress={handleUseManualMode}>
                <Text style={styles.modalSecondaryButtonText}>Use Manual Mode</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function BenefitItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.benefitItem}>
      <Ionicons name={icon} size={20} color="#22C55E" />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function ModalBenefitItem({
  icon,
  title,
  description
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.modalBenefitItem}>
      <View style={styles.modalBenefitIcon}>
        <Ionicons name={icon} size={24} color="#06B6D4" />
      </View>
      <View style={styles.modalBenefitText}>
        <Text style={styles.modalBenefitTitle}>{title}</Text>
        <Text style={styles.modalBenefitDescription}>{description}</Text>
      </View>
    </View>
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
  // Enable Tracking Card
  enableCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
  },
  enableIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0E3A42',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  enableTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 12,
    textAlign: 'center',
  },
  enableDescription: {
    fontSize: 15,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
    color: '#FAFAFA',
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  // Tracking Active Card
  trackingActiveCard: {
    backgroundColor: '#0E3A42',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#06B6D4',
  },
  trackingActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  trackingActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  trackingActiveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
  trackingActiveSubtext: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  // Active Trip Card
  activeTripCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  activeTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripStateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tripStateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTripMiles: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 4,
  },
  activeTripDuration: {
    fontSize: 14,
    color: '#71717A',
  },
  endTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#27272A',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  endTripButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Manual Mode Card
  manualModeCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#422006',
    alignItems: 'center',
  },
  manualModeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#422006',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  manualModeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EAB308',
    marginBottom: 12,
  },
  manualModeDescription: {
    fontSize: 15,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  manualModeButtons: {
    width: '100%',
    gap: 12,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#27272A',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  settingsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#06B6D4',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3F3F46',
    paddingVertical: 14,
    borderRadius: 12,
  },
  manualEntryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  // Card styles (reused from dashboard)
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
  mileageAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#06B6D4',
    marginBottom: 4,
  },
  taxEstimate: {
    fontSize: 14,
    color: '#71717A',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#71717A',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#27272A',
  },
  noTripsText: {
    fontSize: 15,
    color: '#71717A',
    marginBottom: 4,
  },
  noTripsSubtext: {
    fontSize: 13,
    color: '#52525B',
  },
  tripsList: {
    gap: 12,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  tripItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripItemMiles: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  tripItemTime: {
    fontSize: 12,
    color: '#71717A',
  },
  tripItemTax: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0E3A42',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalBenefits: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  modalBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modalBenefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBenefitText: {
    flex: 1,
  },
  modalBenefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  modalBenefitDescription: {
    fontSize: 13,
    color: '#71717A',
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalPrimaryButton: {
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  modalSecondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#71717A',
  },
  modalListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  modalList: {
    alignSelf: 'flex-start',
    marginBottom: 24,
    gap: 6,
  },
  modalListItem: {
    fontSize: 14,
    color: '#A1A1AA',
  },
});
