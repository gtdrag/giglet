import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, AppState, AppStateStatus, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Region, Circle, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LogTipFAB } from '../../src/components/tips/LogTipFAB';
import { TipSizePicker } from '../../src/components/tips/TipSizePicker';
import { TipsToggle } from '../../src/components/tips/TipsToggle';
import { TipMarkersLayer } from '../../src/components/tips/TipMarkersLayer';
import { TipSizeFilter, TipFilterOption } from '../../src/components/tips/TipSizeFilter';
import { logTip, getTipsInViewport, TipSize, TipLog } from '../../src/services/tips';
import { useLocalSettingsStore } from '../../src/stores/localSettingsStore';

// Refresh interval: 15 minutes in milliseconds
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

// Location timeout in milliseconds (10 seconds)
const LOCATION_TIMEOUT_MS = 10000;

// Promise wrapper with timeout
const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
};

// Format relative time (e.g., "2 min ago", "Just now")
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}
import { ZoneDetailModal } from '../../src/components/ZoneDetailModal';
import { RecommendationBanner } from '../../src/components/RecommendationBanner';
import { getNearbyZones, getScoreColor, getScoreOpacity, ZoneScoreResponse, NearbyZone } from '../../src/services/zones';

interface LocationState {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const DEFAULT_LOCATION: LocationState = {
  latitude: 37.7749, // San Francisco default
  longitude: -122.4194,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const ZONE_RADIUS_METERS = 600;

// Calculate distance between two coordinates in meters (Haversine formula)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapPage() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zones, setZones] = useState<NearbyZone[]>([]);
  const mapRef = useRef<MapView>(null);

  // Zone analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ processed: 0, total: 25 });
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [relativeTime, setRelativeTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const appState = useRef(AppState.currentState);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedZoneData, setSelectedZoneData] = useState<ZoneScoreResponse | null>(null);
  const [selectedZoneCoords, setSelectedZoneCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Tip logging state
  const [tipPickerVisible, setTipPickerVisible] = useState(false);
  const [isSavingTip, setIsSavingTip] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // Tip markers layer state (Story 10-3)
  const [tipsLayerEnabled, setTipsLayerEnabled] = useState(false);
  const [viewportTips, setViewportTips] = useState<TipLog[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const tipsFetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tip filter state (Story 10-4)
  const { tipSizeFilter, loadSettings, setTipSizeFilter, isLoaded: settingsLoaded } = useLocalSettingsStore();

  useEffect(() => {
    requestLocationPermission();
    loadSettings(); // Load persisted filter setting
  }, []);

  // Update relative time display every minute
  useEffect(() => {
    if (!lastUpdated) return;

    // Update immediately
    setRelativeTime(formatRelativeTime(lastUpdated));

    // Update every minute
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(lastUpdated));
    }, 60000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Auto-refresh zones every 15 minutes when app is in foreground
  useEffect(() => {
    if (!location) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    const refreshInterval = setInterval(() => {
      // Only refresh if app is in foreground and not already analyzing
      if (appState.current === 'active' && !isAnalyzing && !isRefreshing) {
        handleRefresh();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(refreshInterval);
      subscription.remove();
    };
  }, [location, isAnalyzing, isRefreshing]);

  const loadZonesWithAnimation = async (lat: number, lng: number) => {
    setIsAnalyzing(true);
    setZones([]);
    setAnalysisProgress({ processed: 0, total: 25 });

    try {
      // Fetch all zones from API
      const allZones = await getNearbyZones(lat, lng);
      const total = allZones.length;

      // Animate zones appearing one by one (50ms delay between each)
      for (let i = 0; i < allZones.length; i++) {
        setZones((prev) => [...prev, allZones[i]]);
        setAnalysisProgress({ processed: i + 1, total });

        // Small delay for visual effect (faster than real geocoding)
        if (i < allZones.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      setIsAnalyzing(false);
      setLastUpdated(Date.now());
    } catch (error) {
      // Use warn instead of error to avoid red screen in dev mode
      console.warn('Failed to load zones:', error instanceof Error ? error.message : error);
      setIsAnalyzing(false);
      // Show empty zones - API may not be running
      setZones([]);
    }
  };

  const requestLocationPermission = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Enable location to see Focus Zones near you.');
        setHasLocationPermission(false);
        setLocation(DEFAULT_LOCATION);
        setIsLoading(false);
        loadZonesWithAnimation(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);
        return;
      }

      setHasLocationPermission(true);

      const currentLocation = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        LOCATION_TIMEOUT_MS,
        'Location request timed out'
      );

      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      setLocation(newLocation);
      setIsLoading(false);
      loadZonesWithAnimation(newLocation.latitude, newLocation.longitude);
    } catch (error) {
      console.warn('Location error:', error instanceof Error ? error.message : error);
      setErrorMsg('Using default location. Enable GPS for accurate results.');
      setLocation(DEFAULT_LOCATION);
      setIsLoading(false);
      loadZonesWithAnimation(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);
    }
  };

  // Manual refresh - called by refresh button and auto-refresh
  const handleRefresh = useCallback(async () => {
    if (!location || isAnalyzing || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const allZones = await getNearbyZones(location.latitude, location.longitude);
      setZones(allZones);
      setLastUpdated(Date.now());
    } catch (error) {
      // Use warn instead of error to avoid red screen in dev mode
      console.warn('Failed to refresh zones:', error instanceof Error ? error.message : error);
    } finally {
      setIsRefreshing(false);
    }
  }, [location, isAnalyzing, isRefreshing]);

  const centerOnUser = async () => {
    try {
      const currentLocation = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        LOCATION_TIMEOUT_MS,
        'Location request timed out'
      );

      const newRegion: Region = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      mapRef.current?.animateToRegion(newRegion, 500);
      setLocation(newRegion);
    } catch {
      // Fall back to default location if timeout or error
      mapRef.current?.animateToRegion(DEFAULT_LOCATION, 500);
    }
  };

  const handleZoneTap = useCallback((zone: NearbyZone) => {
    setModalVisible(true);
    setModalLoading(false);
    setSelectedZoneCoords({ lat: zone.latitude, lng: zone.longitude });

    // Use the zone data we already have - no need to fetch again
    // This ensures banner score matches modal score
    setSelectedZoneData({
      score: zone.score,
      label: zone.label,
      factors: zone.factors,
      weatherDescription: zone.weatherDescription,
      nearbyEvents: zone.nearbyEvents,
      calculatedAt: new Date().toISOString(),
      timezone: 'local',
      nextRefresh: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedZoneData(null);
    setSelectedZoneCoords(null);
  }, []);

  const handleBannerPress = useCallback((zone: NearbyZone) => {
    // Center the map on the recommended zone
    const newRegion: Region = {
      latitude: zone.latitude,
      longitude: zone.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    mapRef.current?.animateToRegion(newRegion, 500);

    // Also open the zone detail modal
    handleZoneTap(zone);
  }, [handleZoneTap]);

  const handleMapPress = useCallback((event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    // Find the closest zone within tap radius
    let closestZone: NearbyZone | null = null;
    let closestDistance = Infinity;

    for (const zone of zones) {
      const distance = getDistanceMeters(latitude, longitude, zone.latitude, zone.longitude);
      if (distance <= ZONE_RADIUS_METERS && distance < closestDistance) {
        closestDistance = distance;
        closestZone = zone;
      }
    }

    if (closestZone) {
      handleZoneTap(closestZone);
    }
  }, [zones, handleZoneTap]);

  // Tip logging handlers
  const handleOpenTipPicker = useCallback(async () => {
    // Check location permission first
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Location Required',
        'Location permission is required to log tips. This helps you remember where good tippers are.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant Permission',
            onPress: async () => {
              const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
              if (newStatus === 'granted') {
                setHasLocationPermission(true);
                setTipPickerVisible(true);
              }
            },
          },
        ]
      );
      return;
    }

    setTipPickerVisible(true);
  }, []);

  const handleTipSelect = useCallback(async (tipSize: TipSize) => {
    setIsSavingTip(true);

    try {
      // Get current location
      const currentLocation = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        LOCATION_TIMEOUT_MS,
        'Location request timed out'
      );

      // Log the tip
      await logTip({
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
        tipSize,
      });

      // Success haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Close picker and show success message
      setTipPickerVisible(false);
      Alert.alert('Tip logged!', `Saved ${tipSize === 'NONE' ? 'no tip' : tipSize} location.`);

      // Refresh tips layer if enabled (Story 10-3)
      if (tipsLayerEnabled && currentRegion) {
        fetchTipsInViewport(currentRegion);
      }
    } catch (error) {
      console.warn('Failed to log tip:', error instanceof Error ? error.message : error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to log tip. Please try again.');
    } finally {
      setIsSavingTip(false);
    }
  }, []);

  const handleCloseTipPicker = useCallback(() => {
    if (!isSavingTip) {
      setTipPickerVisible(false);
    }
  }, [isSavingTip]);

  // Fetch tips within the visible viewport (Story 10-3, 10-4)
  const fetchTipsInViewport = useCallback(async (region: Region, filterOverride?: TipFilterOption) => {
    if (!tipsLayerEnabled) return;

    setIsLoadingTips(true);
    try {
      const bounds = {
        minLat: region.latitude - region.latitudeDelta / 2,
        maxLat: region.latitude + region.latitudeDelta / 2,
        minLng: region.longitude - region.longitudeDelta / 2,
        maxLng: region.longitude + region.longitudeDelta / 2,
      };
      // Use filter override if provided, otherwise use current filter from store (Story 10-4)
      const activeFilter = filterOverride !== undefined ? filterOverride : tipSizeFilter;
      const response = await getTipsInViewport(bounds, {
        limit: 100,
        tipSize: activeFilter ?? undefined,
      });
      setViewportTips(response.tips);
    } catch (error) {
      console.warn('Failed to fetch tips:', error instanceof Error ? error.message : error);
    } finally {
      setIsLoadingTips(false);
    }
  }, [tipsLayerEnabled, tipSizeFilter]);

  // Handle map region change (debounced)
  const handleRegionChange = useCallback((region: Region) => {
    setCurrentRegion(region);

    // Debounce tip fetching to avoid excessive API calls
    if (tipsFetchDebounceRef.current) {
      clearTimeout(tipsFetchDebounceRef.current);
    }

    if (tipsLayerEnabled) {
      tipsFetchDebounceRef.current = setTimeout(() => {
        fetchTipsInViewport(region);
      }, 500); // 500ms debounce
    }
  }, [tipsLayerEnabled, fetchTipsInViewport]);

  // Handle tips layer toggle
  const handleTipsLayerToggle = useCallback((enabled: boolean) => {
    setTipsLayerEnabled(enabled);
    if (enabled && currentRegion) {
      // Fetch tips immediately when layer is enabled
      fetchTipsInViewport(currentRegion);
    } else if (!enabled) {
      // Clear tips when layer is disabled
      setViewportTips([]);
    }
  }, [currentRegion, fetchTipsInViewport]);

  // Refresh tips after logging a new tip
  const refreshTipsAfterLog = useCallback(() => {
    if (tipsLayerEnabled && currentRegion) {
      fetchTipsInViewport(currentRegion);
    }
  }, [tipsLayerEnabled, currentRegion, fetchTipsInViewport]);

  // Handle tip filter change (Story 10-4)
  const handleTipFilterChange = useCallback(async (newFilter: TipFilterOption) => {
    await setTipSizeFilter(newFilter);
    // Refresh tips with new filter if layer is enabled
    if (tipsLayerEnabled && currentRegion) {
      fetchTipsInViewport(currentRegion, newFilter);
    }
  }, [setTipSizeFilter, tipsLayerEnabled, currentRegion, fetchTipsInViewport]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Focus Zones</Text>
          <Text style={styles.subtitle}>Find the best areas to earn</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Focus Zones</Text>
        <Text style={styles.subtitle}>Tap a zone to see details</Text>
      </View>

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color="#FBBF24" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Recommendation Banner */}
      {location && zones.length > 0 && !isAnalyzing && (
        <RecommendationBanner
          zones={zones}
          userLat={location.latitude}
          userLng={location.longitude}
          onPress={handleBannerPress}
        />
      )}

      <View style={styles.mapContainer}>
        {location && (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={location}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            customMapStyle={darkMapStyle}
            onPress={handleMapPress}
            onRegionChangeComplete={handleRegionChange}
          >
            {/* Zone circles */}
            {zones.map((zone) => (
              <Circle
                key={`circle-${zone.id}`}
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={600} // 600 meters
                fillColor={getScoreColor(zone.score) + Math.round(getScoreOpacity(zone.score) * 255).toString(16).padStart(2, '0')}
                strokeColor={getScoreColor(zone.score)}
                strokeWidth={2}
              />
            ))}

            {/* Tip markers layer (Story 10-3) */}
            {tipsLayerEnabled && currentRegion && viewportTips.length > 0 && (
              <TipMarkersLayer tips={viewportTips} region={currentRegion} />
            )}
          </MapView>
        )}

        {/* Legend with timestamp and tips toggle */}
        <View style={styles.legendContainer}>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.legendText}>Hot</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
              <Text style={styles.legendText}>Busy</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
              <Text style={styles.legendText}>Moderate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Slow</Text>
            </View>
          </View>
          {relativeTime && !isAnalyzing && (
            <View style={styles.timestampContainer}>
              <Ionicons name="time-outline" size={12} color="#71717A" />
              <Text style={styles.timestampText}>{relativeTime}</Text>
            </View>
          )}
          {/* Tips layer toggle (Story 10-3) */}
          <TipsToggle
            enabled={tipsLayerEnabled}
            onToggle={handleTipsLayerToggle}
            isLoading={isLoadingTips}
            tipCount={viewportTips.length}
            disabled={isAnalyzing}
          />
          {/* Tip filter (Story 10-4) - show only when tips layer is enabled */}
          {tipsLayerEnabled && settingsLoaded && (
            <TipSizeFilter
              value={tipSizeFilter}
              onChange={handleTipFilterChange}
              disabled={isAnalyzing || isLoadingTips}
            />
          )}
        </View>

        {/* Bottom buttons container */}
        <View style={styles.bottomButtons}>
          {/* Log Tip FAB */}
          <LogTipFAB
            onPress={handleOpenTipPicker}
            disabled={isAnalyzing}
          />

          {/* Refresh button */}
          <TouchableOpacity
            style={[styles.mapButton, isRefreshing && styles.mapButtonDisabled]}
            onPress={handleRefresh}
            disabled={isRefreshing || isAnalyzing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#06B6D4" />
            ) : (
              <Ionicons name="refresh" size={24} color="#FAFAFA" />
            )}
          </TouchableOpacity>

          {/* Center on user button */}
          <TouchableOpacity style={styles.mapButton} onPress={centerOnUser}>
            <Ionicons name="locate" size={24} color="#FAFAFA" />
          </TouchableOpacity>
        </View>

        {/* Analyzing overlay */}
        {isAnalyzing && (
          <View style={styles.analyzingOverlay}>
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="small" color="#06B6D4" />
              <View style={styles.analyzingTextContainer}>
                <Text style={styles.analyzingTitle}>Analyzing zone data...</Text>
                <Text style={styles.analyzingSubtitle}>
                  Calculating optimal delivery areas ({analysisProgress.processed}/{analysisProgress.total})
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Zone Detail Modal */}
      <ZoneDetailModal
        visible={modalVisible}
        onClose={closeModal}
        data={selectedZoneData}
        isLoading={modalLoading}
        latitude={selectedZoneCoords?.lat}
        longitude={selectedZoneCoords?.lng}
      />

      {/* Tip Size Picker Modal */}
      <Modal
        visible={tipPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseTipPicker}
      >
        <View style={styles.tipModalOverlay}>
          <View style={styles.tipModalContent}>
            <TouchableOpacity
              style={styles.tipModalClose}
              onPress={handleCloseTipPicker}
              disabled={isSavingTip}
            >
              <Ionicons name="close" size={24} color="#71717A" />
            </TouchableOpacity>
            <TipSizePicker
              onSelect={handleTipSelect}
              disabled={isSavingTip}
              isLoading={isSavingTip}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Dark map style for consistency with app theme
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

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
  subtitle: {
    fontSize: 14,
    color: '#A1A1AA',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#A1A1AA',
    marginTop: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FEF3C7',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  map: {
    flex: 1,
  },
  legendContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    gap: 6,
  },
  legend: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  timestampContainer: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  timestampText: {
    fontSize: 11,
    color: '#71717A',
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 12,
  },
  mapButton: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  mapButtonDisabled: {
    opacity: 0.6,
  },
  analyzingOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 72,
  },
  analyzingCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  analyzingTextContainer: {
    flex: 1,
  },
  analyzingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  analyzingSubtitle: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  tipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  tipModalContent: {
    backgroundColor: '#09090B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#27272A',
  },
  tipModalClose: {
    alignSelf: 'flex-end',
    padding: 12,
    marginRight: 8,
  },
});
