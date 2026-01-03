import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NearbyZone, getScoreColor } from '../services/zones';

interface RecommendationBannerProps {
  zones: NearbyZone[];
  userLat: number;
  userLng: number;
  onPress: (zone: NearbyZone) => void;
}

// Factor keys to human-readable labels for the banner
const FACTOR_LABELS: Record<string, string> = {
  mealTimeBoost: 'meal time',
  peakHourBoost: 'peak hours',
  weekendBoost: 'weekend boost',
  weatherBoost: 'weather demand',
  eventBoost: 'event nearby',
  baseScore: 'high activity',
};

// Calculate distance between two coordinates in km (Haversine formula)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get the top contributing factor from a zone's factors
function getTopFactor(factors: NearbyZone['factors']): string {
  let topKey = 'baseScore';
  let topValue = 0;

  const entries = Object.entries(factors) as [keyof typeof factors, number][];
  for (const [key, value] of entries) {
    if (key !== 'baseScore' && value > topValue) {
      topValue = value;
      topKey = key;
    }
  }

  return FACTOR_LABELS[topKey] || 'high activity';
}

// Generate a human-readable zone name based on position relative to center
function getZoneName(zone: NearbyZone, userLat: number, userLng: number): string {
  const latDiff = zone.latitude - userLat;
  const lngDiff = zone.longitude - userLng;

  // Determine cardinal direction
  let direction = '';
  if (Math.abs(latDiff) > 0.005 || Math.abs(lngDiff) > 0.005) {
    if (latDiff > 0.005) direction += 'North';
    else if (latDiff < -0.005) direction += 'South';

    if (lngDiff > 0.005) direction += direction ? 'east' : 'East';
    else if (lngDiff < -0.005) direction += direction ? 'west' : 'West';
  }

  if (!direction) {
    return 'nearby zone';
  }

  // Calculate approximate distance for context
  const distKm = getDistanceKm(userLat, userLng, zone.latitude, zone.longitude);
  if (distKm < 1) {
    return `${direction} area`;
  } else if (distKm < 3) {
    return `${direction} zone`;
  } else {
    return `${direction} district`;
  }
}

export function RecommendationBanner({ zones, userLat, userLng, onPress }: RecommendationBannerProps) {
  if (!zones || zones.length === 0) {
    return null;
  }

  // Filter zones within reasonable distance (~15km, about 30 min at city speeds)
  const MAX_DISTANCE_KM = 15;
  const nearbyZones = zones.filter(zone =>
    getDistanceKm(userLat, userLng, zone.latitude, zone.longitude) <= MAX_DISTANCE_KM
  );

  if (nearbyZones.length === 0) {
    return null;
  }

  // Find the highest-scoring zone
  const bestZone = nearbyZones.reduce((best, zone) =>
    zone.score > best.score ? zone : best
  , nearbyZones[0]);

  // Check if user is already in the best zone (within ~600m, the zone radius)
  const distanceToBest = getDistanceKm(userLat, userLng, bestZone.latitude, bestZone.longitude);
  const isInBestZone = distanceToBest < 0.6; // 600 meters

  const scoreColor = getScoreColor(bestZone.score);
  const topFactor = getTopFactor(bestZone.factors);

  if (isInBestZone) {
    // User is already in the hot zone - tap to see details
    return (
      <Pressable
        style={({ pressed }) => [
          styles.container,
          styles.inZoneContainer,
          pressed && styles.pressed
        ]}
        onPress={() => onPress(bestZone)}
      >
        <View style={styles.content}>
          <Ionicons name="flame" size={20} color={scoreColor} />
          <Text style={styles.text}>
            You're in a hot zone!{' '}
            <Text style={[styles.score, { color: scoreColor }]}>{bestZone.score}</Text>
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#71717A" />
        </View>
      </Pressable>
    );
  }

  // Recommend heading to the best zone
  const zoneName = getZoneName(bestZone, userLat, userLng);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed
      ]}
      onPress={() => onPress(bestZone)}
    >
      <View style={styles.content}>
        <Ionicons name="navigate" size={20} color="#06B6D4" />
        <Text style={styles.text}>
          Head to <Text style={styles.zoneName}>{zoneName}</Text>
          <Text style={styles.reason}> · {topFactor}</Text>
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#71717A" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  inZoneContainer: {
    borderColor: '#22C55E40',
    backgroundColor: '#22C55E10',
  },
  pressed: {
    opacity: 0.8,
    backgroundColor: '#27272A',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: '#FAFAFA',
  },
  zoneName: {
    fontWeight: '600',
    color: '#06B6D4',
  },
  reason: {
    color: '#A1A1AA',
  },
  score: {
    fontWeight: '700',
  },
});
