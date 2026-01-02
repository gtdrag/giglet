import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { PlatformBreakdown } from '../services/earnings';

interface PlatformBreakdownChartProps {
  breakdown: PlatformBreakdown[];
  total: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  DOORDASH: '#FF3008',
  UBEREATS: '#06C167',
};

const PLATFORM_NAMES: Record<string, string> = {
  DOORDASH: 'DoorDash',
  UBEREATS: 'Uber Eats',
};

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

// SVG Donut Chart Component
interface DonutChartProps {
  data: { value: number; color: string }[];
  size: number;
  strokeWidth: number;
}

function DonutChart({ data, size, strokeWidth }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    // Show empty ring
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#27272A"
          strokeWidth={strokeWidth}
          fill="none"
        />
      </Svg>
    );
  }

  let accumulatedPercentage = 0;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${center}, ${center}`}>
        {data.map((segment, index) => {
          const percentage = segment.value / total;
          const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`;
          const strokeDashoffset = -circumference * accumulatedPercentage;

          accumulatedPercentage += percentage;

          if (segment.value === 0) return null;

          return (
            <Circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </G>
    </Svg>
  );
}

export function PlatformBreakdownChart({ breakdown, total }: PlatformBreakdownChartProps) {
  // Handle no data case
  if (!breakdown || breakdown.length === 0 || total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No earnings data to display</Text>
      </View>
    );
  }

  // Prepare chart data
  const chartData = breakdown.map((item) => ({
    value: item.total,
    color: PLATFORM_COLORS[item.platform] || '#A1A1AA',
  }));

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <DonutChart data={chartData} size={180} strokeWidth={24} />
        {/* Center label showing total */}
        <View style={styles.centerLabel}>
          <Text style={styles.centerTotal}>{formatCurrency(total)}</Text>
          <Text style={styles.centerSubtitle}>Total</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {breakdown.map((item) => (
          <View key={item.platform} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PLATFORM_COLORS[item.platform] || '#A1A1AA' }]} />
            <View style={styles.legendTextContainer}>
              <Text style={styles.legendPlatform}>{PLATFORM_NAMES[item.platform] || item.platform}</Text>
              <Text style={styles.legendAmount}>
                {formatCurrency(item.total)} ({formatPercentage(item.total, total)})
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartContainer: {
    position: 'relative',
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FAFAFA',
  },
  centerSubtitle: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  legend: {
    marginTop: 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendPlatform: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  legendAmount: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#71717A',
  },
});
