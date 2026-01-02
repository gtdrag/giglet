import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function LoginScreen() {
  const { login } = useAuthStore();

  const handleSkipToApp = () => {
    // Simulate login for testing navigation
    login({ id: 'test-user', email: 'test@example.com' });
    router.replace('/(tabs)/zones');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Giglet</Text>
        <Text style={styles.subtitle}>Stop guessing. Start earning.</Text>

        {/* TODO: Implement login form */}
        <View style={styles.form}>
          <Text style={styles.placeholder}>Login form placeholder</Text>
        </View>

        {/* Skip to App button for testing navigation */}
        <Pressable style={styles.skipButton} onPress={handleSkipToApp}>
          <Text style={styles.skipButtonText}>Skip to App (Dev Only)</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.linkText}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#06B6D4',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#A1A1AA',
    marginBottom: 48,
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  placeholder: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
  },
  skipButton: {
    backgroundColor: '#18181B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#06B6D4',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#71717A',
  },
  linkText: {
    fontSize: 14,
    color: '#06B6D4',
    fontWeight: '600',
  },
});
