import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePlatformStore } from '../src/stores/platformStore';
import { useAuthStore } from '../src/stores/authStore';
import { useSubscriptionStore, SubscriptionTier } from '../src/stores/subscriptionStore';
import type { Platform as PlatformType } from '../src/services/platforms';

/**
 * Map internal tier to user-friendly display label
 */
function getTierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'PRO_ANNUAL':
      return 'Pro Annual';
    case 'PRO_MONTHLY':
      return 'Pro Monthly';
    case 'FREE':
    default:
      return 'Free';
  }
}

interface PlatformInfo {
  id: PlatformType;
  name: string;
  icon: string;
  color: string;
}

const PLATFORMS: PlatformInfo[] = [
  { id: 'DOORDASH', name: 'DoorDash', icon: 'restaurant', color: '#FF3008' },
  { id: 'UBEREATS', name: 'Uber Eats', icon: 'car', color: '#06C167' },
];

export default function AccountsScreen() {
  const { platforms, isLoading, error, fetchPlatforms, connectPlatform, disconnectPlatform, clearError } =
    usePlatformStore();
  const { logout, deleteAccount } = useAuthStore();
  const { tier, isProUser, loadSubscription } = useSubscriptionStore();
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformInfo | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchPlatforms();
    loadSubscription();
  }, [fetchPlatforms, loadSubscription]);

  const getPlatformStatus = (platformId: PlatformType) => {
    const platform = platforms.find((p) => p.platform === platformId);
    return platform?.status || null;
  };

  const handleConnect = (platform: PlatformInfo) => {
    setConnectingPlatform(platform);
    setEmail('');
    setPassword('');
    setFormError('');
    clearError();
  };

  const handleDisconnect = (platform: PlatformInfo) => {
    Alert.alert('Disconnect ' + platform.name, 'Are you sure you want to disconnect your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            await disconnectPlatform(platform.id);
          } catch {
            Alert.alert('Error', 'Failed to disconnect. Please try again.');
          }
        },
      },
    ]);
  };

  const handleSubmitConnect = async () => {
    if (!connectingPlatform) return;

    // Validate
    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }
    if (!password) {
      setFormError('Password is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await connectPlatform({
        platform: connectingPlatform.id,
        email: email.trim(),
        password,
      });
      setConnectingPlatform(null);
    } catch {
      setFormError(error || 'Failed to connect. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setConnectingPlatform(null);
    setEmail('');
    setPassword('');
    setFormError('');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleOpenDeleteModal = () => {
    setShowDeleteModal(true);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      await deleteAccount();
      setShowDeleteModal(false);
      // Navigate to login with message - the deleteAccount function handles this
    } catch {
      setDeleteError('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isDeleteConfirmed = deleteConfirmText === 'DELETE';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.title}>Connected Accounts</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionDescription}>
          Connect your delivery platform accounts to automatically sync your earnings.
        </Text>

        {isLoading && platforms.length === 0 ? (
          <ActivityIndicator color="#10b981" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.platformList}>
            {PLATFORMS.map((platform) => {
              const status = getPlatformStatus(platform.id);
              const isConnected = status === 'CONNECTED' || status === 'SYNCING';

              return (
                <View key={platform.id} style={styles.platformCard}>
                  <View style={styles.platformInfo}>
                    <View style={[styles.platformIcon, { backgroundColor: platform.color + '20' }]}>
                      <Ionicons name={platform.icon as keyof typeof Ionicons.glyphMap} size={24} color={platform.color} />
                    </View>
                    <View>
                      <Text style={styles.platformName}>{platform.name}</Text>
                      <Text style={[styles.platformStatus, isConnected && styles.connectedStatus]}>
                        {isConnected ? 'Connected' : 'Not connected'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.connectButton, isConnected && styles.disconnectButton]}
                    onPress={() => (isConnected ? handleDisconnect(platform) : handleConnect(platform))}
                  >
                    <Text style={[styles.connectButtonText, isConnected && styles.disconnectButtonText]}>
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.trustSection}>
          <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          <Text style={styles.trustText}>Your credentials are encrypted and stored securely</Text>
        </View>
        <View style={styles.trustSection}>
          <Ionicons name="sync" size={20} color="#10b981" />
          <Text style={styles.trustText}>We only use your login to sync your earnings</Text>
        </View>
        <View style={styles.trustSection}>
          <Ionicons name="close-circle" size={20} color="#10b981" />
          <Text style={styles.trustText}>You can disconnect at any time</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Text style={styles.profileSectionTitle}>Account</Text>
          <Pressable
            style={styles.profileCard}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.profileInfo}>
              <View style={styles.profileIconContainer}>
                <Ionicons name="person" size={24} color="#06B6D4" />
              </View>
              <View style={styles.profileTextContainer}>
                <Text style={styles.profileName}>
                  {useAuthStore.getState().user?.name || 'No name set'}
                </Text>
                <Text style={styles.profileEmail}>
                  {useAuthStore.getState().user?.email || ''}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#71717A" />
          </Pressable>
        </View>

        {/* Notifications Section */}
        <View style={styles.notificationsSection}>
          <Text style={styles.notificationsSectionTitle}>Preferences</Text>
          <Pressable
            style={styles.notificationsCard}
            onPress={() => router.push('/notifications')}
          >
            <View style={styles.notificationsInfo}>
              <View style={styles.notificationsIconContainer}>
                <Ionicons name="notifications" size={24} color="#F59E0B" />
              </View>
              <View style={styles.notificationsTextContainer}>
                <Text style={styles.notificationsTitle}>Notifications</Text>
                <Text style={styles.notificationsHint}>Manage your notification preferences</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#71717A" />
          </Pressable>
        </View>

        {/* Subscription Section */}
        <View style={styles.subscriptionSection}>
          <Text style={styles.subscriptionSectionTitle}>Subscription</Text>
          <Pressable
            style={styles.subscriptionCard}
            onPress={() => router.push('/subscription')}
          >
            <View style={styles.subscriptionInfo}>
              <View style={styles.subscriptionIconContainer}>
                <Ionicons
                  name={isProUser ? 'star' : 'star-outline'}
                  size={24}
                  color={isProUser ? '#10b981' : '#71717A'}
                />
              </View>
              <View>
                <View style={styles.subscriptionTierRow}>
                  <Text style={styles.subscriptionTier}>{getTierLabel(tier)}</Text>
                  {isProUser && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.subscriptionHint}>
                  {isProUser ? 'Manage your subscription' : 'Upgrade to unlock all features'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#71717A" />
          </Pressable>
        </View>

        {/* Legal Section */}
        <View style={styles.legalSection}>
          <Text style={styles.legalSectionTitle}>Legal</Text>
          <Pressable
            style={styles.legalCard}
            onPress={() => router.push('/legal')}
          >
            <View style={styles.legalInfo}>
              <View style={styles.legalIconContainer}>
                <Ionicons name="document-text" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.legalTextContainer}>
                <Text style={styles.legalTitle}>Legal Documents</Text>
                <Text style={styles.legalHint}>Privacy Policy & Terms of Service</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#71717A" />
          </Pressable>
        </View>

        {/* Sign Out Section */}
        <View style={styles.signOutSection}>
          <Pressable
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.dangerZoneSection}>
          <Text style={styles.dangerZoneSectionTitle}>Danger Zone</Text>
          <View style={styles.dangerZoneCard}>
            <View style={styles.dangerZoneInfo}>
              <View style={styles.dangerZoneIconContainer}>
                <Ionicons name="warning" size={24} color="#EF4444" />
              </View>
              <View style={styles.dangerZoneTextContainer}>
                <Text style={styles.dangerZoneTitle}>Delete Account</Text>
                <Text style={styles.dangerZoneHint}>Permanently delete your account and all data</Text>
              </View>
            </View>
            <Pressable
              style={styles.deleteAccountButton}
              onPress={handleOpenDeleteModal}
            >
              <Text style={styles.deleteAccountButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Connection Modal */}
      <Modal visible={!!connectingPlatform} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContent} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Pressable onPress={closeModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#FAFAFA" />
              </Pressable>
              <Text style={styles.modalTitle}>Connect {connectingPlatform?.name}</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalPlatformIcon, { backgroundColor: (connectingPlatform?.color || '#666') + '20' }]}>
                <Ionicons
                  name={(connectingPlatform?.icon || 'apps') as keyof typeof Ionicons.glyphMap}
                  size={48}
                  color={connectingPlatform?.color}
                />
              </View>

              <Text style={styles.modalDescription}>
                Enter your {connectingPlatform?.name} account credentials. Your login information is encrypted
                end-to-end and never shared.
              </Text>

              {formError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setFormError('');
                  }}
                  placeholder="your@email.com"
                  placeholderTextColor="#71717A"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setFormError('');
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor="#71717A"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    editable={!isSubmitting}
                  />
                  <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#71717A" />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitConnect}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FAFAFA" />
                ) : (
                  <Text style={styles.submitButtonText}>Connect Account</Text>
                )}
              </Pressable>

              <View style={styles.modalTrust}>
                <Ionicons name="lock-closed" size={16} color="#71717A" />
                <Text style={styles.modalTrustText}>
                  Your credentials are encrypted with AES-256 and never stored in plain text.
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContent} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Pressable onPress={handleCloseDeleteModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#FAFAFA" />
              </Pressable>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.deleteWarningIcon}>
                <Ionicons name="warning" size={48} color="#EF4444" />
              </View>

              <Text style={styles.deleteWarningTitle}>This action cannot be undone</Text>

              <View style={styles.deleteWarningBox}>
                <Text style={styles.deleteWarningText}>
                  Deleting your account will:
                </Text>
                <View style={styles.deleteWarningList}>
                  <Text style={styles.deleteWarningItem}>• Permanently remove all your data</Text>
                  <Text style={styles.deleteWarningItem}>• Delete your earnings history</Text>
                  <Text style={styles.deleteWarningItem}>• Remove all connected platform accounts</Text>
                  <Text style={styles.deleteWarningItem}>• Cancel any active subscriptions</Text>
                </View>
              </View>

              <View style={styles.deleteGracePeriodBox}>
                <Ionicons name="time" size={20} color="#F59E0B" />
                <View style={styles.deleteGracePeriodText}>
                  <Text style={styles.deleteGracePeriodTitle}>30-Day Grace Period</Text>
                  <Text style={styles.deleteGracePeriodDescription}>
                    Your account will be scheduled for deletion. If you log back in within 30 days, your account will be restored.
                  </Text>
                </View>
              </View>

              {deleteError ? (
                <View style={styles.deleteErrorBanner}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text style={styles.deleteErrorText}>{deleteError}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.deleteInputLabel}>
                  Type <Text style={styles.deleteInputHighlight}>DELETE</Text> to confirm
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.deleteInput,
                    isDeleteConfirmed && styles.deleteInputConfirmed,
                  ]}
                  value={deleteConfirmText}
                  onChangeText={(text) => {
                    setDeleteConfirmText(text);
                    setDeleteError('');
                  }}
                  placeholder="DELETE"
                  placeholderTextColor="#71717A"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isDeleting}
                />
              </View>

              <Pressable
                style={[
                  styles.deleteConfirmButton,
                  !isDeleteConfirmed && styles.deleteConfirmButtonDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={!isDeleteConfirmed || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FAFAFA" />
                ) : (
                  <>
                    <Ionicons name="trash" size={20} color="#FAFAFA" />
                    <Text style={styles.deleteConfirmButtonText}>Delete My Account</Text>
                  </>
                )}
              </Pressable>

              <Pressable style={styles.deleteCancelButton} onPress={handleCloseDeleteModal}>
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#A1A1AA',
    marginBottom: 24,
    lineHeight: 22,
  },
  platformList: {
    gap: 12,
    marginBottom: 32,
  },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  platformStatus: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  connectedStatus: {
    color: '#10b981',
  },
  connectButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disconnectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  disconnectButtonText: {
    color: '#EF4444',
  },
  trustSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  trustText: {
    fontSize: 14,
    color: '#A1A1AA',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  modalPlatformIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalDescription: {
    fontSize: 15,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A1A1AA',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FAFAFA',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  modalTrust: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 16,
  },
  modalTrustText: {
    flex: 1,
    fontSize: 13,
    color: '#71717A',
    lineHeight: 18,
  },
  profileSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  profileSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06B6D420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  profileEmail: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  signOutSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  subscriptionSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  subscriptionSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subscriptionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionTier: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  proBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  subscriptionHint: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  notificationsSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  notificationsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  notificationsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F59E0B20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsTextContainer: {
    flex: 1,
  },
  notificationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  notificationsHint: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  legalSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  legalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  legalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8B5CF620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalTextContainer: {
    flex: 1,
  },
  legalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  legalHint: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  // Danger Zone Styles
  dangerZoneSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    marginBottom: 32,
  },
  dangerZoneSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerZoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  dangerZoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dangerZoneIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EF444420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerZoneTextContainer: {
    flex: 1,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  dangerZoneHint: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  deleteAccountButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteAccountButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  // Delete Modal Styles
  deleteWarningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF444420',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  deleteWarningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteWarningBox: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 16,
  },
  deleteWarningText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 12,
  },
  deleteWarningList: {
    gap: 8,
  },
  deleteWarningItem: {
    fontSize: 14,
    color: '#A1A1AA',
    lineHeight: 20,
  },
  deleteGracePeriodBox: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    marginBottom: 24,
    gap: 12,
  },
  deleteGracePeriodText: {
    flex: 1,
  },
  deleteGracePeriodTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  deleteGracePeriodDescription: {
    fontSize: 13,
    color: '#A1A1AA',
    lineHeight: 18,
  },
  deleteErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF444420',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  deleteErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  deleteInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A1A1AA',
    marginBottom: 8,
  },
  deleteInputHighlight: {
    color: '#EF4444',
    fontWeight: '700',
  },
  deleteInput: {
    borderColor: '#EF444440',
  },
  deleteInputConfirmed: {
    borderColor: '#10b981',
  },
  deleteConfirmButton: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: '#EF444440',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  deleteCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717A',
  },
});
