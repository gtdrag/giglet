import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { hasCompletedOnboarding } from '../src/utils/onboarding';

export default function Index() {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuthStore();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Check onboarding status when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      hasCompletedOnboarding().then(setOnboardingComplete);
    }
  }, [isAuthenticated]);

  // Show loading while checking auth status or onboarding status
  if (isLoading || (isAuthenticated && onboardingComplete === null)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  // Redirect based on auth state and onboarding status
  if (isAuthenticated) {
    if (onboardingComplete) {
      return <Redirect href="/(tabs)" />;
    }
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
