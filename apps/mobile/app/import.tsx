/**
 * CSV Import Screen - Import earnings from DoorDash or Uber Eats CSV files
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { parseCSV, type ImportPreview, type ParsedDelivery } from '../src/services/csvParser';
import { importCSV as importCSVToBackend, type ImportResult } from '../src/services/earnings';

// Platform type
type Platform = 'DOORDASH' | 'UBEREATS';

// Import state machine
type ImportStep = 'select' | 'preview' | 'importing' | 'complete' | 'error';

interface ImportState {
  step: ImportStep;
  platform: Platform | null;
  file: DocumentPicker.DocumentPickerAsset | null;
  preview: ImportPreview | null;
  importResult: ImportResult | null;
  error: string | null;
}

const initialState: ImportState = {
  step: 'select',
  platform: null,
  file: null,
  preview: null,
  importResult: null,
  error: null,
};

// Platform styling
const PLATFORM_COLORS = {
  DOORDASH: '#FF3008',
  UBEREATS: '#06C167',
};

const PLATFORM_NAMES = {
  DOORDASH: 'DoorDash',
  UBEREATS: 'Uber Eats',
};

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ImportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ platform?: Platform }>();

  const [state, setState] = useState<ImportState>(() => ({
    ...initialState,
    platform: params.platform ?? null,
  }));

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSelectPlatform = useCallback((platform: Platform) => {
    setState((prev) => ({ ...prev, platform }));
  }, []);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      // Validate file size
      if (asset.size && asset.size > MAX_FILE_SIZE) {
        setState((prev) => ({
          ...prev,
          step: 'error',
          error: 'File is too large. Maximum size is 10MB.',
        }));
        return;
      }

      // Validate file extension
      const fileName = asset.name.toLowerCase();
      if (!fileName.endsWith('.csv')) {
        setState((prev) => ({
          ...prev,
          step: 'error',
          error: 'Please select a CSV file.',
        }));
        return;
      }

      setState((prev) => ({ ...prev, file: asset }));

      // Parse the CSV file
      await parseAndPreview(asset, state.platform!);
    } catch (error) {
      console.error('File picker error:', error);
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: 'Failed to select file. Please try again.',
      }));
    }
  }, [state.platform]);

  const parseAndPreview = async (
    asset: DocumentPicker.DocumentPickerAsset,
    platform: Platform
  ) => {
    try {
      const preview = await parseCSV(asset.uri, platform);
      setState((prev) => ({
        ...prev,
        step: 'preview',
        preview,
        error: null,
      }));
    } catch (error) {
      console.error('CSV parse error:', error);
      const message = error instanceof Error ? error.message : 'Failed to parse CSV file';
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: message,
      }));
    }
  };

  const handleConfirmImport = useCallback(async () => {
    if (!state.file || !state.platform) return;

    setState((prev) => ({ ...prev, step: 'importing' }));

    try {
      // Send to backend API
      const result = await importCSVToBackend(
        state.file.uri,
        state.file.name,
        state.platform
      );

      setState((prev) => ({
        ...prev,
        step: 'complete',
        importResult: result,
      }));
    } catch (error) {
      console.error('Import error:', error);
      const message = error instanceof Error ? error.message : 'Failed to import deliveries';
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: message,
      }));
    }
  }, [state.file, state.platform]);

  const handleCancel = useCallback(() => {
    setState(initialState);
  }, []);

  const handleRetry = useCallback(() => {
    setState((prev) => ({
      ...initialState,
      platform: prev.platform,
    }));
  }, []);

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  // Render platform selection step
  const renderSelectStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="download" size={32} color="#06B6D4" />
        </View>
        <Text style={styles.stepTitle}>Import Earnings</Text>
        <Text style={styles.stepDescription}>
          Select a platform and upload your CSV export file
        </Text>
      </View>

      <View style={styles.platformSection}>
        <Text style={styles.sectionLabel}>Select Platform</Text>
        <View style={styles.platformButtons}>
          <Pressable
            style={[
              styles.platformButton,
              state.platform === 'DOORDASH' && styles.platformButtonSelected,
              state.platform === 'DOORDASH' && { borderColor: PLATFORM_COLORS.DOORDASH },
            ]}
            onPress={() => handleSelectPlatform('DOORDASH')}
          >
            <View
              style={[
                styles.platformIcon,
                { backgroundColor: PLATFORM_COLORS.DOORDASH + '20' },
              ]}
            >
              <Ionicons name="car" size={24} color={PLATFORM_COLORS.DOORDASH} />
            </View>
            <Text style={styles.platformButtonText}>DoorDash</Text>
            {state.platform === 'DOORDASH' && (
              <Ionicons name="checkmark-circle" size={20} color={PLATFORM_COLORS.DOORDASH} />
            )}
          </Pressable>

          <Pressable
            style={[
              styles.platformButton,
              state.platform === 'UBEREATS' && styles.platformButtonSelected,
              state.platform === 'UBEREATS' && { borderColor: PLATFORM_COLORS.UBEREATS },
            ]}
            onPress={() => handleSelectPlatform('UBEREATS')}
          >
            <View
              style={[
                styles.platformIcon,
                { backgroundColor: PLATFORM_COLORS.UBEREATS + '20' },
              ]}
            >
              <Ionicons name="bicycle" size={24} color={PLATFORM_COLORS.UBEREATS} />
            </View>
            <Text style={styles.platformButtonText}>Uber Eats</Text>
            {state.platform === 'UBEREATS' && (
              <Ionicons name="checkmark-circle" size={20} color={PLATFORM_COLORS.UBEREATS} />
            )}
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.primaryButton, !state.platform && styles.primaryButtonDisabled]}
        onPress={handlePickFile}
        disabled={!state.platform}
      >
        <Ionicons name="document" size={20} color="#FAFAFA" />
        <Text style={styles.primaryButtonText}>Select CSV File</Text>
      </Pressable>

      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>How to export your CSV</Text>
        <Text style={styles.helpText}>
          {state.platform === 'DOORDASH'
            ? '1. Open DoorDash Dasher app\n2. Go to Earnings → Tax Information\n3. Download your earnings CSV'
            : state.platform === 'UBEREATS'
            ? '1. Open Uber Driver app\n2. Go to Account → Tax Information\n3. Download your trip history CSV'
            : 'Select a platform above to see export instructions'}
        </Text>
      </View>
    </View>
  );

  // Render preview step
  const renderPreviewStep = () => {
    if (!state.preview || !state.platform) return null;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View
            style={[
              styles.stepIconContainer,
              { backgroundColor: PLATFORM_COLORS[state.platform] + '20' },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={32}
              color={PLATFORM_COLORS[state.platform]}
            />
          </View>
          <Text style={styles.stepTitle}>Ready to Import</Text>
          <Text style={styles.stepDescription}>
            Review your {PLATFORM_NAMES[state.platform]} earnings before importing
          </Text>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Deliveries</Text>
            <Text style={styles.previewValue}>{state.preview.deliveryCount}</Text>
          </View>
          <View style={styles.previewDivider} />
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Date Range</Text>
            <Text style={styles.previewValue}>
              {state.preview.dateRange.start} - {state.preview.dateRange.end}
            </Text>
          </View>
          <View style={styles.previewDivider} />
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Total Earnings</Text>
            <Text style={[styles.previewValue, styles.previewValueHighlight]}>
              ${state.preview.estimatedTotal.toFixed(2)}
            </Text>
          </View>
          {state.preview.duplicateCount > 0 && (
            <>
              <View style={styles.previewDivider} />
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Duplicates (will skip)</Text>
                <Text style={[styles.previewValue, styles.previewValueWarning]}>
                  {state.preview.duplicateCount}
                </Text>
              </View>
            </>
          )}
        </View>

        {state.preview.sampleDeliveries.length > 0 && (
          <View style={styles.sampleSection}>
            <Text style={styles.sectionLabel}>Sample Deliveries</Text>
            {state.preview.sampleDeliveries.slice(0, 3).map((delivery, index) => (
              <View key={index} style={styles.sampleItem}>
                <View style={styles.sampleItemHeader}>
                  <Text style={styles.sampleItemDate}>
                    {new Date(delivery.deliveredAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.sampleItemAmount}>
                    ${delivery.earnings.toFixed(2)}
                  </Text>
                </View>
                {delivery.restaurantName && (
                  <Text style={styles.sampleItemRestaurant}>{delivery.restaurantName}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={handleCancel}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[
              styles.primaryButton,
              styles.primaryButtonFlex,
              { backgroundColor: PLATFORM_COLORS[state.platform] },
            ]}
            onPress={handleConfirmImport}
          >
            <Text style={styles.primaryButtonText}>Import Deliveries</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render importing step
  const renderImportingStep = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#06B6D4" />
      <Text style={styles.loadingText}>Importing deliveries...</Text>
      <Text style={styles.loadingSubtext}>This may take a moment</Text>
    </View>
  );

  // Render complete step
  const renderCompleteStep = () => {
    if (!state.platform) return null;

    // Use import result if available, fall back to preview
    const imported = state.importResult?.imported ?? state.preview?.deliveryCount ?? 0;
    const duplicates = state.importResult?.duplicatesSkipped ?? 0;
    const totalEarnings = state.importResult?.totalEarnings ?? state.preview?.estimatedTotal ?? 0;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={[styles.successIconContainer]}>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          </View>
          <Text style={styles.stepTitle}>Import Complete!</Text>
          <Text style={styles.stepDescription}>
            Imported {imported} deliveries from {PLATFORM_NAMES[state.platform]}
          </Text>
        </View>

        <View style={styles.successCard}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Total Imported</Text>
            <Text style={[styles.previewValue, styles.previewValueHighlight]}>
              ${totalEarnings.toFixed(2)}
            </Text>
          </View>
          {duplicates > 0 && (
            <>
              <View style={styles.previewDivider} />
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Duplicates Skipped</Text>
                <Text style={[styles.previewValue, styles.previewValueWarning]}>
                  {duplicates}
                </Text>
              </View>
            </>
          )}
        </View>

        <Pressable style={styles.primaryButton} onPress={handleDone}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={() => router.push('/import-history')}
        >
          <Ionicons name="time-outline" size={18} color="#06B6D4" />
          <Text style={styles.linkButtonText}>View Import History</Text>
        </Pressable>
      </View>
    );
  };

  // Render error step
  const renderErrorStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
        </View>
        <Text style={styles.stepTitle}>Import Failed</Text>
        <Text style={styles.stepDescription}>{state.error}</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleRetry}>
        <Ionicons name="refresh" size={20} color="#FAFAFA" />
        <Text style={styles.primaryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.headerTitle}>Import Earnings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {state.step === 'select' && renderSelectStep()}
        {state.step === 'preview' && renderPreviewStep()}
        {state.step === 'importing' && renderImportingStep()}
        {state.step === 'complete' && renderCompleteStep()}
        {state.step === 'error' && renderErrorStep()}
      </ScrollView>
    </SafeAreaView>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 15,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  platformSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformButtons: {
    gap: 12,
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#27272A',
    gap: 12,
  },
  platformButtonSelected: {
    backgroundColor: '#1F1F23',
  },
  platformIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#27272A',
    opacity: 0.6,
  },
  primaryButtonFlex: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  helpSection: {
    marginTop: 32,
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#71717A',
    lineHeight: 20,
  },
  previewCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#27272A',
  },
  previewLabel: {
    fontSize: 14,
    color: '#71717A',
  },
  previewValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  previewValueHighlight: {
    color: '#22C55E',
    fontSize: 17,
  },
  previewValueWarning: {
    color: '#EAB308',
  },
  sampleSection: {
    marginTop: 24,
  },
  sampleItem: {
    backgroundColor: '#18181B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  sampleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sampleItemDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  sampleItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  sampleItemRestaurant: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#71717A',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#06B6D4',
  },
});
