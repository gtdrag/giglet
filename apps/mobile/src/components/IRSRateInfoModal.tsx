/**
 * IRSRateInfoModal - Explains the IRS standard mileage rate for business use
 * AC 7.4.3: When info icon is tapped, explains IRS mileage rate
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IRS_MILEAGE_RATE } from '../constants/tax';

interface IRSRateInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export const IRSRateInfoModal: React.FC<IRSRateInfoModalProps> = ({
  visible,
  onClose,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="receipt-outline" size={56} color="#22C55E" />
          </View>

          <Text style={styles.title}>IRS Standard Mileage Rate</Text>

          <Text style={styles.description}>
            The IRS allows you to deduct a standard amount per mile driven for
            business purposes, such as gig delivery work.
          </Text>

          <View style={styles.rateCard}>
            <Text style={styles.rateLabel}>{currentYear} Rate</Text>
            <Text style={styles.rateValue}>${IRS_MILEAGE_RATE} per mile</Text>
          </View>

          <Text style={styles.sectionTitle}>This rate covers:</Text>
          <View style={styles.bulletList}>
            <BulletItem text="Gas and oil" />
            <BulletItem text="Repairs and maintenance" />
            <BulletItem text="Insurance and registration" />
            <BulletItem text="Depreciation" />
          </View>

          <View style={styles.disclaimerCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#EAB308" />
            <Text style={styles.disclaimerText}>
              This is an estimate only. Consult a tax professional for your
              specific situation. The IRS updates this rate annually.
            </Text>
          </View>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Got It</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const BulletItem: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.bulletItem}>
    <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1A2E05',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  rateCard: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  rateLabel: {
    fontSize: 14,
    color: '#71717A',
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  bulletList: {
    width: '100%',
    gap: 8,
    marginBottom: 20,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletText: {
    fontSize: 15,
    color: '#A1A1AA',
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: '#422006',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 24,
    width: '100%',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#EAB308',
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
});

export default IRSRateInfoModal;
