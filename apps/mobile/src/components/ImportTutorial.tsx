/**
 * ImportTutorial - Step-by-step tutorial for exporting CSV from delivery platforms
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Platform = 'DOORDASH' | 'UBEREATS';

interface ImportTutorialProps {
  platform: Platform;
  onContinue: () => void;
  onSkip: () => void;
}

// Tutorial storage key
const TUTORIAL_SEEN_KEY = 'import_tutorial_seen';

// Platform deep links configuration
const PLATFORM_DEEP_LINKS = {
  DOORDASH: {
    app: 'doordash-dasher://',
    web: 'https://dasher.doordash.com/',
  },
  UBEREATS: {
    app: 'uberdriver://',
    web: 'https://drivers.uber.com/',
  },
};

// Platform styling
const PLATFORM_COLORS = {
  DOORDASH: '#FF3008',
  UBEREATS: '#06C167',
};

const PLATFORM_NAMES = {
  DOORDASH: 'DoorDash Dasher',
  UBEREATS: 'Uber Driver',
};

// Tutorial steps by platform
const TUTORIAL_STEPS = {
  DOORDASH: [
    {
      title: 'Open DoorDash Dasher app',
      description: 'Launch the DoorDash Dasher app on your device',
      icon: 'phone-portrait-outline' as const,
    },
    {
      title: 'Go to Earnings section',
      description: 'Tap on the Earnings tab at the bottom of the screen',
      icon: 'wallet-outline' as const,
    },
    {
      title: 'Tap menu and Download History',
      description: 'Tap the menu icon (•••) and select "Download History"',
      icon: 'ellipsis-horizontal' as const,
    },
    {
      title: 'Select date range',
      description: 'Choose the date range for your earnings and tap Download CSV',
      icon: 'calendar-outline' as const,
    },
    {
      title: 'Return to Giglet',
      description: 'Come back here and select the downloaded CSV file',
      icon: 'checkmark-circle-outline' as const,
    },
  ],
  UBEREATS: [
    {
      title: 'Open Uber Driver app',
      description: 'Launch the Uber Driver app on your device',
      icon: 'phone-portrait-outline' as const,
    },
    {
      title: 'Go to Earnings Activity',
      description: 'Navigate to Earnings and tap on Earnings Activity',
      icon: 'wallet-outline' as const,
    },
    {
      title: 'Tap Download or Export',
      description: 'Look for the Download or Export option in the menu',
      icon: 'download-outline' as const,
    },
    {
      title: 'Select date range',
      description: 'Choose the date range for your trips and download CSV',
      icon: 'calendar-outline' as const,
    },
    {
      title: 'Return to Giglet',
      description: 'Come back here and select the downloaded CSV file',
      icon: 'checkmark-circle-outline' as const,
    },
  ],
};

/**
 * Check if tutorial has been seen before
 */
export async function hasTutorialBeenSeen(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark tutorial as seen (don't show again)
 */
export async function markTutorialAsSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  } catch {
    // Silently fail - preference not critical
  }
}

/**
 * Reset tutorial preference (show again)
 */
export async function resetTutorialPreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_SEEN_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * Open platform app or web fallback
 */
export async function openPlatformEarnings(platform: Platform): Promise<void> {
  const links = PLATFORM_DEEP_LINKS[platform];

  try {
    // Try to open the app first
    const canOpenApp = await Linking.canOpenURL(links.app);

    if (canOpenApp) {
      await Linking.openURL(links.app);
    } else {
      // Fall back to web
      await Linking.openURL(links.web);
    }
  } catch (error) {
    // If all else fails, try the web URL
    try {
      await Linking.openURL(links.web);
    } catch {
      Alert.alert(
        'Unable to Open',
        `Could not open ${PLATFORM_NAMES[platform]}. Please open the app manually.`,
        [{ text: 'OK' }]
      );
    }
  }
}

export function ImportTutorial({ platform, onContinue, onSkip }: ImportTutorialProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const steps = TUTORIAL_STEPS[platform];
  const platformColor = PLATFORM_COLORS[platform];
  const platformName = PLATFORM_NAMES[platform];

  const handleOpenApp = async () => {
    await openPlatformEarnings(platform);
  };

  const handleContinue = async () => {
    if (dontShowAgain) {
      await markTutorialAsSeen();
    }
    onContinue();
  };

  const handleSkip = async () => {
    if (dontShowAgain) {
      await markTutorialAsSeen();
    }
    onSkip();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: platformColor + '20' }]}>
          <Ionicons
            name={platform === 'DOORDASH' ? 'car' : 'bicycle'}
            size={28}
            color={platformColor}
          />
        </View>
        <Text style={styles.title}>Export from {platformName}</Text>
        <Text style={styles.subtitle}>
          Follow these steps to download your earnings CSV
        </Text>
      </View>

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: platformColor }]}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Ionicons name={step.icon} size={18} color="#A1A1AA" />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Open App Button */}
      <Pressable
        style={[styles.openAppButton, { backgroundColor: platformColor }]}
        onPress={handleOpenApp}
      >
        <Ionicons name="open-outline" size={20} color="#FFFFFF" />
        <Text style={styles.openAppButtonText}>Open {platformName}</Text>
      </Pressable>

      {/* Don't Show Again Checkbox */}
      <Pressable
        style={styles.checkboxRow}
        onPress={() => setDontShowAgain(!dontShowAgain)}
      >
        <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
          {dontShowAgain && (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          )}
        </View>
        <Text style={styles.checkboxLabel}>Don't show this again</Text>
      </Pressable>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
        <Pressable
          style={[styles.continueButton, { backgroundColor: platformColor }]}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue to Import</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
  },
  stepsContainer: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  stepDescription: {
    fontSize: 13,
    color: '#71717A',
    lineHeight: 18,
    paddingLeft: 24,
  },
  openAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  openAppButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#52525B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#71717A',
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
