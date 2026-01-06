/**
 * YTDSummaryCard - Displays year-to-date mileage and estimated tax deduction
 * with an info icon for IRS rate explanation
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IRS_MILEAGE_RATE, formatTaxDeduction } from '../constants/tax';

interface YTDSummaryCardProps {
  yearMiles: number;
  yearTrips: number;
  isLoading?: boolean;
  onInfoPress?: () => void;
}

export const YTDSummaryCard: React.FC<YTDSummaryCardProps> = ({
  yearMiles,
  yearTrips,
  isLoading = false,
  onInfoPress,
}) => {
  const formatMiles = (miles: number): string => miles.toFixed(1);
  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#06B6D4" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="receipt" size={20} color="#22C55E" />
        </View>
        <Text style={styles.title}>YTD Tax Summary</Text>
        {onInfoPress && (
          <Pressable
            style={styles.infoButton}
            onPress={onInfoPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Learn about IRS mileage rate"
            accessibilityRole="button"
          >
            <Ionicons name="information-circle-outline" size={20} color="#71717A" />
          </Pressable>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.ytdLabel}>YTD {currentYear}</Text>
          <Text style={styles.milesValue}>{formatMiles(yearMiles)} mi</Text>
          <Text style={styles.tripCount}>
            {yearTrips} trip{yearTrips !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Text style={styles.deductionLabel}>Est. Deduction</Text>
          <Text style={styles.deductionValue}>{formatTaxDeduction(yearMiles)}</Text>
          <Text style={styles.rateNote}>${IRS_MILEAGE_RATE}/mile</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A2E05',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FAFAFA',
    flex: 1,
  },
  infoButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: '#27272A',
    marginHorizontal: 16,
  },
  ytdLabel: {
    fontSize: 12,
    color: '#71717A',
    marginBottom: 4,
  },
  milesValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#06B6D4',
    marginBottom: 4,
  },
  tripCount: {
    fontSize: 12,
    color: '#52525B',
  },
  deductionLabel: {
    fontSize: 12,
    color: '#71717A',
    marginBottom: 4,
  },
  deductionValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  rateNote: {
    fontSize: 12,
    color: '#52525B',
  },
});

export default YTDSummaryCard;
