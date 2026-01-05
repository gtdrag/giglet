import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSettingsStore } from '../src/stores/settingsStore';
import type { UserPreferences } from '../src/services/settings';

interface NotificationOption {
  key: keyof UserPreferences;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    key: 'notificationsEnabled',
    title: 'Push Notifications',
    description: 'Receive notifications about your deliveries and earnings',
    icon: 'notifications',
  },
  {
    key: 'zoneAlertsEnabled',
    title: 'Focus Zone Alerts',
    description: 'Get notified when zones heat up near your location',
    icon: 'flame',
  },
  {
    key: 'syncErrorAlertsEnabled',
    title: 'Sync Error Alerts',
    description: 'Get notified when platform sync encounters issues',
    icon: 'warning',
  },
];

export default function NotificationsScreen() {
  const { preferences, isLoading, error, loadPreferences, updatePreference, clearError } =
    useSettingsStore();
  const [updatingKey, setUpdatingKey] = useState<keyof UserPreferences | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = async (key: keyof UserPreferences, newValue: boolean) => {
    setUpdatingKey(key);
    clearError();

    try {
      await updatePreference(key, newValue);
    } catch {
      // Error is already set in store, show alert
      Alert.alert('Error', 'Failed to update preference. Please try again.');
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Description */}
        <Text style={styles.description}>
          Control which notifications you receive. Changes are saved automatically.
        </Text>

        {/* Loading State */}
        {isLoading && !preferences ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#10b981" size="large" />
            <Text style={styles.loadingText}>Loading preferences...</Text>
          </View>
        ) : (
          <>
            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Notification Options */}
            <View style={styles.optionsContainer}>
              {NOTIFICATION_OPTIONS.map((option) => {
                const isEnabled = preferences?.[option.key] ?? true;
                const isUpdating = updatingKey === option.key;

                return (
                  <View key={option.key} style={styles.optionCard}>
                    <View style={styles.optionLeft}>
                      <View style={styles.iconContainer}>
                        <Ionicons name={option.icon} size={24} color="#10b981" />
                      </View>
                      <View style={styles.optionTextContainer}>
                        <Text style={styles.optionTitle}>{option.title}</Text>
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      </View>
                    </View>
                    <View style={styles.switchContainer}>
                      {isUpdating ? (
                        <ActivityIndicator color="#10b981" size="small" />
                      ) : (
                        <Switch
                          value={isEnabled}
                          onValueChange={(value) => handleToggle(option.key, value)}
                          trackColor={{ false: '#27272A', true: '#10b98180' }}
                          thumbColor={isEnabled ? '#10b981' : '#71717A'}
                          ios_backgroundColor="#27272A"
                          disabled={!preferences}
                        />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <Ionicons name="information-circle" size={20} color="#71717A" />
              <Text style={styles.infoText}>
                Disabling push notifications will prevent all app notifications. You can still
                receive alerts within the app.
              </Text>
            </View>
          </>
        )}
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
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  description: {
    fontSize: 15,
    color: '#A1A1AA',
    lineHeight: 22,
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#71717A',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF444420',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#10b98120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#71717A',
    lineHeight: 18,
  },
  switchContainer: {
    width: 51, // Match Switch width to prevent layout shift
    alignItems: 'center',
    marginLeft: 12,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#71717A',
    lineHeight: 18,
  },
});
