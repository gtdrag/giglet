import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  addLocationPoint,
  getActiveTripPoints,
  clearActiveTrip,
  saveCompletedTrip,
  loadTripState,
  saveTripState,
} from '../utils/locationStorage';
import { calculateDistance, metersToMiles, encodePolyline } from '../utils/distance';

// Background task name - must be unique and consistent
export const BACKGROUND_LOCATION_TASK = 'giglet-background-location-task';

// Trip state machine states
export type TripState = 'IDLE' | 'MOVING' | 'PAUSED';

// Speed thresholds (m/s)
const SPEED_MOVING_THRESHOLD = 6.7; // ~15 mph
const SPEED_STATIONARY_THRESHOLD = 2.0; // ~4.5 mph

// Time thresholds (ms)
const MOVING_CONFIRM_TIME = 30000; // 30 seconds to confirm moving
const PAUSE_CONFIRM_TIME = 120000; // 2 minutes to confirm paused
const TRIP_END_TIME = 300000; // 5 minutes to end trip

// Max speed filter - GPS drift protection (m/s, ~100 mph)
const MAX_REALISTIC_SPEED = 44.7;

// Location point interface
export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
  accuracy: number;
}

// Active trip interface
export interface ActiveTrip {
  id: string;
  startedAt: Date;
  points: LocationPoint[];
  currentMiles: number;
  state: TripState;
  pausedAt?: Date;
  stateChangedAt: Date;
  lastMovingAt?: Date;
}

// Completed trip interface (for storage)
export interface CompletedTrip {
  id: string;
  startedAt: string;
  endedAt: string;
  miles: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  pointCount: number;
  isManual: boolean;
  encodedRoute?: string; // Google Polyline encoded route for efficient storage
}

// Trip state change callback type
type TripStateCallback = (
  state: TripState,
  activeTrip: ActiveTrip | null,
  completedTrip?: CompletedTrip
) => void;

// In-memory state for the background task
let currentTripState: TripState = 'IDLE';
let activeTrip: ActiveTrip | null = null;
let stateChangedAt: Date = new Date();
let lastMovingAt: Date | null = null;
let onTripStateChange: TripStateCallback | null = null;

// Generate unique trip ID
const generateTripId = (): string => {
  return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate smoothed speed from last N points
const calculateSmoothedSpeed = (points: LocationPoint[], n: number = 3): number => {
  if (points.length < 2) return 0;

  const recentPoints = points.slice(-n);
  if (recentPoints.length < 2) return 0;

  let totalDistance = 0;
  let totalTime = 0;

  for (let i = 1; i < recentPoints.length; i++) {
    const prev = recentPoints[i - 1];
    const curr = recentPoints[i];
    totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    totalTime += (curr.timestamp - prev.timestamp) / 1000; // Convert to seconds
  }

  if (totalTime === 0) return 0;
  return totalDistance / totalTime; // m/s
};

// Check if speed implies unrealistic GPS jump
const isRealisticSpeed = (speed: number): boolean => {
  return speed >= 0 && speed <= MAX_REALISTIC_SPEED;
};

// Process location update and handle state transitions
const processLocationUpdate = async (location: Location.LocationObject): Promise<void> => {
  const point: LocationPoint = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp,
    speed: location.coords.speed,
    accuracy: location.coords.accuracy ?? 50,
  };

  const now = new Date();
  const timeSinceStateChange = now.getTime() - stateChangedAt.getTime();

  // Get current speed (use reported speed or calculate from points)
  let currentSpeed = point.speed ?? 0;

  // If we have an active trip, calculate smoothed speed
  if (activeTrip && activeTrip.points.length >= 2) {
    const tempPoints = [...activeTrip.points, point];
    const smoothedSpeed = calculateSmoothedSpeed(tempPoints);
    // Use smoothed speed if reported speed seems off
    if (Math.abs(currentSpeed - smoothedSpeed) > 5) {
      currentSpeed = smoothedSpeed;
    }
  }

  // Filter out unrealistic GPS jumps
  if (!isRealisticSpeed(currentSpeed)) {
    console.log('[LocationTracking] Filtered unrealistic speed:', currentSpeed);
    return;
  }

  const isMoving = currentSpeed > SPEED_MOVING_THRESHOLD;
  const isStationary = currentSpeed < SPEED_STATIONARY_THRESHOLD;

  // State machine transitions
  switch (currentTripState) {
    case 'IDLE':
      if (isMoving) {
        // Check if we've been moving long enough to start a trip
        if (!lastMovingAt) {
          lastMovingAt = now;
        } else if (now.getTime() - lastMovingAt.getTime() >= MOVING_CONFIRM_TIME) {
          // Start a new trip
          activeTrip = {
            id: generateTripId(),
            startedAt: new Date(lastMovingAt),
            points: [point],
            currentMiles: 0,
            state: 'MOVING',
            stateChangedAt: now,
            lastMovingAt: now,
          };
          currentTripState = 'MOVING';
          stateChangedAt = now;
          lastMovingAt = now;
          await saveTripState(currentTripState, activeTrip);
          onTripStateChange?.('MOVING', activeTrip);
          console.log('[LocationTracking] Trip started:', activeTrip.id);
        }
      } else {
        // Reset moving timer if stopped
        lastMovingAt = null;
      }
      break;

    case 'MOVING':
      if (activeTrip) {
        // Add point to trip
        activeTrip.points.push(point);
        activeTrip.lastMovingAt = now;

        // Calculate cumulative distance
        if (activeTrip.points.length >= 2) {
          const prevPoint = activeTrip.points[activeTrip.points.length - 2];
          const distance = calculateDistance(
            prevPoint.latitude,
            prevPoint.longitude,
            point.latitude,
            point.longitude
          );
          activeTrip.currentMiles += metersToMiles(distance);
        }

        await addLocationPoint(point);
        await saveTripState(currentTripState, activeTrip);

        if (isStationary && timeSinceStateChange >= PAUSE_CONFIRM_TIME) {
          // Transition to PAUSED
          currentTripState = 'PAUSED';
          activeTrip.state = 'PAUSED';
          activeTrip.pausedAt = now;
          activeTrip.stateChangedAt = now;
          stateChangedAt = now;
          await saveTripState(currentTripState, activeTrip);
          onTripStateChange?.('PAUSED', activeTrip);
          console.log('[LocationTracking] Trip paused');
        } else if (isMoving) {
          // Reset state change timer when still moving
          stateChangedAt = now;
          activeTrip.stateChangedAt = now;
        }
      }
      break;

    case 'PAUSED':
      if (activeTrip) {
        if (isMoving) {
          // Resume trip
          currentTripState = 'MOVING';
          activeTrip.state = 'MOVING';
          activeTrip.pausedAt = undefined;
          activeTrip.stateChangedAt = now;
          activeTrip.lastMovingAt = now;
          stateChangedAt = now;
          await saveTripState(currentTripState, activeTrip);
          onTripStateChange?.('MOVING', activeTrip);
          console.log('[LocationTracking] Trip resumed');
        } else if (timeSinceStateChange >= TRIP_END_TIME - PAUSE_CONFIRM_TIME) {
          // End trip after 5 minutes total stationary (2 min pause + 3 min more)
          const completedTrip = await endCurrentTrip();
          if (completedTrip) {
            onTripStateChange?.('IDLE', null, completedTrip);
          }
        }
      }
      break;
  }
};

// End the current trip and save it
const endCurrentTrip = async (): Promise<CompletedTrip | null> => {
  if (!activeTrip || activeTrip.points.length < 2) {
    console.log('[LocationTracking] Cannot end trip: not enough points');
    currentTripState = 'IDLE';
    activeTrip = null;
    stateChangedAt = new Date();
    await clearActiveTrip();
    return null;
  }

  const firstPoint = activeTrip.points[0];
  const lastPoint = activeTrip.points[activeTrip.points.length - 1];

  // Encode route as polyline for efficient storage
  const encodedRoute = encodePolyline(activeTrip.points);

  const completedTrip: CompletedTrip = {
    id: activeTrip.id,
    startedAt: activeTrip.startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    miles: activeTrip.currentMiles,
    startLat: firstPoint.latitude,
    startLng: firstPoint.longitude,
    endLat: lastPoint.latitude,
    endLng: lastPoint.longitude,
    pointCount: activeTrip.points.length,
    isManual: false,
    encodedRoute,
  };

  await saveCompletedTrip(completedTrip);
  await clearActiveTrip();

  currentTripState = 'IDLE';
  activeTrip = null;
  stateChangedAt = new Date();
  lastMovingAt = null;

  await saveTripState(currentTripState, null);
  console.log('[LocationTracking] Trip ended:', completedTrip.id, 'Miles:', completedTrip.miles.toFixed(2));

  return completedTrip;
};

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[LocationTracking] Background task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    for (const location of locations) {
      await processLocationUpdate(location);
    }
  }
});

// Start background location tracking
export const startBackgroundTracking = async (): Promise<boolean> => {
  try {
    // Check if already tracking
    const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isTracking) {
      console.log('[LocationTracking] Already tracking');
      return true;
    }

    // Load saved trip state
    const savedState = await loadTripState();
    if (savedState) {
      currentTripState = savedState.state;
      activeTrip = savedState.activeTrip;
      stateChangedAt = savedState.activeTrip?.stateChangedAt
        ? new Date(savedState.activeTrip.stateChangedAt)
        : new Date();
    }

    // Start location updates with battery-efficient settings
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // 60 seconds
      distanceInterval: 100, // 100 meters
      deferredUpdatesInterval: 60000, // Batch updates every 60 seconds
      deferredUpdatesDistance: 100, // Or every 100 meters
      showsBackgroundLocationIndicator: true, // iOS: show blue bar
      foregroundService: {
        notificationTitle: 'Giglet Mileage Tracking',
        notificationBody: 'Tracking your miles for tax deductions',
        notificationColor: '#06B6D4',
      },
      pausesUpdatesAutomatically: false, // Keep tracking even when stationary
      activityType: Location.ActivityType.AutomotiveNavigation,
    });

    console.log('[LocationTracking] Background tracking started');
    return true;
  } catch (error) {
    console.error('[LocationTracking] Failed to start tracking:', error);
    return false;
  }
};

// Stop background location tracking
export const stopBackgroundTracking = async (): Promise<void> => {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('[LocationTracking] Background tracking stopped');
    }

    // End any active trip
    if (activeTrip) {
      await endCurrentTrip();
    }
  } catch (error) {
    console.error('[LocationTracking] Failed to stop tracking:', error);
  }
};

// Check if background tracking is active
export const isBackgroundTrackingActive = async (): Promise<boolean> => {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
};

// Set callback for trip state changes
export const setTripStateCallback = (callback: TripStateCallback | null): void => {
  onTripStateChange = callback;
};

// Get current trip state
export const getCurrentTripState = (): TripState => currentTripState;

// Get active trip
export const getActiveTripData = (): ActiveTrip | null => activeTrip;

// Force end current trip (for manual control)
export const forceEndTrip = async (): Promise<CompletedTrip | null> => {
  return endCurrentTrip();
};

// Initialize tracking service (call on app start)
export const initializeTrackingService = async (): Promise<void> => {
  const savedState = await loadTripState();
  if (savedState) {
    currentTripState = savedState.state;
    activeTrip = savedState.activeTrip;
    if (savedState.activeTrip?.stateChangedAt) {
      stateChangedAt = new Date(savedState.activeTrip.stateChangedAt);
    }
  }
};
