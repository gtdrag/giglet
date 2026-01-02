import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function DashboardPage() {
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
          <Text style={styles.cardSubtext}>Today</Text>
          <View style={styles.periodSelector}>
            <PeriodButton label="Today" active />
            <PeriodButton label="Week" />
            <PeriodButton label="Month" />
            <PeriodButton label="Year" />
          </View>
          <Pressable style={styles.cardLink}>
            <Text style={styles.cardLinkText}>View all deliveries</Text>
            <Ionicons name="chevron-forward" size={16} color="#06B6D4" />
          </Pressable>
        </View>

        {/* Mileage Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="car" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.cardTitle}>Mileage</Text>
            <View style={styles.trackingBadge}>
              <View style={styles.trackingDot} />
              <Text style={styles.trackingText}>Inactive</Text>
            </View>
          </View>
          <Text style={styles.mileageAmount}>0.0 mi</Text>
          <Text style={styles.taxEstimate}>$0.00 tax deduction estimate</Text>
          <Pressable style={styles.cardLink}>
            <Text style={styles.cardLinkText}>View trip history</Text>
            <Ionicons name="chevron-forward" size={16} color="#06B6D4" />
          </Pressable>
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
            <Pressable style={styles.importButton}>
              <Text style={styles.importButtonText}>DoorDash CSV</Text>
            </Pressable>
            <Pressable style={styles.importButton}>
              <Text style={styles.importButtonText}>Uber Eats CSV</Text>
            </Pressable>
          </View>
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
  mileageAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#06B6D4',
    marginBottom: 4,
  },
  taxEstimate: {
    fontSize: 14,
    color: '#71717A',
    marginBottom: 16,
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
  cardLinkDisabled: {
    opacity: 0.7,
  },
  cardLinkTextDisabled: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717A',
    flex: 1,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  trackingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#71717A',
  },
  trackingText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
  },
  importButtons: {
    flexDirection: 'row',
    gap: 12,
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
