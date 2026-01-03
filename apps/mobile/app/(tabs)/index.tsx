import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Region, Circle, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ZoneDetailModal } from '../../src/components/ZoneDetailModal';
import { getZoneScore, getScoreColor, getScoreOpacity, ZoneScoreResponse } from '../../src/services/zones';

interface LocationState {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface ZoneCircle {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  label: string;
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

// Small delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Check if a coordinate is on land (not water) using reverse geocoding
async function isLandCoordinate(lat: number, lng: number): Promise<boolean> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results.length > 0) {
      const result = results[0];

      // If we have a street address, it's definitely land (even if name has "Bay" etc)
      if (result.street && result.streetNumber) {
        return true;
      }

      // No street address - check if name indicates water
      const nameLower = (result.name || '').toLowerCase();
      const isWaterName = nameLower === 'san francisco bay' ||
                          nameLower === 'pacific ocean' ||
                          nameLower.includes(' ocean') ||
                          (nameLower.includes('bay') && !nameLower.includes('blvd') && !nameLower.includes('st') && !nameLower.includes('ave'));

      if (isWaterName) {
        return false;
      }

      // Has some location info = land
      return !!(result.district || result.postalCode || result.name);
    }
    return false;
  } catch {
    // Default to showing zone if geocoding fails (rate limit, network error, etc)
    return true;
  }
}

// Generate sample zones around a location, filtering out water areas
async function generateSampleZones(lat: number, lng: number): Promise<ZoneCircle[]> {
  const candidates: { lat: number; lng: number; i: number; j: number }[] = [];
  const gridSize = 2;
  const stepDegrees = 0.015; // ~1.5km

  // Generate all candidate coordinates
  for (let i = -gridSize; i <= gridSize; i++) {
    for (let j = -gridSize; j <= gridSize; j++) {
      candidates.push({
        lat: lat + i * stepDegrees,
        lng: lng + j * stepDegrees,
        i,
        j,
      });
    }
  }

  // Check coordinates sequentially with delay to avoid rate limiting
  const zones: ZoneCircle[] = [];
  for (const candidate of candidates) {
    const isLand = await isLandCoordinate(candidate.lat, candidate.lng);
    await delay(100); // 100ms delay between requests

    if (!isLand) continue;

    // Vary scores based on position (center is hotter)
    const distFromCenter = Math.sqrt(candidate.i * candidate.i + candidate.j * candidate.j);
    const baseScore = Math.max(20, 85 - distFromCenter * 15);
    const variation = Math.floor(Math.random() * 20) - 10;
    const score = Math.max(0, Math.min(100, baseScore + variation));

    zones.push({
      id: `zone_${candidate.i}_${candidate.j}`,
      latitude: candidate.lat,
      longitude: candidate.lng,
      score,
      label: score >= 80 ? 'Hot' : score >= 60 ? 'Busy' : score >= 40 ? 'Moderate' : score >= 20 ? 'Slow' : 'Dead',
    });
  }

  return zones;
}

export default function MapPage() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zones, setZones] = useState<ZoneCircle[]>([]);
  const mapRef = useRef<MapView>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedZoneData, setSelectedZoneData] = useState<ZoneScoreResponse | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Enable location to see Focus Zones near you.');
        setLocation(DEFAULT_LOCATION);
        const generatedZones = await generateSampleZones(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);
        setZones(generatedZones);
        setIsLoading(false);
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
      const generatedZones = await generateSampleZones(newLocation.latitude, newLocation.longitude);
      setZones(generatedZones);
    } catch (error) {
      setErrorMsg('Unable to get location. Please try again.');
      setLocation(DEFAULT_LOCATION);
      const generatedZones = await generateSampleZones(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);
      setZones(generatedZones);
    } finally {
      setIsLoading(false);
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

  const handleZoneTap = useCallback(async (zone: ZoneCircle) => {
    setModalVisible(true);
    setModalLoading(true);
    setSelectedZoneData(null);

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
  }, []);

  const handleMapPress = useCallback((event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    // Find the closest zone within tap radius
    let closestZone: ZoneCircle | null = null;
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
      </View>

      {/* Zone Detail Modal */}
      <ZoneDetailModal
        visible={modalVisible}
        onClose={closeModal}
        data={selectedZoneData}
        isLoading={modalLoading}
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
});
