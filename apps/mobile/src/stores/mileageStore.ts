import { create } from 'zustand';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACKING_PREFERENCE_KEY = '@giglet/mileage_tracking_enabled';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface MileageState {
  // Permission and tracking state
  trackingEnabled: boolean;
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  error: string | null;

  // Trip data (will be expanded in later stories)
  todayMiles: number;
  weekMiles: number;
  monthMiles: number;
  yearMiles: number;

  // Actions
  checkPermission: () => Promise<void>;
  enableTracking: () => Promise<boolean>;
  disableTracking: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
  loadTrackingPreference: () => Promise<void>;
}

export const useMileageStore = create<MileageState>((set, get) => ({
  // Initial state
  trackingEnabled: false,
  permissionStatus: 'undetermined',
  isLoading: true,
  error: null,
  todayMiles: 0,
  weekMiles: 0,
  monthMiles: 0,
  yearMiles: 0,

  // Load saved tracking preference on app start
  loadTrackingPreference: async () => {
    try {
      const saved = await AsyncStorage.getItem(TRACKING_PREFERENCE_KEY);
      if (saved === 'true') {
        // Check if permission is still granted
        const { status } = await Location.getBackgroundPermissionsAsync();
        if (status === 'granted') {
          set({ trackingEnabled: true, permissionStatus: 'granted', isLoading: false });
        } else {
          // Permission was revoked, update preference
          await AsyncStorage.setItem(TRACKING_PREFERENCE_KEY, 'false');
          set({
            trackingEnabled: false,
            permissionStatus: status === 'denied' ? 'denied' : 'undetermined',
            isLoading: false,
          });
        }
      } else {
        set({ trackingEnabled: false, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load tracking preference:', error);
      set({ isLoading: false });
    }
  },

  // Check current permission status
  checkPermission: async () => {
    try {
      set({ isLoading: true });
      const { status } = await Location.getBackgroundPermissionsAsync();

      let permissionStatus: PermissionStatus = 'undetermined';
      if (status === 'granted') {
        permissionStatus = 'granted';
      } else if (status === 'denied') {
        permissionStatus = 'denied';
      }

      // If permission is granted, also check if tracking was enabled
      if (permissionStatus === 'granted') {
        const saved = await AsyncStorage.getItem(TRACKING_PREFERENCE_KEY);
        set({
          permissionStatus,
          trackingEnabled: saved === 'true',
          isLoading: false,
        });
      } else {
        // If permission not granted, tracking cannot be enabled
        if (get().trackingEnabled) {
          await AsyncStorage.setItem(TRACKING_PREFERENCE_KEY, 'false');
        }
        set({
          permissionStatus,
          trackingEnabled: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to check permission:', error);
      set({ isLoading: false, error: 'Failed to check location permission' });
    }
  },

  // Enable tracking (requests permission if needed)
  enableTracking: async () => {
    try {
      set({ isLoading: true, error: null });

      // First request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        set({
          permissionStatus: 'denied',
          trackingEnabled: false,
          isLoading: false,
          error: 'Foreground location permission is required',
        });
        return false;
      }

      // Then request background permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        set({
          permissionStatus: 'denied',
          trackingEnabled: false,
          isLoading: false,
          error: 'Background location permission is required for automatic tracking',
        });
        return false;
      }

      // Permission granted - save preference and enable tracking
      await AsyncStorage.setItem(TRACKING_PREFERENCE_KEY, 'true');

      set({
        permissionStatus: 'granted',
        trackingEnabled: true,
        isLoading: false,
        error: null,
      });

      // Note: Background task registration will be implemented in Story 6.2
      // For now, we just set the state

      return true;
    } catch (error) {
      console.error('Failed to enable tracking:', error);
      set({
        isLoading: false,
        error: 'Failed to enable tracking. Please try again.',
      });
      return false;
    }
  },

  // Disable tracking
  disableTracking: async () => {
    try {
      await AsyncStorage.setItem(TRACKING_PREFERENCE_KEY, 'false');

      // Note: Background task will be stopped in Story 6.2
      // For now, we just update the state

      set({
        trackingEnabled: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to disable tracking:', error);
      set({ error: 'Failed to disable tracking' });
    }
  },

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));
