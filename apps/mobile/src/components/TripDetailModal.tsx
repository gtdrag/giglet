import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { CompletedTrip } from '../services/locationTracking';
import { decodePolyline } from '../utils/distance';
import type { DeliveryRecord } from '../utils/deliveryStorage';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// IRS mileage rate for 2024
const IRS_MILEAGE_RATE = 0.67;

// Mapbox access token - should be moved to environment variable
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZ2lnbGV0YXBwIiwiYSI6ImNtN2l0a2VtMjBnZm8yeHNoOGVoaHd4YnYifQ.placeholder';

interface TripDetailModalProps {
  visible: boolean;
  onClose: () => void;
  trip: CompletedTrip | null;
  onEdit?: (tripId: string, updates: { miles?: number; startedAt?: string; endedAt?: string }) => Promise<void>;
  onDelete?: (tripId: string) => Promise<void>;
  /** Linked deliveries for this trip */
  linkedDeliveries?: DeliveryRecord[];
}

// Format date for header
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

// Format time with timezone
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Calculate trip duration in minutes
const calculateDuration = (startedAt: string, endedAt: string): number => {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  return Math.round((end - start) / 60000);
};

// Format duration for display
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Calculate average speed in mph
const calculateAverageSpeed = (miles: number, durationMinutes: number): number => {
  if (durationMinutes === 0) return 0;
  return (miles / durationMinutes) * 60;
};

export function TripDetailModal({ visible, onClose, trip, onEdit, onDelete, linkedDeliveries }: TripDetailModalProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const [startAddress, setStartAddress] = useState<string>('Loading...');
  const [endAddress, setEndAddress] = useState<string>('Loading...');
  const [mapImageError, setMapImageError] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMiles, setEditMiles] = useState('');
  const [editStartTime, setEditStartTime] = useState(new Date());
  const [editEndTime, setEditEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Reset edit mode when modal opens/closes or trip changes
  useEffect(() => {
    if (visible && trip) {
      setIsEditMode(false);
      setEditMiles(trip.miles.toFixed(1));
      setEditStartTime(new Date(trip.startedAt));
      setEditEndTime(new Date(trip.endedAt));
      setEditError(null);
    }
  }, [visible, trip]);

  // Reverse geocode addresses when trip changes
  useEffect(() => {
    if (!trip || !visible) return;

    const geocodeAddresses = async () => {
      try {
        // Skip geocoding for manual trips with 0,0 coordinates
        if (trip.startLat === 0 && trip.startLng === 0) {
          setStartAddress('Manual entry');
          setEndAddress('Manual entry');
          return;
        }

        // Get start address
        const startResult = await Location.reverseGeocodeAsync({
          latitude: trip.startLat,
          longitude: trip.startLng,
        });
        if (startResult.length > 0) {
          const addr = startResult[0];
          setStartAddress(
            addr.street
              ? `${addr.street}${addr.city ? `, ${addr.city}` : ''}`
              : addr.city || addr.region || 'Unknown location'
          );
        }

        // Get end address
        const endResult = await Location.reverseGeocodeAsync({
          latitude: trip.endLat,
          longitude: trip.endLng,
        });
        if (endResult.length > 0) {
          const addr = endResult[0];
          setEndAddress(
            addr.street
              ? `${addr.street}${addr.city ? `, ${addr.city}` : ''}`
              : addr.city || addr.region || 'Unknown location'
          );
        }
      } catch {
        setStartAddress('Location unavailable');
        setEndAddress('Location unavailable');
      }
    };

    setStartAddress('Loading...');
    setEndAddress('Loading...');
    geocodeAddresses();
  }, [trip, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
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
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const handleEditPress = useCallback(() => {
    setIsEditMode(true);
    setEditError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (trip) {
      setEditMiles(trip.miles.toFixed(1));
      setEditStartTime(new Date(trip.startedAt));
      setEditEndTime(new Date(trip.endedAt));
    }
    setIsEditMode(false);
    setEditError(null);
  }, [trip]);

  const handleSaveEdit = useCallback(async () => {
    if (!trip || !onEdit) return;

    // Validate miles
    const miles = parseFloat(editMiles);
    if (isNaN(miles) || miles <= 0) {
      setEditError('Miles must be a positive number');
      return;
    }
    if (miles > 1000) {
      setEditError('Miles cannot exceed 1000');
      return;
    }

    // Validate time (end time must be after start time)
    if (editEndTime <= editStartTime) {
      setEditError('End time must be after start time');
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      await onEdit(trip.id, {
        miles,
        startedAt: editStartTime.toISOString(),
        endedAt: editEndTime.toISOString(),
      });
      setIsEditMode(false);
    } catch (error) {
      setEditError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [trip, onEdit, editMiles, editStartTime, editEndTime]);

  const handleDeletePress = useCallback(() => {
    if (!trip || !onDelete) return;

    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await onDelete(trip.id);
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete trip. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [trip, onDelete, onClose]);

  const handleMilesChange = (text: string) => {
    // Allow only numbers and decimal point
    const filtered = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = filtered.split('.');
    if (parts.length > 2) return;
    // Limit decimal places to 1
    if (parts.length === 2 && parts[1].length > 1) return;
    setEditMiles(filtered);
    setEditError(null);
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedTime) {
      setEditStartTime(selectedTime);
      setEditError(null);
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      setEditEndTime(selectedTime);
      setEditError(null);
    }
  };

  if (!visible || !trip) return null;

  const duration = calculateDuration(trip.startedAt, trip.endedAt);
  const avgSpeed = calculateAverageSpeed(trip.miles, duration);
  const taxDeduction = trip.miles * IRS_MILEAGE_RATE;

  // Build Mapbox Static Images URL with route if available
  const getMapImageUrl = (): string | null => {
    if (!trip.encodedRoute) return null;

    // Decode polyline to get points for bounding
    const points = decodePolyline(trip.encodedRoute);
    if (points.length === 0) return null;

    // URL-encode the polyline for Mapbox
    const encodedPath = encodeURIComponent(trip.encodedRoute);

    // Build the static map URL with path overlay
    // Format: path-{strokeWidth}+{strokeColor}({encodedPolyline})
    return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/path-4+06B6D4(${encodedPath})/auto/400x200@2x?access_token=${MAPBOX_ACCESS_TOKEN}&padding=30`;
  };

  const mapImageUrl = getMapImageUrl();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            {/* Trip Header */}
            <View style={styles.header}>
              <Text style={styles.dateText}>{formatDate(trip.startedAt)}</Text>
              <View style={styles.headerStats}>
                <View style={styles.headerStat}>
                  {isEditMode ? (
                    <TextInput
                      style={styles.editMilesInput}
                      value={editMiles}
                      onChangeText={handleMilesChange}
                      keyboardType="decimal-pad"
                      maxLength={6}
                    />
                  ) : (
                    <Text style={styles.milesValue}>{trip.miles.toFixed(1)}</Text>
                  )}
                  <Text style={styles.milesLabel}>miles</Text>
                </View>
                <View style={styles.headerDivider} />
                <View style={styles.headerStat}>
                  <Text style={styles.durationValue}>{formatDuration(duration)}</Text>
                  <Text style={styles.durationLabel}>duration</Text>
                </View>
              </View>
            </View>

            {/* Map Preview */}
            {mapImageUrl && !mapImageError && (
              <View style={styles.mapContainer}>
                <Image
                  source={{ uri: mapImageUrl }}
                  style={styles.mapImage}
                  onError={() => setMapImageError(true)}
                  resizeMode="cover"
                />
                {/* Start marker overlay */}
                <View style={[styles.mapMarker, styles.startMarker, { left: 20, top: 20 }]}>
                  <Ionicons name="flag" size={12} color="#FAFAFA" />
                </View>
                {/* End marker overlay */}
                <View style={[styles.mapMarker, styles.endMarker, { right: 20, bottom: 20 }]}>
                  <Ionicons name="location" size={12} color="#FAFAFA" />
                </View>
              </View>
            )}

            {/* Fallback when no route or error */}
            {(!mapImageUrl || mapImageError) && (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={32} color="#52525B" />
                <Text style={styles.mapPlaceholderText}>Route map unavailable</Text>
              </View>
            )}

            {/* Start and End Times (Editable in edit mode) */}
            <View style={styles.locationsSection}>
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, { backgroundColor: '#22C55E' }]} />
                <View style={styles.locationInfo}>
                  {isEditMode ? (
                    <Pressable
                      style={styles.editTimeButton}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.editTimeText}>{formatTime(editStartTime.toISOString())}</Text>
                      <Ionicons name="time-outline" size={16} color="#06B6D4" />
                    </Pressable>
                  ) : (
                    <Text style={styles.locationTime}>{formatTime(trip.startedAt)}</Text>
                  )}
                  <Text style={styles.locationAddress} numberOfLines={1}>
                    {startAddress}
                  </Text>
                </View>
              </View>
              <View style={styles.locationLine} />
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, { backgroundColor: '#EF4444' }]} />
                <View style={styles.locationInfo}>
                  {isEditMode ? (
                    <Pressable
                      style={styles.editTimeButton}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={styles.editTimeText}>{formatTime(editEndTime.toISOString())}</Text>
                      <Ionicons name="time-outline" size={16} color="#06B6D4" />
                    </Pressable>
                  ) : (
                    <Text style={styles.locationTime}>{formatTime(trip.endedAt)}</Text>
                  )}
                  <Text style={styles.locationAddress} numberOfLines={1}>
                    {endAddress}
                  </Text>
                </View>
              </View>
            </View>

            {/* Edit Error Message */}
            {editError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{editError}</Text>
              </View>
            )}

            {/* Trip Stats (hidden in edit mode for simplicity) */}
            {!isEditMode && (
              <View style={styles.statsSection}>
                <View style={styles.statRow}>
                  <View style={styles.statIcon}>
                    <Ionicons name="speedometer" size={18} color="#06B6D4" />
                  </View>
                  <Text style={styles.statLabel}>Average Speed</Text>
                  <Text style={styles.statValue}>{avgSpeed.toFixed(1)} mph</Text>
                </View>
                <View style={styles.statRow}>
                  <View style={styles.statIcon}>
                    <Ionicons name="receipt" size={18} color="#22C55E" />
                  </View>
                  <Text style={styles.statLabel}>Tax Deduction</Text>
                  <Text style={[styles.statValue, { color: '#22C55E' }]}>
                    ${taxDeduction.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <View style={styles.statIcon}>
                    <Ionicons name="navigate" size={18} color="#71717A" />
                  </View>
                  <Text style={styles.statLabel}>Route Points</Text>
                  <Text style={styles.statValue}>{trip.pointCount}</Text>
                </View>
                {trip.isManual && (
                  <View style={styles.statRow}>
                    <View style={styles.statIcon}>
                      <Ionicons name="create" size={18} color="#EAB308" />
                    </View>
                    <Text style={styles.statLabel}>Entry Type</Text>
                    <Text style={[styles.statValue, { color: '#EAB308' }]}>Manual</Text>
                  </View>
                )}
              </View>
            )}

            {/* Linked Deliveries Section */}
            {!isEditMode && (
              <View style={styles.linkedDeliveriesSection}>
                <Text style={styles.linkedDeliveriesHeader}>Linked Deliveries</Text>
                {linkedDeliveries && linkedDeliveries.length > 0 ? (
                  <View style={styles.deliveriesList}>
                    {linkedDeliveries.map((delivery) => (
                      <View key={delivery.id} style={styles.deliveryCard}>
                        <View style={styles.deliveryIconContainer}>
                          <View
                            style={[
                              styles.platformIcon,
                              delivery.platform === 'DOORDASH'
                                ? styles.doordashIcon
                                : styles.uberEatsIcon,
                            ]}
                          >
                            <Ionicons
                              name="bag-handle"
                              size={14}
                              color={delivery.platform === 'DOORDASH' ? '#FF3008' : '#06C167'}
                            />
                          </View>
                        </View>
                        <View style={styles.deliveryInfo}>
                          <Text style={styles.restaurantName}>{delivery.restaurantName}</Text>
                          <Text style={styles.deliveryTime}>
                            {formatTime(delivery.deliveredAt)}
                          </Text>
                        </View>
                        <View style={styles.deliveryEarnings}>
                          <Text style={styles.earningsAmount}>
                            ${delivery.earnings.toFixed(2)}
                          </Text>
                          {delivery.tip > 0 && (
                            <Text style={styles.tipAmount}>+${delivery.tip.toFixed(2)} tip</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noDeliveriesContainer}>
                    <Ionicons name="bag-handle-outline" size={24} color="#52525B" />
                    <Text style={styles.noDeliveriesText}>No linked deliveries</Text>
                  </View>
                )}
              </View>
            )}

            {/* IRS Rate Note */}
            {!isEditMode && (
              <View style={styles.irsNote}>
                <Ionicons name="information-circle" size={16} color="#71717A" />
                <Text style={styles.irsNoteText}>
                  Based on 2024 IRS standard mileage rate of ${IRS_MILEAGE_RATE}/mile
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          {isEditMode ? (
            <View style={styles.actionButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleCancelEdit}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.editButton, !onEdit && styles.buttonDisabled]}
                onPress={handleEditPress}
                disabled={!onEdit}
              >
                <Ionicons name="create-outline" size={20} color={onEdit ? '#06B6D4' : '#52525B'} />
                <Text style={[styles.editButtonText, !onEdit && styles.buttonTextDisabled]}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteButton, (!onDelete || isDeleting) && styles.buttonDisabled]}
                onPress={handleDeletePress}
                disabled={!onDelete || isDeleting}
              >
                <Ionicons name="trash-outline" size={20} color={onDelete && !isDeleting ? '#EF4444' : '#52525B'} />
                <Text style={[styles.deleteButtonText, (!onDelete || isDeleting) && styles.buttonTextDisabled]}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Close Button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>

          {/* Time Pickers */}
          {showStartTimePicker && (
            <DateTimePicker
              value={editStartTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartTimeChange}
              themeVariant="dark"
            />
          )}

          {showEndTimePicker && (
            <DateTimePicker
              value={editEndTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndTimeChange}
              themeVariant="dark"
            />
          )}
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
    maxHeight: '85%',
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
  header: {
    marginBottom: 20,
  },
  dateText: {
    fontSize: 14,
    color: '#71717A',
    marginBottom: 12,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerStat: {
    flex: 1,
  },
  headerDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#27272A',
    marginHorizontal: 20,
  },
  milesValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#06B6D4',
  },
  milesLabel: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 2,
  },
  editMilesInput: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#06B6D4',
    backgroundColor: '#27272A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#3F3F46',
    minWidth: 100,
  },
  durationValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FAFAFA',
  },
  durationLabel: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 2,
  },
  mapContainer: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#27272A',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startMarker: {
    backgroundColor: '#22C55E',
  },
  endMarker: {
    backgroundColor: '#EF4444',
  },
  mapPlaceholder: {
    height: 120,
    borderRadius: 12,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#52525B',
  },
  locationsSection: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  locationInfo: {
    flex: 1,
  },
  locationTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: '#A1A1AA',
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: '#3F3F46',
    marginLeft: 5,
    marginVertical: 4,
  },
  editTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3F3F46',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  editTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B1219',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  statsSection: {
    gap: 12,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    flex: 1,
    fontSize: 15,
    color: '#A1A1AA',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  irsNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#27272A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  irsNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#71717A',
  },
  linkedDeliveriesSection: {
    marginBottom: 16,
  },
  linkedDeliveriesHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 12,
  },
  deliveriesList: {
    gap: 8,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  deliveryIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doordashIcon: {
    backgroundColor: '#1C0A02',
  },
  uberEatsIcon: {
    backgroundColor: '#0A2014',
  },
  deliveryInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#71717A',
  },
  deliveryEarnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22C55E',
  },
  tipAmount: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
  noDeliveriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 20,
  },
  noDeliveriesText: {
    fontSize: 14,
    color: '#52525B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#27272A',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#06B6D4',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#27272A',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: '#52525B',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272A',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06B6D4',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  closeButton: {
    backgroundColor: '#27272A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
});
