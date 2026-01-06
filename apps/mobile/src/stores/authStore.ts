import { create } from 'zustand';
import * as authService from '../services/auth';
import { isLoggedIn, logout as logoutService, deleteAccount as deleteAccountService } from '../services/auth';
import { identifyUser, logoutUser } from '../services/subscriptions';
import { useMileageStore } from './mileageStore';
import { useSubscriptionStore } from './subscriptionStore';
import { router } from 'expo-router';
import { Alert } from 'react-native';

export interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuthenticated: (auth: boolean) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  checkAuthStatus: () => Promise<void>;
  register: (input: authService.RegisterInput) => Promise<void>;
  login: (input: authService.LoginInput) => Promise<void>;
  appleAuth: (input: authService.AppleAuthInput) => Promise<void>;
  googleAuth: (input: authService.GoogleAuthInput) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,

  setAuthenticated: (auth) => set({ isAuthenticated: auth }),

  setUser: (user) => set({ isAuthenticated: true, user, isLoading: false, error: null }),

  logout: async () => {
    // Stop background location tracking if enabled (AC 9.5.2)
    const mileageStore = useMileageStore.getState();
    if (mileageStore.trackingEnabled) {
      await mileageStore.disableTracking();
    }

    // Clear tokens and revoke refresh token on server
    await logoutService();

    // Log out from RevenueCat
    await logoutUser();

    // Reset subscription store to free tier
    useSubscriptionStore.getState().setTier('FREE');

    // Reset auth state
    set({ isAuthenticated: false, user: null, error: null });
  },

  deleteAccount: async () => {
    // Call the API to schedule account deletion
    await deleteAccountService();

    // Stop background location tracking if enabled
    const mileageStore = useMileageStore.getState();
    if (mileageStore.trackingEnabled) {
      await mileageStore.disableTracking();
    }

    // Clear tokens and revoke refresh token on server
    await logoutService();

    // Log out from RevenueCat
    await logoutUser();

    // Reset subscription store to free tier
    useSubscriptionStore.getState().setTier('FREE');

    // Reset auth state
    set({ isAuthenticated: false, user: null, error: null });

    // Show success message and navigate to login
    Alert.alert(
      'Account Deletion Scheduled',
      'Your account has been scheduled for deletion. You can recover your account by logging back in within 30 days.',
      [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  checkAuthStatus: async () => {
    try {
      const loggedIn = await isLoggedIn();
      set({ isAuthenticated: loggedIn, isLoading: false });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.register(input);
      await identifyUser(result.user.id); // Identify user with RevenueCat
      set({
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof authService.AuthError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Registration failed. Please try again.' });
      throw error;
    }
  },

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.login(input);
      await identifyUser(result.user.id); // Identify user with RevenueCat
      set({
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
        error: null,
      });

      // Show recovery message if account was pending deletion
      if (result.accountRecovered) {
        Alert.alert(
          'Account Recovered',
          'Welcome back! Your account deletion has been cancelled.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      if (error instanceof authService.AuthError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Login failed. Please try again.' });
      throw error;
    }
  },

  appleAuth: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.appleAuth(input);
      await identifyUser(result.user.id); // Identify user with RevenueCat
      set({
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof authService.AuthError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Apple Sign In failed. Please try again.' });
      throw error;
    }
  },

  googleAuth: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.googleAuth(input);
      await identifyUser(result.user.id); // Identify user with RevenueCat
      set({
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof authService.AuthError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Google Sign In failed. Please try again.' });
      throw error;
    }
  },
}));
