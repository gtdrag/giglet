/**
 * TipMarker Component
 * Story 10-3: Tip Locations Map Layer
 *
 * Displays a colored marker on the map for a logged tip.
 * Shows a callout with tip size, date, and reverse-geocoded address on tap.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { TipLog, getTipSizeColor, getTipSizeLabel } from '../../services/tips';

// Address cache to avoid repeated reverse geocoding calls
const addressCache = new Map<string, string>();

/**
 * Generate a cache key for a lat/lng coordinate
 */
const getCoordCacheKey = (lat: number, lng: number): string => {
  // Round to 4 decimal places for caching (about 11m accuracy)
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
};

/**
 * Reverse geocode a coordinate to get a human-readable address
 */
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const cacheKey = getCoordCacheKey(lat, lng);
  const cached = addressCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    if (results.length > 0) {
      const addr = results[0];
      const parts: string[] = [];

      if (addr.street) {
        parts.push(addr.street);
      } else if (addr.name) {
        parts.push(addr.name);
      }

      if (addr.city) {
        parts.push(addr.city);
      }

      if (addr.region) {
        parts.push(addr.region);
      }

      const address = parts.join(', ') || 'Unknown location';
      addressCache.set(cacheKey, address);
      return address;
    }

    return 'Unknown location';
  } catch (error) {
    console.warn('[TipMarker] Reverse geocode failed:', error);
    return 'Unknown location';
  }
};

/**
 * Format date for display in callout
 */
const formatTipDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

interface TipMarkerProps {
  tip: TipLog;
  onPress?: () => void;
}

export function TipMarker({ tip, onPress }: TipMarkerProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const markerColor = getTipSizeColor(tip.tipSize);
  const tipLabel = getTipSizeLabel(tip.tipSize);
  const dateStr = formatTipDate(tip.createdAt);

  // Fetch address when callout is about to show (on marker press)
  const handleCalloutPress = useCallback(async () => {
    if (address === null && !isLoadingAddress) {
      setIsLoadingAddress(true);
      try {
        const addr = await reverseGeocode(tip.lat, tip.lng);
        setAddress(addr);
      } catch {
        setAddress('Unknown location');
      } finally {
        setIsLoadingAddress(false);
      }
    }
    onPress?.();
  }, [address, isLoadingAddress, tip.lat, tip.lng, onPress]);

  // Fetch address on marker press (before callout shows)
  const handleMarkerPress = useCallback(async () => {
    if (address === null && !isLoadingAddress) {
      setIsLoadingAddress(true);
      try {
        const addr = await reverseGeocode(tip.lat, tip.lng);
        setAddress(addr);
      } catch {
        setAddress('Unknown location');
      } finally {
        setIsLoadingAddress(false);
      }
    }
  }, [address, isLoadingAddress, tip.lat, tip.lng]);

  return (
    <Marker
      coordinate={{ latitude: tip.lat, longitude: tip.lng }}
      pinColor={markerColor}
      onPress={handleMarkerPress}
      tracksViewChanges={false}
    >
      <Callout onPress={handleCalloutPress} tooltip>
        <View style={styles.calloutContainer}>
          <View style={styles.calloutHeader}>
            <View style={[styles.tipBadge, { backgroundColor: markerColor }]}>
              <Text style={styles.tipBadgeText}>
                {tip.tipSize === 'NONE' ? 'No Tip' : `$${tipLabel}`}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>{dateStr}</Text>
          <View style={styles.addressContainer}>
            {isLoadingAddress ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#71717A" />
                <Text style={styles.loadingText}>Loading address...</Text>
              </View>
            ) : (
              <Text style={styles.addressText} numberOfLines={2}>
                {address || 'Tap to load address'}
              </Text>
            )}
          </View>
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  calloutContainer: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tipBadgeText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    color: '#A1A1AA',
    fontSize: 12,
    marginBottom: 8,
  },
  addressContainer: {
    minHeight: 32,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#71717A',
    fontSize: 12,
  },
  addressText: {
    color: '#FAFAFA',
    fontSize: 13,
    lineHeight: 18,
  },
});

// Export the address cache clear function for testing
export const clearTipAddressCache = (): void => {
  addressCache.clear();
};
