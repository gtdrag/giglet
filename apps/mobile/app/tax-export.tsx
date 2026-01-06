/**
 * Tax Export Screen
 * Allows Pro users to export IRS-compliant mileage logs in CSV or PDF format
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '../src/hooks/useSubscription';
import { PaywallModal } from '../src/components/subscriptions/PaywallModal';
import { DateRangeSelector } from '../src/components/DateRangeSelector';
import {
  DateRange,
  getPresetDateRange,
  formatDateRange,
} from '../src/utils/dateRange';
import {
  getExportPreview,
  exportAndShareMileageLog,
  getEarningsExportPreview,
  exportAndShareEarningsSummary,
  type ExportFormat,
  type ExportPreview,
  type EarningsExportPreview,
} from '../src/services/export';
import { IRS_MILEAGE_RATE, formatTaxDeduction } from '../src/constants/tax';
import { useMileageStore } from '../src/stores/mileageStore';
import { YTDSummaryCard } from '../src/components/YTDSummaryCard';
import { IRSRateInfoModal } from '../src/components/IRSRateInfoModal';

/**
 * Format currency for display
 */
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export default function TaxExportScreen() {
  const router = useRouter();
  const { canAccess, isProUser, isLoading: isLoadingSub } = useSubscription();

  // YTD Mileage data for summary card
  const { yearMiles, yearTrips, isLoading: isLoadingMileage } = useMileageStore();
  const [showIRSInfoModal, setShowIRSInfoModal] = useState(false);

  // State - Mileage Export
  const [showPaywall, setShowPaywall] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('this_year'));
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // State - Earnings Export
  const [earningsDateRange, setEarningsDateRange] = useState<DateRange>(
    getPresetDateRange('this_year')
  );
  const [earningsFormat, setEarningsFormat] = useState<ExportFormat>('pdf');
  const [earningsPreview, setEarningsPreview] = useState<EarningsExportPreview | null>(null);
  const [isLoadingEarningsPreview, setIsLoadingEarningsPreview] = useState(false);
  const [isExportingEarnings, setIsExportingEarnings] = useState(false);

  // Check Pro access
  const hasAccess = canAccess('taxExport');

  // Load mileage preview when date range changes
  useEffect(() => {
    const loadPreview = async () => {
      if (!hasAccess) return;

      setIsLoadingPreview(true);
      try {
        const previewData = await getExportPreview(dateRange);
        setPreview(previewData);
      } catch (error) {
        console.error('Failed to load mileage preview:', error);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [dateRange, hasAccess]);

  // Load earnings preview when date range changes
  useEffect(() => {
    const loadEarningsPreview = async () => {
      if (!hasAccess) return;

      setIsLoadingEarningsPreview(true);
      try {
        const previewData = await getEarningsExportPreview(earningsDateRange);
        setEarningsPreview(previewData);
      } catch (error) {
        console.error('Failed to load earnings preview:', error);
      } finally {
        setIsLoadingEarningsPreview(false);
      }
    };

    loadEarningsPreview();
  }, [earningsDateRange, hasAccess]);

  const handleExport = useCallback(async () => {
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }

    if (!preview || preview.tripCount === 0) {
      Alert.alert(
        'No Trips Found',
        'There are no trips in the selected date range to export.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportAndShareMileageLog(selectedFormat, dateRange);

      if (!result.success) {
        Alert.alert('Export Failed', result.error || 'Failed to generate export');
      }
      // If successful, share sheet was shown and user can choose what to do
    } catch (error) {
      Alert.alert('Export Failed', 'An unexpected error occurred');
    } finally {
      setIsExporting(false);
    }
  }, [hasAccess, preview, selectedFormat, dateRange]);

  const handleEarningsExport = useCallback(async () => {
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }

    if (!earningsPreview || earningsPreview.deliveryCount === 0) {
      Alert.alert(
        'No Deliveries Found',
        'There are no deliveries in the selected date range to export.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsExportingEarnings(true);
    try {
      const result = await exportAndShareEarningsSummary(earningsFormat, earningsDateRange);

      if (!result.success) {
        Alert.alert('Export Failed', result.error || 'Failed to generate export');
      }
      // If successful, share sheet was shown and user can choose what to do
    } catch (error) {
      Alert.alert('Export Failed', 'An unexpected error occurred');
    } finally {
      setIsExportingEarnings(false);
    }
  }, [hasAccess, earningsPreview, earningsFormat, earningsDateRange]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Show paywall for non-Pro users
  if (!hasAccess && !isLoadingSub) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FAFAFA" />
          </Pressable>
          <Text style={styles.headerTitle}>Tax Export</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.proRequiredContainer}>
          <View style={styles.proIconContainer}>
            <Ionicons name="lock-closed" size={48} color="#06B6D4" />
          </View>
          <Text style={styles.proRequiredTitle}>Pro Feature</Text>
          <Text style={styles.proRequiredDescription}>
            Export IRS-compliant mileage logs with a Giglet Pro subscription.
            Perfect for tax time!
          </Text>
          <View style={styles.proFeaturesList}>
            <ProFeatureItem text="Export to CSV or PDF" />
            <ProFeatureItem text="IRS-compliant format" />
            <ProFeatureItem text="Date range selection" />
            <ProFeatureItem text="Tax deduction estimates" />
          </View>
          <Pressable style={styles.upgradeButton} onPress={() => setShowPaywall(true)}>
            <Ionicons name="star" size={20} color="#09090B" />
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </Pressable>
        </View>

        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          feature="taxExport"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.headerTitle}>Tax Export</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* YTD Tax Summary Card */}
        <YTDSummaryCard
          yearMiles={yearMiles}
          yearTrips={yearTrips}
          isLoading={isLoadingMileage}
          onInfoPress={() => setShowIRSInfoModal(true)}
        />

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="document-text" size={24} color="#06B6D4" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Mileage Log Export</Text>
            <Text style={styles.infoDescription}>
              Generate an IRS-compliant mileage log for your tax deduction.
              Includes date, purpose, locations, and miles for each trip.
            </Text>
          </View>
        </View>

        {/* Date Range Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </View>

        {/* Format Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Format</Text>
          <View style={styles.formatRow}>
            <Pressable
              style={[
                styles.formatOption,
                selectedFormat === 'pdf' && styles.formatOptionSelected,
              ]}
              onPress={() => setSelectedFormat('pdf')}
            >
              <Ionicons
                name="document"
                size={24}
                color={selectedFormat === 'pdf' ? '#06B6D4' : '#71717A'}
              />
              <Text
                style={[
                  styles.formatLabel,
                  selectedFormat === 'pdf' && styles.formatLabelSelected,
                ]}
              >
                PDF
              </Text>
              <Text style={styles.formatDescription}>Formatted report</Text>
              {selectedFormat === 'pdf' && (
                <View style={styles.formatCheck}>
                  <Ionicons name="checkmark" size={16} color="#FAFAFA" />
                </View>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.formatOption,
                selectedFormat === 'csv' && styles.formatOptionSelected,
              ]}
              onPress={() => setSelectedFormat('csv')}
            >
              <Ionicons
                name="grid"
                size={24}
                color={selectedFormat === 'csv' ? '#06B6D4' : '#71717A'}
              />
              <Text
                style={[
                  styles.formatLabel,
                  selectedFormat === 'csv' && styles.formatLabelSelected,
                ]}
              >
                CSV
              </Text>
              <Text style={styles.formatDescription}>Spreadsheet data</Text>
              {selectedFormat === 'csv' && (
                <View style={styles.formatCheck}>
                  <Ionicons name="checkmark" size={16} color="#FAFAFA" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Preview Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Preview</Text>
          <View style={styles.previewCard}>
            {isLoadingPreview ? (
              <View style={styles.previewLoading}>
                <ActivityIndicator size="small" color="#06B6D4" />
                <Text style={styles.previewLoadingText}>Loading preview...</Text>
              </View>
            ) : preview ? (
              <>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Period</Text>
                  <Text style={styles.previewValue}>{formatDateRange(dateRange)}</Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Total Trips</Text>
                  <Text style={styles.previewValue}>{preview.tripCount}</Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Total Miles</Text>
                  <Text style={styles.previewValue}>{preview.totalMiles.toFixed(1)} mi</Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Tax Deduction</Text>
                  <Text style={[styles.previewValue, styles.previewValueHighlight]}>
                    {formatTaxDeduction(preview.totalMiles)}
                  </Text>
                </View>
                <Text style={styles.previewDisclaimer}>
                  Based on 2024 IRS rate of ${IRS_MILEAGE_RATE}/mile
                </Text>
              </>
            ) : (
              <Text style={styles.previewEmpty}>No preview available</Text>
            )}
          </View>
        </View>

        {/* Mileage Export Button */}
        <Pressable
          style={[
            styles.exportButton,
            (isExporting || !preview || preview.tripCount === 0) && styles.exportButtonDisabled,
          ]}
          onPress={handleExport}
          disabled={isExporting || !preview || preview.tripCount === 0}
        >
          {isExporting ? (
            <>
              <ActivityIndicator size="small" color="#FAFAFA" />
              <Text style={styles.exportButtonText}>Generating...</Text>
            </>
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color="#FAFAFA" />
              <Text style={styles.exportButtonText}>
                Export & Share {selectedFormat.toUpperCase()}
              </Text>
            </>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.sectionDivider} />

        {/* Earnings Export Section */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="cash" size={24} color="#22C55E" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Earnings Summary Export</Text>
            <Text style={styles.infoDescription}>
              Export your earnings breakdown by platform and month.
              Includes DoorDash and Uber Eats totals.
            </Text>
          </View>
        </View>

        {/* Earnings Date Range Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <DateRangeSelector value={earningsDateRange} onChange={setEarningsDateRange} />
        </View>

        {/* Earnings Format Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Format</Text>
          <View style={styles.formatRow}>
            <Pressable
              style={[
                styles.formatOption,
                earningsFormat === 'pdf' && styles.formatOptionSelected,
              ]}
              onPress={() => setEarningsFormat('pdf')}
            >
              <Ionicons
                name="document"
                size={24}
                color={earningsFormat === 'pdf' ? '#22C55E' : '#71717A'}
              />
              <Text
                style={[
                  styles.formatLabel,
                  earningsFormat === 'pdf' && styles.formatLabelSelectedGreen,
                ]}
              >
                PDF
              </Text>
              <Text style={styles.formatDescription}>Summary report</Text>
              {earningsFormat === 'pdf' && (
                <View style={styles.formatCheckGreen}>
                  <Ionicons name="checkmark" size={16} color="#FAFAFA" />
                </View>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.formatOption,
                earningsFormat === 'csv' && styles.formatOptionSelected,
              ]}
              onPress={() => setEarningsFormat('csv')}
            >
              <Ionicons
                name="grid"
                size={24}
                color={earningsFormat === 'csv' ? '#22C55E' : '#71717A'}
              />
              <Text
                style={[
                  styles.formatLabel,
                  earningsFormat === 'csv' && styles.formatLabelSelectedGreen,
                ]}
              >
                CSV
              </Text>
              <Text style={styles.formatDescription}>Spreadsheet data</Text>
              {earningsFormat === 'csv' && (
                <View style={styles.formatCheckGreen}>
                  <Ionicons name="checkmark" size={16} color="#FAFAFA" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Earnings Preview Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Preview</Text>
          <View style={styles.previewCard}>
            {isLoadingEarningsPreview ? (
              <View style={styles.previewLoading}>
                <ActivityIndicator size="small" color="#22C55E" />
                <Text style={styles.previewLoadingText}>Loading preview...</Text>
              </View>
            ) : earningsPreview ? (
              <>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Period</Text>
                  <Text style={styles.previewValue}>{formatDateRange(earningsDateRange)}</Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Total Deliveries</Text>
                  <Text style={styles.previewValue}>{earningsPreview.deliveryCount}</Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>DoorDash</Text>
                  <Text style={styles.previewValue}>
                    {formatCurrency(earningsPreview.platformBreakdown.doordash)}
                  </Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Uber Eats</Text>
                  <Text style={styles.previewValue}>
                    {formatCurrency(earningsPreview.platformBreakdown.ubereats)}
                  </Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Total Earnings</Text>
                  <Text style={[styles.previewValue, styles.previewValueGreen]}>
                    {formatCurrency(earningsPreview.totalEarnings)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.previewEmpty}>No preview available</Text>
            )}
          </View>
        </View>

        {/* Earnings Export Button */}
        <Pressable
          style={[
            styles.exportButtonGreen,
            (isExportingEarnings || !earningsPreview || earningsPreview.deliveryCount === 0) &&
              styles.exportButtonDisabled,
          ]}
          onPress={handleEarningsExport}
          disabled={isExportingEarnings || !earningsPreview || earningsPreview.deliveryCount === 0}
        >
          {isExportingEarnings ? (
            <>
              <ActivityIndicator size="small" color="#FAFAFA" />
              <Text style={styles.exportButtonText}>Generating...</Text>
            </>
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color="#FAFAFA" />
              <Text style={styles.exportButtonText}>
                Export & Share {earningsFormat.toUpperCase()}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="taxExport"
      />

      <IRSRateInfoModal
        visible={showIRSInfoModal}
        onClose={() => setShowIRSInfoModal(false)}
      />
    </SafeAreaView>
  );
}

function ProFeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.proFeatureItem}>
      <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
      <Text style={styles.proFeatureText}>{text}</Text>
    </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#0E3A42',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#06B6D4',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  infoDescription: {
    fontSize: 14,
    color: '#A1A1AA',
    lineHeight: 20,
  },
  // Section
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Format Selector
  formatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formatOption: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#27272A',
    position: 'relative',
  },
  formatOptionSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#0E3A42',
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  formatLabelSelected: {
    color: '#06B6D4',
  },
  formatDescription: {
    fontSize: 12,
    color: '#71717A',
  },
  formatCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Preview Card
  previewCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  previewLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  previewLoadingText: {
    fontSize: 14,
    color: '#71717A',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  previewValueHighlight: {
    color: '#22C55E',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#27272A',
  },
  previewDisclaimer: {
    fontSize: 11,
    color: '#52525B',
    marginTop: 12,
    textAlign: 'center',
  },
  previewEmpty: {
    fontSize: 14,
    color: '#52525B',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Export Button
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#27272A',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  // Pro Required Container
  proRequiredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  proIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0E3A42',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  proRequiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 12,
  },
  proRequiredDescription: {
    fontSize: 16,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  proFeaturesList: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  proFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proFeatureText: {
    fontSize: 15,
    color: '#FAFAFA',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#09090B',
  },
  // Earnings Export Styles
  sectionDivider: {
    height: 1,
    backgroundColor: '#27272A',
    marginVertical: 8,
  },
  formatLabelSelectedGreen: {
    color: '#22C55E',
  },
  formatCheckGreen: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewValueGreen: {
    color: '#22C55E',
  },
  exportButtonGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
});
