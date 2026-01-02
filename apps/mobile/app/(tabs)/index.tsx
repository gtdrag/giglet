import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

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

export default function MapPage() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

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
        setIsLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      setErrorMsg('Unable to get location. Please try again.');
      setLocation(DEFAULT_LOCATION);
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
        <Text style={styles.subtitle}>Find the best areas to earn</Text>
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
          />
        )}

        {/* Center on user button */}
        <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={24} color="#FAFAFA" />
        </TouchableOpacity>

        {/* Coming soon overlay for zones */}
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Zone data coming soon</Text>
        </View>
      </View>
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
  comingSoonBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(24, 24, 27, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#A1A1AA',
  },
});
