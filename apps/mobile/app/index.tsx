import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { isAuthenticated, isLoading, setLoading } = useAuthStore();

  useEffect(() => {
    // Simulate checking auth state (e.g., checking secure storage for tokens)
    // In a real app, this would check for stored tokens
    const checkAuth = async () => {
      // Simulate a brief check
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoading(false);
    };
    checkAuth();
  }, [setLoading]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/zones" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090B',
  },
});
