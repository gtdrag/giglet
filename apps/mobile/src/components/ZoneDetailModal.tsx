import { useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Linking, Platform, Alert, ScrollView, Animated, PanResponder, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ZoneScoreFactors {
  mealTimeBoost: number;
  peakHourBoost: number;
  weekendBoost: number;
  weatherBoost: number;
  eventBoost: number;
  baseScore: number;
}

interface NearbyEvent {
  name: string;
  venue: string;
  startsIn: string;
}

interface ZoneDetailData {
  score: number;
  label: string;
  factors: ZoneScoreFactors;
  weatherDescription?: string;
  nearbyEvents?: NearbyEvent[];
}

interface ZoneDetailModalProps {
  visible: boolean;
  onClose: () => void;
  data: ZoneDetailData | null;
  isLoading?: boolean;
  latitude?: number;
  longitude?: number;
}

// Score thresholds for colors
const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22C55E'; // Green - Hot
  if (score >= 60) return '#EAB308'; // Yellow - Busy
  if (score >= 40) return '#F97316'; // Orange - Moderate
  if (score >= 20) return '#EF4444'; // Red - Slow
  return '#6B7280'; // Gray - Dead
};

// Factor configuration for display
const FACTOR_CONFIG = {
  mealTimeBoost: {
    icon: 'restaurant' as const,
    getLabel: (score: number) => {
      if (score >= 80) return 'Dinner rush';
      if (score >= 60) return 'Lunch time';
      if (score >= 40) return 'Breakfast hours';
      return 'Off-peak hours';
    },
  },
  peakHourBoost: {
    icon: 'time' as const,
    getLabel: (score: number) => {
      if (score >= 80) return 'Peak delivery hours';
      if (score >= 50) return 'Moderate activity';
      return 'Slow period';
    },
  },
  weekendBoost: {
    icon: 'calendar' as const,
    getLabel: (score: number) => {
      if (score >= 80) return 'Weekend boost';
      if (score >= 70) return 'Friday evening';
      return 'Weekday';
    },
  },
  weatherBoost: {
    icon: 'cloud' as const,
    getLabel: (score: number, description?: string) => {
      if (description && description !== 'Weather unavailable') {
        // Capitalize first letter
        return description.charAt(0).toUpperCase() + description.slice(1);
      }
      if (score >= 60) return 'Bad weather driving demand';
      if (score >= 40) return 'Light weather impact';
      return 'Clear weather';
    },
  },
  eventBoost: {
    icon: 'ticket' as const,
    getLabel: (score: number, _desc?: string, events?: NearbyEvent[]) => {
      if (events && events.length > 0) {
        return `${events[0].name} (${events[0].startsIn})`;
      }
      if (score >= 50) return 'Event nearby';
      return 'No major events';
    },
  },
};

// Get impact level for a factor score
const getImpactLevel = (score: number): 'high' | 'medium' | 'low' => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const getImpactColor = (impact: 'high' | 'medium' | 'low'): string => {
  switch (impact) {
    case 'high':
      return '#22C55E';
    case 'medium':
      return '#EAB308';
    case 'low':
      return '#6B7280';
  }
};

export function ZoneDetailModal({ visible, onClose, data, isLoading, latitude, longitude }: ZoneDetailModalProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward gestures
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If dragged more than 100px down or with velocity, dismiss
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const openDirections = () => {
    if (!latitude || !longitude) return;

    const destination = `${latitude},${longitude}`;

    if (Platform.OS === 'ios') {
      // On iOS, offer choice between Apple Maps and Google Maps
      Alert.alert(
        'Get Directions',
        'Choose your maps app',
        [
          {
            text: 'Apple Maps',
            onPress: () => Linking.openURL(`maps://?daddr=${destination}`),
          },
          {
            text: 'Google Maps',
            onPress: () => Linking.openURL(`comgooglemaps://?daddr=${destination}&directionsmode=driving`).catch(() => {
              // Google Maps not installed, open in browser
              Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
            }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // On Android, open Google Maps directly
      Linking.openURL(`google.navigation:q=${destination}`).catch(() => {
        // Fallback to web
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
      });
    }
  };

  const renderFactor = (
    key: keyof typeof FACTOR_CONFIG,
    score: number,
    weatherDescription?: string,
    nearbyEvents?: NearbyEvent[]
  ) => {
    const config = FACTOR_CONFIG[key];
    const impact = getImpactLevel(score);
    const impactColor = getImpactColor(impact);
    const label = config.getLabel(score, weatherDescription, nearbyEvents);

    return (
      <View key={key} style={styles.factorRow}>
        <View style={[styles.factorIcon, { backgroundColor: impactColor + '20' }]}>
          <Ionicons name={config.icon} size={18} color={impactColor} />
        </View>
        <View style={styles.factorContent}>
          <Text style={styles.factorLabel}>{label}</Text>
          <View style={styles.factorScoreBar}>
            <View
              style={[
                styles.factorScoreFill,
                { width: `${score}%`, backgroundColor: impactColor },
              ]}
            />
          </View>
        </View>
        <Text style={[styles.factorScore, { color: impactColor }]}>{score}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.modalContainer, { transform: [{ translateY }] }]}>
          {/* Handle bar - draggable to dismiss */}
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>

          {/* X button to close */}
          <Pressable style={styles.closeX} onPress={onClose}>
            <Ionicons name="close" size={24} color="#71717A" />
          </Pressable>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#06B6D4" />
                <Text style={styles.loadingText}>Loading zone data...</Text>
              </View>
            ) : data ? (
              <>
                {/* Score Header */}
              <View style={styles.header}>
                <View style={styles.scoreCircle}>
                  <Text style={[styles.scoreNumber, { color: getScoreColor(data.score) }]}>
                    {data.score}
                  </Text>
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={[styles.scoreLabel, { color: getScoreColor(data.score) }]}>
                    {data.label}
                  </Text>
                  <Text style={styles.scoreSubtitle}>Giglet Score</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Factors */}
              <Text style={styles.sectionTitle}>Score Factors</Text>
              <View style={styles.factorsContainer}>
                {renderFactor('mealTimeBoost', data.factors.mealTimeBoost)}
                {renderFactor('peakHourBoost', data.factors.peakHourBoost)}
                {renderFactor('weatherBoost', data.factors.weatherBoost, data.weatherDescription)}
                {renderFactor('eventBoost', data.factors.eventBoost, undefined, data.nearbyEvents)}
                {renderFactor('weekendBoost', data.factors.weekendBoost)}
              </View>

              {/* Nearby Events */}
              {data.nearbyEvents && data.nearbyEvents.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.sectionTitle}>Nearby Events</Text>
                  {data.nearbyEvents.map((event, index) => (
                    <View key={index} style={styles.eventRow}>
                      <Ionicons name="ticket" size={16} color="#06B6D4" />
                      <View style={styles.eventContent}>
                        <Text style={styles.eventName}>{event.name}</Text>
                        <Text style={styles.eventVenue}>
                          {event.venue} · {event.startsIn}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={48} color="#EF4444" />
              <Text style={styles.errorText}>Unable to load zone data</Text>
            </View>
          )}
          </ScrollView>

          {/* Go Here Button */}
          {data && latitude && longitude && (
            <Pressable style={styles.goButton} onPress={openDirections}>
              <Ionicons name="navigate" size={20} color="#FAFAFA" />
              <Text style={styles.goButtonText}>Go Here</Text>
            </Pressable>
          )}

          {/* Close Button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 48,
    maxHeight: '80%',
  },
  handleContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
  },
  closeX: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 0,
    flexShrink: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#A1A1AA',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: '#EF4444',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3F3F46',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreSubtitle: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#27272A',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 12,
  },
  factorsContainer: {
    gap: 12,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  factorIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factorContent: {
    flex: 1,
  },
  factorLabel: {
    fontSize: 14,
    color: '#FAFAFA',
    marginBottom: 4,
  },
  factorScoreBar: {
    height: 4,
    backgroundColor: '#27272A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  factorScoreFill: {
    height: '100%',
    borderRadius: 2,
  },
  factorScore: {
    fontSize: 14,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  eventContent: {
    flex: 1,
  },
  eventName: {
    fontSize: 14,
    color: '#FAFAFA',
    fontWeight: '500',
  },
  eventVenue: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  goButton: {
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  goButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  closeButton: {
    backgroundColor: '#27272A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
});
