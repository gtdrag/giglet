import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeRevenueCat } from '../src/services/subscriptions';

export default function RootLayout() {
  // Initialize RevenueCat SDK on app startup
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="accounts" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
