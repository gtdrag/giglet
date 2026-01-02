import { useState, useEffect } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../../src/stores/authStore';
import { AuthError, forgotPassword } from '../../src/services/auth';
import { hasCompletedOnboarding } from '../../src/utils/onboarding';

export default function LoginScreen() {
  const { login, appleAuth, googleAuth, isLoading, error } = useAuthStore();
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  // Navigate based on onboarding status
  const navigateAfterAuth = async (isNewUser: boolean = false) => {
    if (isNewUser) {
      router.replace('/(auth)/onboarding');
      return;
    }
    // For returning users, check if they've completed onboarding
    const completed = await hasCompletedOnboarding();
    if (completed) {
      router.replace('/(tabs)/zones');
    } else {
      router.replace('/(auth)/onboarding');
    }
  };

  // Configure Google Sign In and check Apple availability on mount
  useEffect(() => {
    // Configure Google Sign In
    GoogleSignin.configure({
      // Web client ID for token verification (required for backend verification)
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });

    // Check Apple Sign In availability (iOS only)
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type === 'success' && response.data.idToken) {
        await googleAuth({ idToken: response.data.idToken });
        await navigateAfterAuth();
      }
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled, don't show error
        return;
      }
      // Other errors are handled by the store
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      await appleAuth({
        identityToken: credential.identityToken,
        user: credential.user,
        email: credential.email || undefined,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName,
              familyName: credential.fullName.familyName,
            }
          : undefined,
      });

      await navigateAfterAuth();
    } catch (err) {
      // User cancelled or error - error is set in store
      if ((err as Error).message?.includes('cancelled')) {
        // User cancelled, don't show error
        return;
      }
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });

      // Navigate based on onboarding status
      await navigateAfterAuth();
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

  const handleForgotPassword = async () => {
    // Validate email
    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordEmail)) {
      setForgotPasswordError('Please enter a valid email');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError('');

    try {
      await forgotPassword({ email: forgotPasswordEmail.trim().toLowerCase() });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
      Alert.alert(
        'Check Your Email',
        'If an account exists with that email, you will receive password reset instructions.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      if (err instanceof AuthError) {
        setForgotPasswordError(err.message);
      } else {
        setForgotPasswordError('Something went wrong. Please try again.');
      }
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotPasswordEmail(email); // Pre-fill with login email if entered
    setForgotPasswordError('');
    setShowForgotPassword(true);
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
            <Text style={styles.title}>Giglet</Text>
            <Text style={styles.subtitle}>Stop guessing. Start earning.</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
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
                    placeholder="Enter your password"
                    placeholderTextColor="#71717A"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="current-password"
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
                <Pressable onPress={openForgotPassword} style={styles.forgotPasswordLink}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </Pressable>
              </View>

              {/* Login Button */}
              <Pressable
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#09090B" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </Pressable>

              {/* Social Sign In Options */}
              {(appleAuthAvailable || true) && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Apple Sign In (iOS only) */}
                  {Platform.OS === 'ios' && appleAuthAvailable && (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                      cornerRadius={12}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                  )}

                  {/* Google Sign In (iOS and Android) */}
                  <GoogleSigninButton
                    style={styles.googleButton}
                    size={GoogleSigninButton.Size.Wide}
                    color={GoogleSigninButton.Color.Light}
                    onPress={handleGoogleSignIn}
                    disabled={isLoading}
                  />
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable disabled={isLoading}>
                  <Text style={styles.linkText}>Sign up</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowForgotPassword(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <View style={styles.modalCloseButton} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>

            {forgotPasswordError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{forgotPasswordError}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={forgotPasswordEmail}
                onChangeText={(text) => {
                  setForgotPasswordEmail(text);
                  setForgotPasswordError('');
                }}
                placeholder="you@example.com"
                placeholderTextColor="#71717A"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                autoFocus
                editable={!forgotPasswordLoading}
              />
            </View>

            <Pressable
              style={[styles.loginButton, forgotPasswordLoading && styles.loginButtonDisabled]}
              onPress={handleForgotPassword}
              disabled={forgotPasswordLoading}
            >
              {forgotPasswordLoading ? (
                <ActivityIndicator color="#09090B" />
              ) : (
                <Text style={styles.loginButtonText}>Send Reset Email</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
    fontSize: 48,
    fontWeight: 'bold',
    color: '#06B6D4',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#A1A1AA',
    marginBottom: 32,
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
  loginButton: {
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#164E63',
  },
  loginButtonText: {
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272A',
  },
  dividerText: {
    color: '#71717A',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: 12,
  },
  googleButton: {
    width: '100%',
    height: 50,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#06B6D4',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  modalCloseButton: {
    width: 60,
  },
  modalCloseText: {
    color: '#06B6D4',
    fontSize: 16,
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    color: '#A1A1AA',
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
});
