/**
 * ManualDeliveryModal - Form for adding/editing manual delivery entries
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform as RNPlatform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Platform,
  Delivery,
  createDelivery,
  updateDelivery,
  deleteDelivery,
} from '../services/earnings';

interface ManualDeliveryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editDelivery?: Delivery | null; // If provided, we're in edit mode
}

export function ManualDeliveryModal({
  visible,
  onClose,
  onSuccess,
  editDelivery,
}: ManualDeliveryModalProps) {
  const isEditMode = !!editDelivery;

  // Form state
  const [platform, setPlatform] = useState<Platform>('DOORDASH');
  const [deliveredAt, setDeliveredAt] = useState(new Date());
  const [basePay, setBasePay] = useState('');
  const [tip, setTip] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with edit data
  useEffect(() => {
    if (editDelivery) {
      setPlatform(editDelivery.platform);
      setDeliveredAt(new Date(editDelivery.deliveredAt));
      setBasePay(editDelivery.basePay.toFixed(2));
      setTip(editDelivery.tip.toFixed(2));
      setRestaurantName(editDelivery.restaurantName || '');
    } else {
      // Reset for new entry
      setPlatform('DOORDASH');
      setDeliveredAt(new Date());
      setBasePay('');
      setTip('');
      setRestaurantName('');
    }
    setError(null);
  }, [editDelivery, visible]);

  const validateForm = (): boolean => {
    const basePayNum = parseFloat(basePay);
    const tipNum = parseFloat(tip);

    if (isNaN(basePayNum) || basePayNum < 0) {
      setError('Base pay must be a positive number');
      return false;
    }

    if (isNaN(tipNum) || tipNum < 0) {
      setError('Tip must be a positive number');
      return false;
    }

    if (deliveredAt > new Date()) {
      setError('Delivery date cannot be in the future');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const input = {
        platform,
        deliveredAt: deliveredAt.toISOString(),
        basePay: parseFloat(basePay),
        tip: parseFloat(tip),
        restaurantName: restaurantName.trim() || undefined,
      };

      if (isEditMode && editDelivery) {
        await updateDelivery(editDelivery.id, input);
      } else {
        await createDelivery(input);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!editDelivery) return;

    Alert.alert(
      'Delete Delivery',
      'Are you sure you want to delete this delivery? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDelivery(editDelivery.id);
              onSuccess();
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to delete delivery');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const earnings = (parseFloat(basePay) || 0) + (parseFloat(tip) || 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Delivery' : 'Add Delivery'}
          </Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Platform Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Platform</Text>
            <View style={styles.platformSelector}>
              <Pressable
                style={[
                  styles.platformButton,
                  platform === 'DOORDASH' && styles.platformButtonActiveDoordash,
                ]}
                onPress={() => setPlatform('DOORDASH')}
              >
                <Text
                  style={[
                    styles.platformButtonText,
                    platform === 'DOORDASH' && styles.platformButtonTextActive,
                  ]}
                >
                  DoorDash
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.platformButton,
                  platform === 'UBEREATS' && styles.platformButtonActiveUbereats,
                ]}
                onPress={() => setPlatform('UBEREATS')}
              >
                <Text
                  style={[
                    styles.platformButtonText,
                    platform === 'UBEREATS' && styles.platformButtonTextActive,
                  ]}
                >
                  Uber Eats
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <Pressable
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#A1A1AA" />
                <Text style={styles.dateTimeText}>{formatDate(deliveredAt)}</Text>
              </Pressable>
              <Pressable
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color="#A1A1AA" />
                <Text style={styles.dateTimeText}>{formatTime(deliveredAt)}</Text>
              </Pressable>
            </View>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={deliveredAt}
              mode="date"
              display={RNPlatform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(RNPlatform.OS === 'ios');
                if (date) {
                  const newDate = new Date(deliveredAt);
                  newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  setDeliveredAt(newDate);
                }
              }}
            />
          )}

          {/* Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={deliveredAt}
              mode="time"
              display={RNPlatform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowTimePicker(RNPlatform.OS === 'ios');
                if (date) {
                  const newDate = new Date(deliveredAt);
                  newDate.setHours(date.getHours(), date.getMinutes());
                  setDeliveredAt(newDate);
                }
              }}
            />
          )}

          {/* Base Pay */}
          <View style={styles.section}>
            <Text style={styles.label}>Base Pay</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                value={basePay}
                onChangeText={setBasePay}
                placeholder="0.00"
                placeholderTextColor="#52525B"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Tip */}
          <View style={styles.section}>
            <Text style={styles.label}>Tip</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                value={tip}
                onChangeText={setTip}
                placeholder="0.00"
                placeholderTextColor="#52525B"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Total Earnings Display */}
          <View style={styles.earningsDisplay}>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <Text style={styles.earningsAmount}>${earnings.toFixed(2)}</Text>
          </View>

          {/* Restaurant Name (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>Restaurant Name (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={restaurantName}
              onChangeText={setRestaurantName}
              placeholder="Enter restaurant name"
              placeholderTextColor="#52525B"
              maxLength={100}
            />
          </View>

          {/* Manual Entry Badge Info */}
          {!isEditMode && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#06B6D4" />
              <Text style={styles.infoText}>
                This delivery will be marked as "Manual" to distinguish it from imported entries.
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditMode ? 'Save Changes' : 'Add Delivery'}
              </Text>
            )}
          </Pressable>

          {/* Delete Button (Edit Mode Only) */}
          {isEditMode && (
            <Pressable
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Delete Delivery</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerButton: {
    width: 60,
  },
  cancelText: {
    fontSize: 16,
    color: '#06B6D4',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  platformSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  platformButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  platformButtonActiveDoordash: {
    borderColor: '#FF3008',
    backgroundColor: 'rgba(255, 48, 8, 0.1)',
  },
  platformButtonActiveUbereats: {
    borderColor: '#06C167',
    backgroundColor: 'rgba(6, 193, 103, 0.1)',
  },
  platformButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#71717A',
  },
  platformButtonTextActive: {
    color: '#FAFAFA',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 10,
  },
  dateTimeText: {
    fontSize: 15,
    color: '#FAFAFA',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#71717A',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#FAFAFA',
    paddingVertical: 14,
  },
  textInput: {
    backgroundColor: '#27272A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FAFAFA',
  },
  earningsDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181B',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  earningsLabel: {
    fontSize: 15,
    color: '#A1A1AA',
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#06B6D4',
    flex: 1,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '500',
  },
});
