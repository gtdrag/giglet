/**
 * TipSizeFilter Component
 * Story 10-4: Tip Filter Controls
 *
 * Filter control to select minimum tip size for map display.
 * Uses chip-style buttons for selection.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TipSize, getTipSizeColor } from '../../services/tips';

export type TipFilterOption = TipSize | null; // null = show all

interface FilterOption {
  value: TipFilterOption;
  label: string;
  description: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: null, label: 'All', description: 'Show all tips' },
  { value: 'SMALL', label: 'S+', description: 'Small and above' },
  { value: 'MEDIUM', label: 'M+', description: 'Medium and above' },
  { value: 'LARGE', label: 'L+', description: 'Large and above' },
  { value: 'XLARGE', label: 'XL+', description: 'XL and above' },
  { value: 'XXLARGE', label: 'XXL', description: 'XXL only' },
];

interface TipSizeFilterProps {
  /** Currently selected filter value (null = show all) */
  value: TipFilterOption;
  /** Called when filter selection changes */
  onChange: (value: TipFilterOption) => void;
  /** Disable the filter control */
  disabled?: boolean;
}

/**
 * TipSizeFilter - Chip-style filter for minimum tip size
 *
 * Allows users to filter displayed tips by minimum size:
 * - All: Show all tips
 * - S+: SMALL and above
 * - M+: MEDIUM and above
 * - L+: LARGE and above
 * - XL+: XLARGE and above
 * - XXL: XXLARGE only
 */
export function TipSizeFilter({ value, onChange, disabled = false }: TipSizeFilterProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="filter" size={12} color="#71717A" />
        <Text style={styles.headerText}>Filter</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipContainer}
      >
        {FILTER_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const chipColor = option.value ? getTipSizeColor(option.value) : '#06B6D4';

          return (
            <TouchableOpacity
              key={option.label}
              style={[
                styles.chip,
                isSelected && { backgroundColor: chipColor + '33', borderColor: chipColor },
                disabled && styles.chipDisabled,
              ]}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && { color: chipColor },
                  disabled && styles.chipTextDisabled,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  headerText: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
    backgroundColor: 'transparent',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  chipTextDisabled: {
    color: '#52525B',
  },
});

export { FILTER_OPTIONS };
