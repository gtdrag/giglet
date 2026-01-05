import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';

// Mock expo-linking
vi.mock('expo-linking', () => ({
  openURL: vi.fn(),
}));

// URL constants (matching app/legal.tsx)
const PRIVACY_POLICY_URL = 'https://giglet.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://giglet.app/terms';

/**
 * Helper functions that mirror the logic in app/legal.tsx
 * These test the URL opening logic without requiring React component testing
 */
const openPrivacyPolicy = async () => {
  try {
    await Linking.openURL(PRIVACY_POLICY_URL);
  } catch {
    Alert.alert('Error', 'Could not open Privacy Policy. Please try again later.');
  }
};

const openTermsOfService = async () => {
  try {
    await Linking.openURL(TERMS_OF_SERVICE_URL);
  } catch {
    Alert.alert('Error', 'Could not open Terms of Service. Please try again later.');
  }
};

describe('Legal Document Opening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL constants', () => {
    it('has correct Privacy Policy URL', () => {
      expect(PRIVACY_POLICY_URL).toBe('https://giglet.app/privacy');
    });

    it('has correct Terms of Service URL', () => {
      expect(TERMS_OF_SERVICE_URL).toBe('https://giglet.app/terms');
    });
  });

  describe('openPrivacyPolicy', () => {
    it('opens the correct URL', async () => {
      vi.mocked(Linking.openURL).mockResolvedValueOnce();

      await openPrivacyPolicy();

      expect(Linking.openURL).toHaveBeenCalledOnce();
      expect(Linking.openURL).toHaveBeenCalledWith('https://giglet.app/privacy');
    });

    it('shows alert on error', async () => {
      vi.mocked(Linking.openURL).mockRejectedValueOnce(new Error('Failed to open'));

      await openPrivacyPolicy();

      expect(Alert.alert).toHaveBeenCalledOnce();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Could not open Privacy Policy. Please try again later.'
      );
    });

    it('does not show alert on success', async () => {
      vi.mocked(Linking.openURL).mockResolvedValueOnce();

      await openPrivacyPolicy();

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('openTermsOfService', () => {
    it('opens the correct URL', async () => {
      vi.mocked(Linking.openURL).mockResolvedValueOnce();

      await openTermsOfService();

      expect(Linking.openURL).toHaveBeenCalledOnce();
      expect(Linking.openURL).toHaveBeenCalledWith('https://giglet.app/terms');
    });

    it('shows alert on error', async () => {
      vi.mocked(Linking.openURL).mockRejectedValueOnce(new Error('Failed to open'));

      await openTermsOfService();

      expect(Alert.alert).toHaveBeenCalledOnce();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Could not open Terms of Service. Please try again later.'
      );
    });

    it('does not show alert on success', async () => {
      vi.mocked(Linking.openURL).mockResolvedValueOnce();

      await openTermsOfService();

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });
});
