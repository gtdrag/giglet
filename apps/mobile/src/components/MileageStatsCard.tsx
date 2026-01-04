/**
 * MileageStatsCard - Displays mileage statistics for a specific period
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTaxDeduction } from '../constants/tax';

export type PeriodType = 'day' | 'week' | 'month' | 'year';

interface MileageStatsCardProps {
  period: PeriodType;
  miles: number;
  tripCount: number;
  isLoading?: boolean;
  isSelected?: boolean;
}

const periodLabels: Record<PeriodType, string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

const periodIcons: Record<PeriodType, keyof typeof Ionicons.glyphMap> = {
  day: 'today-outline',
  week: 'calendar-outline',
  month: 'calendar',
  year: 'analytics-outline',
};

export const MileageStatsCard: React.FC<MileageStatsCardProps> = ({
  period,
  miles,
  tripCount,
  isLoading = false,
  isSelected = false,
}) => {
  const formatMiles = (m: number): string => m.toFixed(1);

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#06B6D4" />
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Ionicons
              name={periodIcons[period]}
              size={16}
              color={isSelected ? '#06B6D4' : '#71717A'}
            />
            <Text style={[styles.periodLabel, isSelected && styles.periodLabelSelected]}>
              {periodLabels[period]}
            </Text>
          </View>
          <Text style={[styles.milesValue, isSelected && styles.milesValueSelected]}>
            {formatMiles(miles)} mi
          </Text>
          <Text style={styles.taxEstimate}>
            {formatTaxDeduction(miles)}
          </Text>
          <Text style={styles.tripCount}>
            {tripCount} trip{tripCount !== 1 ? 's' : ''}
          </Text>
        </>
      )}
    </View>
  );
};

/**
 * Compact version of the stats card for horizontal scroll
 */
export const MileageStatsCardCompact: React.FC<MileageStatsCardProps> = ({
  period,
  miles,
  tripCount,
  isLoading = false,
  isSelected = false,
}) => {
  const formatMiles = (m: number): string => m.toFixed(1);

  return (
    <View style={[styles.cardCompact, isSelected && styles.cardCompactSelected]}>
      {isLoading ? (
        <ActivityIndicator size="small" color="#06B6D4" />
      ) : (
        <>
          <Text style={[styles.periodLabelCompact, isSelected && styles.periodLabelCompactSelected]}>
            {periodLabels[period]}
          </Text>
          <Text style={[styles.milesValueCompact, isSelected && styles.milesValueCompactSelected]}>
            {formatMiles(miles)} mi
          </Text>
          <Text style={styles.taxEstimateCompact}>
            {formatTaxDeduction(miles)}
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Full card styles
  card: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    minWidth: 140,
  },
  cardSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#0E3A42',
  },
  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717A',
  },
  periodLabelSelected: {
    color: '#06B6D4',
  },
  milesValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 4,
  },
  milesValueSelected: {
    color: '#06B6D4',
  },
  taxEstimate: {
    fontSize: 13,
    color: '#22C55E',
    marginBottom: 4,
  },
  tripCount: {
    fontSize: 12,
    color: '#52525B',
  },
  // Compact card styles
  cardCompact: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    minWidth: 100,
    alignItems: 'center',
  },
  cardCompactSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#0E3A42',
  },
  periodLabelCompact: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
    marginBottom: 4,
  },
  periodLabelCompactSelected: {
    color: '#06B6D4',
  },
  milesValueCompact: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  milesValueCompactSelected: {
    color: '#06B6D4',
  },
  taxEstimateCompact: {
    fontSize: 11,
    color: '#22C55E',
  },
});

export default MileageStatsCard;
