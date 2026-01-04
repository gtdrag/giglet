import { create } from 'zustand';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  isBackgroundTrackingActive,
  setTripStateCallback,
  initializeTrackingService,
  getCurrentTripState,
  getActiveTripData,
  forceEndTrip,
  type TripState,
  type ActiveTrip,
  type CompletedTrip,
} from '../services/locationTracking';
import {
  getCachedTripStats,
  calculateTripStats,
  getCompletedTrips,
  type TripStats,
} from '../utils/locationStorage';

const TRACKING_PREFERENCE_KEY = '@giglet/mileage_tracking_enabled';
const SELECTED_PERIOD_KEY = '@giglet/selected_mileage_period';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';
export type PeriodType = 'day' | 'week' | 'month' | 'year';

interface MileageState {
  // Permission and tracking state
  trackingEnabled: boolean;
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  error: string | null;

  // Trip state machine
  tripState: TripState;
  activeTrip: ActiveTrip | null;
  recentTrips: CompletedTrip[];

  // Trip data aggregates
  todayMiles: number;
  weekMiles: number;
  monthMiles: number;
  yearMiles: number;
  todayTrips: number;
  weekTrips: number;
  monthTrips: number;
  yearTrips: number;

  // Period selection
  selectedPeriod: PeriodType;

  // Actions
  checkPermission: () => Promise<void>;
  enableTracking: () => Promise<boolean>;
  disableTracking: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
  loadTrackingPreference: () => Promise<void>;

  // Trip actions
  updateTripState: (state: TripState, activeTrip: ActiveTrip | null) => void;
  onTripCompleted: (trip: CompletedTrip) => Promise<void>;
  loadTripStats: () => Promise<void>;
  loadRecentTrips: () => Promise<void>;
  endCurrentTrip: () => Promise<void>;
  initializeTracking: () => Promise<void>;

  // Period selection actions
  setSelectedPeriod: (period: PeriodType) => Promise<void>;
}

export const useMileageStore = create<MileageState>((set, get) => ({
  // Initial state
  trackingEnabled: false,
  permissionStatus: 'undetermined',
  isLoading: true,
  error: null,
  tripState: 'IDLE',
  activeTrip: null,
  recentTrips: [],
  todayMiles: 0,
  weekMiles: 0,
  monthMiles: 0,
  yearMiles: 0,
  todayTrips: 0,
  weekTrips: 0,
  monthTrips: 0,
  yearTrips: 0,
  selectedPeriod: 'day',

  // Initialize tracking service and set up callbacks
  initializeTracking: async () => {
    try {
      // Initialize the tracking service (loads saved trip state)
      await initializeTrackingService();

      // Set up callback for trip state changes
      setTripStateCallback((state, activeTrip, completedTrip) => {
        set({ tripState: state, activeTrip });

        if (completedTrip) {
          get().onTripCompleted(completedTrip);
        }
      });

      // Sync current state from service
      set({
        tripState: getCurrentTripState(),
        activeTrip: getActiveTripData(),
      });

      // Load saved period preference
      const savedPeriod = await AsyncStorage.getItem(SELECTED_PERIOD_KEY);
      if (savedPeriod && ['day', 'week', 'month', 'year'].includes(savedPeriod)) {
        set({ selectedPeriod: savedPeriod as PeriodType });
      }

      // Load trip stats
      await get().loadTripStats();
      await get().loadRecentTrips();
    } catch (error) {
      console.error('Failed to initialize tracking:', error);
    }
  },

  // Load saved tracking preference on app start
  loadTrackingPreference: async () => {
    try {
      const saved = await AsyncStorage.getItem(TRACKING_PREFERENCE_KEY);
      if (saved === 'true') {
        // Check if permission is still granted
        const { status } = await Location.getBackgroundPermissionsAsync();
        if (status === 'granted') {
          // Check if background tracking is actually running
          const isActive = await isBackgroundTrackingActive();
          set({
            trackingEnabled: true,
            permissionStatus: 'granted',
            isLoading: false,
          });

          // Restart tracking if it was enabled but not running
          if (!isActive) {
            await startBackgroundTracking();
          }
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

      // Initialize tracking service
      await get().initializeTracking();
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
        const trackingEnabled = saved === 'true';
        set({
          permissionStatus,
          trackingEnabled,
          isLoading: false,
        });

        // Ensure tracking is running if enabled
        if (trackingEnabled) {
          const isActive = await isBackgroundTrackingActive();
          if (!isActive) {
            await startBackgroundTracking();
          }
        }
      } else {
        // If permission not granted, tracking cannot be enabled
        if (get().trackingEnabled) {
          await AsyncStorage.setItem(TRACKING_PREFERENCE_KEY, 'false');
          await stopBackgroundTracking();
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

      // Permission granted - start background tracking
      const trackingStarted = await startBackgroundTracking();
      if (!trackingStarted) {
        set({
          isLoading: false,
          error: 'Failed to start background tracking. Please try again.',
        });
        return false;
      }

      // Save preference
      await AsyncStorage.setItem(TRACKING_PREFERENCE_KEY, 'true');

      set({
        permissionStatus: 'granted',
        trackingEnabled: true,
        isLoading: false,
        error: null,
      });

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
      // Stop background tracking
      await stopBackgroundTracking();

      // Save preference
      await AsyncStorage.setItem(TRACKING_PREFERENCE_KEY, 'false');

      set({
        trackingEnabled: false,
        tripState: 'IDLE',
        activeTrip: null,
        error: null,
      });
    } catch (error) {
      console.error('Failed to disable tracking:', error);
      set({ error: 'Failed to disable tracking' });
    }
  },

  // Update trip state (called by tracking service callback)
  updateTripState: (state, activeTrip) => {
    set({ tripState: state, activeTrip });
  },

  // Handle completed trip
  onTripCompleted: async (trip) => {
    console.log('Trip completed:', trip.id, 'Miles:', trip.miles.toFixed(2));

    // Reload stats to reflect new trip
    await get().loadTripStats();
    await get().loadRecentTrips();
  },

  // Load trip statistics
  loadTripStats: async () => {
    try {
      let stats = await getCachedTripStats();
      if (!stats) {
        stats = await calculateTripStats();
      }

      set({
        todayMiles: stats.todayMiles,
        weekMiles: stats.weekMiles,
        monthMiles: stats.monthMiles,
        yearMiles: stats.yearMiles,
        todayTrips: stats.todayTrips,
        weekTrips: stats.weekTrips,
        monthTrips: stats.monthTrips,
        yearTrips: stats.yearTrips,
      });
    } catch (error) {
      console.error('Failed to load trip stats:', error);
    }
  },

  // Load recent trips
  loadRecentTrips: async () => {
    try {
      const trips = await getCompletedTrips();
      // Get last 10 trips
      set({ recentTrips: trips.slice(0, 10) });
    } catch (error) {
      console.error('Failed to load recent trips:', error);
    }
  },

  // Force end current trip
  endCurrentTrip: async () => {
    try {
      const completedTrip = await forceEndTrip();
      if (completedTrip) {
        set({ tripState: 'IDLE', activeTrip: null });
        await get().onTripCompleted(completedTrip);
      }
    } catch (error) {
      console.error('Failed to end trip:', error);
    }
  },

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // Set selected period with persistence
  setSelectedPeriod: async (period) => {
    try {
      await AsyncStorage.setItem(SELECTED_PERIOD_KEY, period);
      set({ selectedPeriod: period });
    } catch (error) {
      console.error('Failed to save selected period:', error);
      // Still update state even if save fails
      set({ selectedPeriod: period });
    }
  },
}));

// Re-export types for convenience
export type { TripState, ActiveTrip, CompletedTrip, TripStats };
