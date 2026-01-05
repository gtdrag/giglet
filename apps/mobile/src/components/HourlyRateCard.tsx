import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { getHourlyRate, type EarningsPeriod, type HourlyRateData } from '../services/earnings';
import { useTabNavigationStore } from '../stores/tabNavigationStore';

interface HourlyRateCardProps {
  period: EarningsPeriod;
  refreshTrigger?: number; // Increment to trigger refresh
}

// Format hourly rate
function formatRate(rate: number): string {
  return `$${rate.toFixed(2)}/hr`;
}

// Format hours
function formatHours(hours: number): string {
  if (hours === 0) return '0 hrs';
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  return `${hours.toFixed(1)} hrs`;
}

export function HourlyRateCard({ period, refreshTrigger }: HourlyRateCardProps) {
  const setCurrentPage = useTabNavigationStore((state) => state.setCurrentPage);
  const [hourlyData, setHourlyData] = useState<HourlyRateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHourlyRate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const timezone = Localization.getCalendars()[0]?.timeZone || 'UTC';
      const result = await getHourlyRate(period, timezone);
      setHourlyData(result);
    } catch (err) {
      setError('Failed to load hourly rate');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchHourlyRate();
  }, [fetchHourlyRate, refreshTrigger]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#71717A" />
      </View>
    );
  }

  // Error state - show nothing
  if (error) {
    return null;
  }

  // No data case - encourage user to enable mileage tracking
  if (!hourlyData?.hasData) {
    return (
      <Pressable
        style={styles.noDataContainer}
        onPress={() => setCurrentPage('mileage')}
      >
        <View style={styles.noDataIconContainer}>
          <Ionicons name="speedometer-outline" size={16} color="#71717A" />
        </View>
        <View style={styles.noDataTextContainer}>
          <Text style={styles.noDataText}>
            Enable mileage tracking to see hourly rate
          </Text>
          <Text style={styles.noDataHint}>
            Tap to set up tracking
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#71717A" />
      </Pressable>
    );
  }

  // Has hourly rate data
  return (
    <View style={styles.container}>
      <View style={styles.rateContainer}>
        <View style={styles.rateIconContainer}>
          <Ionicons name="speedometer" size={18} color="#06B6D4" />
        </View>
        <View style={styles.rateContent}>
          <Text style={styles.rateValue}>{formatRate(hourlyData.hourlyRate)}</Text>
          <Text style={styles.rateLabel}>Effective Rate</Text>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            ${hourlyData.totalEarnings.toFixed(0)} / {formatHours(hourlyData.totalHours)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  rateIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateContent: {
    flex: 1,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#06B6D4',
  },
  rateLabel: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 1,
  },
  statsContainer: {
    backgroundColor: '#3F3F46',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statsText: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  noDataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    gap: 10,
  },
  noDataIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataTextContainer: {
    flex: 1,
  },
  noDataText: {
    fontSize: 13,
    color: '#A1A1AA',
  },
  noDataHint: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
});
