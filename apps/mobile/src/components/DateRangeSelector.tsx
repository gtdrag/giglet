/**
 * DateRangeSelector Component
 * Allows users to select a date range using presets or custom dates
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  DateRange,
  DateRangePreset,
  DATE_RANGE_PRESETS,
  getPresetDateRange,
  getPresetLabel,
  formatDateRange,
} from '../utils/dateRange';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(value);

  const handlePresetSelect = useCallback(
    (preset: DateRangePreset) => {
      if (preset === 'custom') {
        // For custom, keep the current dates but mark as custom
        setTempRange({ ...tempRange, preset: 'custom' });
      } else {
        const newRange = getPresetDateRange(preset);
        setTempRange(newRange);
        onChange(newRange);
        setShowModal(false);
      }
    },
    [tempRange, onChange]
  );

  const handleStartDateChange = useCallback(
    (_event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        setShowStartPicker(false);
      }
      if (date) {
        const newRange: DateRange = {
          ...tempRange,
          startDate: date,
          preset: 'custom',
        };
        setTempRange(newRange);
      }
    },
    [tempRange]
  );

  const handleEndDateChange = useCallback(
    (_event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        setShowEndPicker(false);
      }
      if (date) {
        // Ensure end date includes full day
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const newRange: DateRange = {
          ...tempRange,
          endDate: endOfDay,
          preset: 'custom',
        };
        setTempRange(newRange);
      }
    },
    [tempRange]
  );

  const handleApply = useCallback(() => {
    onChange(tempRange);
    setShowModal(false);
  }, [tempRange, onChange]);

  const handleCancel = useCallback(() => {
    setTempRange(value);
    setShowModal(false);
  }, [value]);

  const openModal = useCallback(() => {
    setTempRange(value);
    setShowModal(true);
  }, [value]);

  return (
    <>
      {/* Trigger Button */}
      <Pressable style={styles.triggerButton} onPress={openModal}>
        <View style={styles.triggerContent}>
          <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
          <View style={styles.triggerTextContainer}>
            <Text style={styles.triggerLabel}>Date Range</Text>
            <Text style={styles.triggerValue}>{formatDateRange(value)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#71717A" />
      </Pressable>

      {/* Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <Pressable onPress={handleCancel} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#71717A" />
              </Pressable>
            </View>

            <ScrollView style={styles.presetList}>
              {DATE_RANGE_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  style={[
                    styles.presetItem,
                    tempRange.preset === preset && styles.presetItemSelected,
                  ]}
                  onPress={() => handlePresetSelect(preset)}
                >
                  <Text
                    style={[
                      styles.presetLabel,
                      tempRange.preset === preset && styles.presetLabelSelected,
                    ]}
                  >
                    {getPresetLabel(preset)}
                  </Text>
                  {tempRange.preset === preset && (
                    <Ionicons name="checkmark" size={20} color="#06B6D4" />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            {/* Custom Date Pickers */}
            {tempRange.preset === 'custom' && (
              <View style={styles.customDatesContainer}>
                <Text style={styles.customDatesTitle}>Custom Range</Text>

                {/* Start Date */}
                <View style={styles.datePickerRow}>
                  <Text style={styles.dateLabel}>Start Date:</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={tempRange.startDate}
                      mode="date"
                      display="compact"
                      onChange={handleStartDateChange}
                      maximumDate={tempRange.endDate}
                      themeVariant="dark"
                      style={styles.iosPicker}
                    />
                  ) : (
                    <>
                      <Pressable
                        style={styles.androidDateButton}
                        onPress={() => setShowStartPicker(true)}
                      >
                        <Text style={styles.androidDateText}>
                          {tempRange.startDate.toLocaleDateString()}
                        </Text>
                      </Pressable>
                      {showStartPicker && (
                        <DateTimePicker
                          value={tempRange.startDate}
                          mode="date"
                          display="default"
                          onChange={handleStartDateChange}
                          maximumDate={tempRange.endDate}
                        />
                      )}
                    </>
                  )}
                </View>

                {/* End Date */}
                <View style={styles.datePickerRow}>
                  <Text style={styles.dateLabel}>End Date:</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={tempRange.endDate}
                      mode="date"
                      display="compact"
                      onChange={handleEndDateChange}
                      minimumDate={tempRange.startDate}
                      maximumDate={new Date()}
                      themeVariant="dark"
                      style={styles.iosPicker}
                    />
                  ) : (
                    <>
                      <Pressable
                        style={styles.androidDateButton}
                        onPress={() => setShowEndPicker(true)}
                      >
                        <Text style={styles.androidDateText}>
                          {tempRange.endDate.toLocaleDateString()}
                        </Text>
                      </Pressable>
                      {showEndPicker && (
                        <DateTimePicker
                          value={tempRange.endDate}
                          mode="date"
                          display="default"
                          onChange={handleEndDateChange}
                          minimumDate={tempRange.startDate}
                          maximumDate={new Date()}
                        />
                      )}
                    </>
                  )}
                </View>

                <Pressable style={styles.applyButton} onPress={handleApply}>
                  <Text style={styles.applyButtonText}>Apply Custom Range</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  triggerTextContainer: {
    gap: 2,
  },
  triggerLabel: {
    fontSize: 12,
    color: '#71717A',
  },
  triggerValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  closeButton: {
    padding: 4,
  },
  presetList: {
    maxHeight: 300,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  presetItemSelected: {
    backgroundColor: '#0E3A42',
  },
  presetLabel: {
    fontSize: 16,
    color: '#FAFAFA',
  },
  presetLabelSelected: {
    color: '#06B6D4',
    fontWeight: '600',
  },
  customDatesContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  customDatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 15,
    color: '#FAFAFA',
  },
  iosPicker: {
    width: 150,
  },
  androidDateButton: {
    backgroundColor: '#27272A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  androidDateText: {
    fontSize: 15,
    color: '#FAFAFA',
  },
  applyButton: {
    backgroundColor: '#06B6D4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
});
