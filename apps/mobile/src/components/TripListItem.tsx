/**
 * TripListItem - Displays a single trip in the trip history list
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CompletedTrip } from '../services/locationTracking';
import { formatTaxDeduction } from '../constants/tax';
import {
  formatTripDate,
  formatTripTime,
  formatTimeRange,
} from '../utils/tripFormatting';

// Re-export formatting functions for backward compatibility
export { formatTripDate, formatTripTime, formatTimeRange };

interface TripListItemProps {
  trip: CompletedTrip;
  onPress: (trip: CompletedTrip) => void;
  /** Number of linked deliveries for this trip (0 or undefined = no linked deliveries) */
  deliveryCount?: number;
}

export const TripListItem: React.FC<TripListItemProps> = ({ trip, onPress, deliveryCount }) => {
  const handlePress = () => {
    onPress(trip);
  };

  const hasLinkedDeliveries = deliveryCount !== undefined && deliveryCount > 0;

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.iconContainer}>
        <Ionicons name="location" size={18} color="#06B6D4" />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.date}>{formatTripDate(trip.startedAt)}</Text>
          {hasLinkedDeliveries && (
            <View style={styles.deliveryBadge}>
              <Ionicons name="bag-handle" size={10} color="#06B6D4" />
              {deliveryCount > 1 && (
                <Text style={styles.deliveryBadgeText}>{deliveryCount}</Text>
              )}
            </View>
          )}
          {trip.isManual && (
            <View style={styles.manualBadge}>
              <Ionicons name="create" size={10} color="#EAB308" />
              <Text style={styles.manualBadgeText}>Manual</Text>
            </View>
          )}
        </View>
        <Text style={styles.timeRange}>
          {formatTimeRange(trip.startedAt, trip.endedAt)}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={styles.miles}>{trip.miles.toFixed(1)} mi</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.taxDeduction}>{formatTaxDeduction(trip.miles)}</Text>
        </View>
      </View>
      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={18} color="#52525B" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0E3A42',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  manualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#422006',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#EAB308',
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0E3A42',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deliveryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#06B6D4',
  },
  timeRange: {
    fontSize: 13,
    color: '#71717A',
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miles: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06B6D4',
  },
  separator: {
    fontSize: 14,
    color: '#52525B',
    marginHorizontal: 8,
  },
  taxDeduction: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
  },
  chevronContainer: {
    marginLeft: 8,
  },
});

export default TripListItem;
