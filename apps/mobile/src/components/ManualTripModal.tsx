import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ManualTripModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (tripData: ManualTripData) => Promise<void>;
}

export interface ManualTripData {
  date: Date;
  startTime: Date;
  endTime: Date;
  miles: number;
}

// Format date for display
const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format time for display
const formatTimeDisplay = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Get default start time (30 minutes ago)
const getDefaultStartTime = (): Date => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 30);
  return now;
};

// Get default end time (now)
const getDefaultEndTime = (): Date => {
  return new Date();
};

export function ManualTripModal({ visible, onClose, onSave }: ManualTripModalProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(getDefaultStartTime());
  const [endTime, setEndTime] = useState<Date>(getDefaultEndTime());
  const [milesText, setMilesText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Picker visibility state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<{
    miles?: string;
    time?: string;
  }>({});

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setDate(new Date());
      setStartTime(getDefaultStartTime());
      setEndTime(getDefaultEndTime());
      setMilesText('');
      setErrors({});
      setIsSaving(false);
    }
  }, [visible]);

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

  const validateForm = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    // Validate miles
    const miles = parseFloat(milesText);
    if (!milesText.trim()) {
      newErrors.miles = 'Miles is required';
    } else if (isNaN(miles) || miles <= 0) {
      newErrors.miles = 'Miles must be a positive number';
    } else if (miles > 1000) {
      newErrors.miles = 'Miles cannot exceed 1000';
    }

    // Validate time (end time must be after start time)
    // Combine date with times for comparison
    const startDateTime = new Date(date);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

    if (endDateTime <= startDateTime) {
      newErrors.time = 'End time must be after start time';
    }

    // Check if date is in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      newErrors.time = 'Date cannot be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [milesText, date, startTime, endTime]);

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const miles = parseFloat(milesText);

      await onSave({
        date,
        startTime,
        endTime,
        miles,
      });

      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save trip. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedTime) {
      setStartTime(selectedTime);
      // Clear time error when user makes changes
      if (errors.time) {
        setErrors((prev) => ({ ...prev, time: undefined }));
      }
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      setEndTime(selectedTime);
      // Clear time error when user makes changes
      if (errors.time) {
        setErrors((prev) => ({ ...prev, time: undefined }));
      }
    }
  };

  const handleMilesChange = (text: string) => {
    // Allow only numbers and decimal point
    const filtered = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = filtered.split('.');
    if (parts.length > 2) {
      return;
    }
    // Limit decimal places to 1
    if (parts.length === 2 && parts[1].length > 1) {
      return;
    }
    setMilesText(filtered);
    // Clear miles error when user types
    if (errors.miles) {
      setErrors((prev) => ({ ...prev, miles: undefined }));
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View style={[styles.modalContainer, { transform: [{ translateY }] }]}>
            {/* Handle bar - draggable to dismiss */}
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            {/* X button to close */}
            <Pressable style={styles.closeX} onPress={onClose}>
              <Ionicons name="close" size={24} color="#71717A" />
            </Pressable>

            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Modal Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Add Trip Manually</Text>
                <Text style={styles.subtitle}>
                  Record mileage for a trip that wasn't tracked automatically
                </Text>
              </View>

              {/* Date Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Date</Text>
                <Pressable
                  style={styles.fieldInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#71717A" />
                  <Text style={styles.fieldValue}>{formatDateDisplay(date)}</Text>
                  <Ionicons name="chevron-down" size={16} color="#71717A" />
                </Pressable>
              </View>

              {/* Time Fields */}
              <View style={styles.timeRow}>
                <View style={[styles.fieldContainer, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <Pressable
                    style={[styles.fieldInput, errors.time && styles.fieldInputError]}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color="#71717A" />
                    <Text style={styles.fieldValue}>{formatTimeDisplay(startTime)}</Text>
                  </Pressable>
                </View>

                <View style={styles.timeArrow}>
                  <Ionicons name="arrow-forward" size={20} color="#52525B" />
                </View>

                <View style={[styles.fieldContainer, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <Pressable
                    style={[styles.fieldInput, errors.time && styles.fieldInputError]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color="#71717A" />
                    <Text style={styles.fieldValue}>{formatTimeDisplay(endTime)}</Text>
                  </Pressable>
                </View>
              </View>

              {errors.time && (
                <Text style={styles.errorText}>{errors.time}</Text>
              )}

              {/* Miles Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Miles Driven</Text>
                <View style={[styles.milesInputContainer, errors.miles && styles.fieldInputError]}>
                  <Ionicons name="speedometer-outline" size={20} color="#71717A" />
                  <TextInput
                    style={styles.milesInput}
                    value={milesText}
                    onChangeText={handleMilesChange}
                    placeholder="0.0"
                    placeholderTextColor="#52525B"
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                  <Text style={styles.milesUnit}>mi</Text>
                </View>
                {errors.miles && (
                  <Text style={styles.errorText}>{errors.miles}</Text>
                )}
              </View>

              {/* Info Note */}
              <View style={styles.infoNote}>
                <Ionicons name="information-circle" size={16} color="#71717A" />
                <Text style={styles.infoNoteText}>
                  Manual trips are marked with a badge and included in your mileage totals and tax deductions.
                </Text>
              </View>
            </ScrollView>

            {/* Save Button */}
            <Pressable
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Ionicons name="add-circle" size={20} color="#FAFAFA" />
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Add Trip'}
              </Text>
            </Pressable>

            {/* Date/Time Pickers */}
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                themeVariant="dark"
              />
            )}

            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartTimeChange}
                themeVariant="dark"
              />
            )}

            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndTimeChange}
                themeVariant="dark"
              />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 48,
    maxHeight: '90%',
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
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717A',
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A1A1AA',
    marginBottom: 8,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  fieldInputError: {
    borderColor: '#EF4444',
  },
  fieldValue: {
    flex: 1,
    fontSize: 16,
    color: '#FAFAFA',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  timeArrow: {
    paddingBottom: 18,
  },
  milesInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  milesInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#06B6D4',
    paddingVertical: 10,
  },
  milesUnit: {
    fontSize: 16,
    color: '#71717A',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 6,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#27272A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#71717A',
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
});
