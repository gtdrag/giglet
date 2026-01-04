import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { getComparison, type EarningsPeriod, type PeriodComparison } from '../services/earnings';

interface PeriodComparisonCardProps {
  period: EarningsPeriod;
  refreshTrigger?: number; // Increment to trigger refresh
}

// Period labels for comparison
const PREVIOUS_PERIOD_LABELS: Record<EarningsPeriod, string> = {
  today: 'yesterday',
  week: 'last week',
  month: 'last month',
  year: 'last year',
};

// Format currency
function formatCurrency(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

// Format percentage
function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent}%`;
}

export function PeriodComparisonCard({ period, refreshTrigger }: PeriodComparisonCardProps) {
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const timezone = Localization.getCalendars()[0]?.timeZone || 'UTC';
      const result = await getComparison(period, timezone);
      setComparison(result);
    } catch (err) {
      setError('Failed to load comparison');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison, refreshTrigger]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#71717A" />
      </View>
    );
  }

  // Error state - show nothing
  if (error || !comparison) {
    return null;
  }

  // No data case - neither current nor previous period has data
  if (!comparison.hasPreviousData && comparison.current.deliveryCount === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noDataContainer}>
          <Ionicons name="analytics-outline" size={16} color="#71717A" />
          <Text style={styles.noDataText}>
            Comparisons available after more deliveries
          </Text>
        </View>
      </View>
    );
  }

  // No previous data but has current data
  if (!comparison.hasPreviousData && comparison.current.deliveryCount > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noDataContainer}>
          <Ionicons name="analytics-outline" size={16} color="#71717A" />
          <Text style={styles.noDataText}>
            No data from {PREVIOUS_PERIOD_LABELS[period]} to compare
          </Text>
        </View>
      </View>
    );
  }

  // Has comparison data
  const isPositive = comparison.change.earnings >= 0;
  const isNeutral = comparison.change.earnings === 0;
  const changeColor = isNeutral ? '#71717A' : isPositive ? '#22C55E' : '#EF4444';
  const arrowIcon = isNeutral ? 'remove' : isPositive ? 'arrow-up' : 'arrow-down';

  return (
    <View style={styles.container}>
      <View style={styles.comparisonRow}>
        <View style={[styles.changeIndicator, { backgroundColor: `${changeColor}15` }]}>
          <Ionicons name={arrowIcon} size={14} color={changeColor} />
        </View>
        <Text style={styles.comparisonText}>
          <Text style={[styles.changeAmount, { color: changeColor }]}>
            {formatCurrency(comparison.change.earnings)}
          </Text>
          <Text style={styles.percentText}>
            {' '}({formatPercent(comparison.change.earningsPercent)})
          </Text>
          <Text style={styles.vsText}> vs {PREVIOUS_PERIOD_LABELS[period]}</Text>
        </Text>
      </View>

      {/* Delivery count change */}
      {comparison.change.deliveries !== 0 && (
        <Text style={styles.deliveriesChange}>
          {comparison.change.deliveries > 0 ? '+' : ''}
          {comparison.change.deliveries} deliveries
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonText: {
    flex: 1,
    flexDirection: 'row',
  },
  changeAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  percentText: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  vsText: {
    fontSize: 14,
    color: '#71717A',
  },
  deliveriesChange: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 4,
    marginLeft: 32,
  },
  noDataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noDataText: {
    fontSize: 13,
    color: '#71717A',
  },
});
