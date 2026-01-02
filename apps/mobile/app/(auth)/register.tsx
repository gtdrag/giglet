import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { AuthError } from '../../src/services/auth';

export default function RegisterScreen() {
  const { register, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/\d/.test(password)) {
      errors.password = 'Password must contain at least 1 number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim() || undefined,
      });

      // Navigate to onboarding for new users
      router.replace('/(auth)/onboarding');
    } catch (err) {
      if (err instanceof AuthError && err.details) {
        const errors: Record<string, string> = {};
        Object.keys(err.details).forEach((key) => {
          errors[key] = err.details![key][0];
        });
        setFieldErrors(errors);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Giglet and start earning smarter</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor="#71717A"
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!isLoading}
                />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, fieldErrors.email && styles.inputError]}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor="#71717A"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, fieldErrors.password && styles.inputError]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder="Min 8 characters, 1 number"
                    placeholderTextColor="#71717A"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <Pressable
                    style={styles.showPasswordButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </View>
                {fieldErrors.password && (
                  <Text style={styles.fieldError}>{fieldErrors.password}</Text>
                )}
              </View>

              {/* Register Button */}
              <Pressable
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#09090B" />
                ) : (
                  <Text style={styles.registerButtonText}>Create Account</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable disabled={isLoading}>
                  <Text style={styles.linkText}>Sign in</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A1A1AA',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorBannerText: {
    color: '#FCA5A5',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: 16,
  },
  inputContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A1A1AA',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FAFAFA',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  showPasswordText: {
    color: '#06B6D4',
    fontSize: 14,
    fontWeight: '600',
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  registerButton: {
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    backgroundColor: '#164E63',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#09090B',
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
