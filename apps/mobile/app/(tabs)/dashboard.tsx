import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ManualDeliveryModal } from '../../src/components/ManualDeliveryModal';

export default function DashboardPage() {
  const [showManualModal, setShowManualModal] = useState(false);

  const handleManualDeliverySuccess = () => {
    // TODO: Refresh earnings data when connected to real data
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="wallet" size={20} color="#22C55E" />
            </View>
            <Text style={styles.cardTitle}>Earnings</Text>
          </View>
          <Text style={styles.earningsAmount}>$0.00</Text>
          <Text style={styles.cardSubtext}>This Week</Text>
          <View style={styles.periodSelector}>
            <PeriodButton label="Week" active />
            <PeriodButton label="Month" />
            <PeriodButton label="Year" />
          </View>
          <View style={styles.earningsLinks}>
            <Pressable
              style={styles.cardLink}
              onPress={() => router.push('/deliveries' as any)}
            >
              <Text style={styles.cardLinkText}>View all deliveries</Text>
              <Ionicons name="chevron-forward" size={16} color="#06B6D4" />
            </Pressable>
            <Pressable
              style={styles.addDeliveryButton}
              onPress={() => setShowManualModal(true)}
            >
              <Ionicons name="add-circle" size={18} color="#22C55E" />
              <Text style={styles.addDeliveryText}>Add Delivery</Text>
            </Pressable>
          </View>
        </View>

        {/* Import Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="download" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.cardTitle}>Import Earnings</Text>
          </View>
          <Text style={styles.cardSubtext}>No imports yet</Text>
          <View style={styles.importButtons}>
            <Pressable
              style={[styles.importButton, styles.importButtonDoordash]}
              onPress={() => router.push('/import?platform=DOORDASH' as any)}
            >
              <Text style={styles.importButtonText}>DoorDash CSV</Text>
            </Pressable>
            <Pressable
              style={[styles.importButton, styles.importButtonUbereats]}
              onPress={() => router.push('/import?platform=UBEREATS' as any)}
            >
              <Text style={styles.importButtonText}>Uber Eats CSV</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.cardLinkHistory}
            onPress={() => router.push('/import-history' as any)}
          >
            <Ionicons name="time-outline" size={16} color="#06B6D4" />
            <Text style={styles.cardLinkText}>View Import History</Text>
          </Pressable>
        </View>

        {/* Tax Export Card (Pro) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="document-text" size={20} color="#EAB308" />
            </View>
            <Text style={styles.cardTitle}>Tax Export</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>Pro</Text>
            </View>
          </View>
          <Text style={styles.cardSubtext}>Export mileage log & earnings for taxes</Text>
          <Pressable style={[styles.cardLink, styles.cardLinkDisabled]}>
            <Ionicons name="lock-closed" size={14} color="#71717A" />
            <Text style={styles.cardLinkTextDisabled}>Upgrade to Pro</Text>
            <Ionicons name="chevron-forward" size={16} color="#71717A" />
          </Pressable>
        </View>

        {/* Settings Card */}
        <Pressable style={styles.card} onPress={() => router.push('/accounts')}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="settings" size={20} color="#A1A1AA" />
            </View>
            <Text style={styles.cardTitle}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#71717A" />
          </View>
          <Text style={styles.cardSubtext}>Profile, notifications, account</Text>
        </Pressable>
      </ScrollView>

      <ManualDeliveryModal
        visible={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={handleManualDeliverySuccess}
      />
    </SafeAreaView>
  );
}

function PeriodButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <Pressable style={[styles.periodButton, active && styles.periodButtonActive]}>
      <Text style={[styles.periodButtonText, active && styles.periodButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FAFAFA',
    flex: 1,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#71717A',
    marginBottom: 12,
  },
  earningsAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#27272A',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#3F3F46',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717A',
  },
  periodButtonTextActive: {
    color: '#FAFAFA',
  },
  earningsLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#06B6D4',
  },
  addDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addDeliveryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#22C55E',
  },
  cardLinkDisabled: {
    opacity: 0.7,
  },
  cardLinkTextDisabled: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717A',
    flex: 1,
  },
  importButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardLinkHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  importButton: {
    flex: 1,
    backgroundColor: '#27272A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  importButtonDoordash: {
    borderWidth: 1,
    borderColor: '#FF3008',
  },
  importButtonUbereats: {
    borderWidth: 1,
    borderColor: '#06C167',
  },
  proBadge: {
    backgroundColor: '#422006',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EAB308',
  },
});
