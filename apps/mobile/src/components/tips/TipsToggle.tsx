/**
 * TipsToggle Component
 * Story 10-3: Tip Locations Map Layer
 *
 * A toggle button to show/hide the tip markers layer on the map.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TipsToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
  tipCount?: number;
  disabled?: boolean;
}

export function TipsToggle({
  enabled,
  onToggle,
  isLoading = false,
  tipCount,
  disabled = false,
}: TipsToggleProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        enabled && styles.containerActive,
        disabled && styles.containerDisabled,
      ]}
      onPress={() => onToggle(!enabled)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Ionicons
          name={enabled ? 'pricetag' : 'pricetag-outline'}
          size={16}
          color={enabled ? '#10B981' : '#A1A1AA'}
        />
        <Text style={[styles.text, enabled && styles.textActive]}>
          My Tips
        </Text>
        {isLoading ? (
          <ActivityIndicator size="small" color="#10B981" style={styles.loader} />
        ) : tipCount !== undefined && enabled ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tipCount}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  containerActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  textActive: {
    color: '#10B981',
  },
  loader: {
    marginLeft: 4,
  },
  badge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  badgeText: {
    color: '#FAFAFA',
    fontSize: 11,
    fontWeight: '600',
  },
});
