import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Region, Circle, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ZoneDetailModal } from '../../src/components/ZoneDetailModal';
import { getNearbyZones, getZoneScore, getScoreColor, getScoreOpacity, ZoneScoreResponse, NearbyZone } from '../../src/services/zones';

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

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedZoneData, setSelectedZoneData] = useState<ZoneScoreResponse | null>(null);
  const [selectedZoneCoords, setSelectedZoneCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

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
    } catch (error) {
      console.error('Failed to load zones:', error);
      setIsAnalyzing(false);
    }
  };

  const requestLocationPermission = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Enable location to see Focus Zones near you.');
        setLocation(DEFAULT_LOCATION);
        setIsLoading(false);
        loadZonesWithAnimation(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

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
      setErrorMsg('Unable to get location. Please try again.');
      setLocation(DEFAULT_LOCATION);
      setIsLoading(false);
      loadZonesWithAnimation(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);
    }
  };

  const centerOnUser = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion: Region = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      mapRef.current?.animateToRegion(newRegion, 500);
      setLocation(newRegion);
    } catch {
      // Silently fail - user can try again
    }
  };

  const handleZoneTap = useCallback(async (zone: NearbyZone) => {
    setModalVisible(true);
    setModalLoading(true);
    setSelectedZoneData(null);
    setSelectedZoneCoords({ lat: zone.latitude, lng: zone.longitude });

    try {
      const data = await getZoneScore(zone.latitude, zone.longitude);
      setSelectedZoneData(data);
    } catch (error) {
      console.error('Failed to fetch zone score:', error);
      // Show error state in modal
      setSelectedZoneData(null);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedZoneData(null);
    setSelectedZoneCoords(null);
  }, []);

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
          </MapView>
        )}

        {/* Legend */}
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

        {/* Center on user button */}
        <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={24} color="#FAFAFA" />
        </TouchableOpacity>

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
  legend: {
    position: 'absolute',
    top: 16,
    left: 16,
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
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
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
});
