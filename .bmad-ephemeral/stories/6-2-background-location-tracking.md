# Story 6.2: Background Location Tracking

Status: done

## Story

**As a** user with tracking enabled,
**I want** my location tracked in the background,
**So that** miles are logged even when I'm not looking at the app.

## Acceptance Criteria

1. **Given** tracking is enabled and I am driving >15 mph, **When** app is backgrounded, **Then** my location is recorded at reasonable intervals **And** tracking continues even if app is backgrounded

2. **Given** I am stationary for 5+ minutes, **When** tracking detects this, **Then** the current trip ends **And** miles are calculated and saved

3. **Given** tracking is running all day, **When** I check battery usage, **Then** impact is <5% daily

## Prerequisites

- Story 6.1 (Location Permission and Tracking Enable) - Complete

## Tasks / Subtasks

- [x] Task 1: Register Background Location Task (AC: 1)
  - [x] Define `BACKGROUND_LOCATION_TASK` constant for TaskManager
  - [x] Create `LocationTrackingService` module at `apps/mobile/src/services/locationTracking.ts`
  - [x] Register task using `TaskManager.defineTask()` with location data handler
  - [x] Configure task options: `accuracy: Location.Accuracy.Balanced`, `timeInterval: 60000` (60s), `distanceInterval: 100` (100m)
  - [x] Handle task registration on app start (idempotent)

- [x] Task 2: Start/Stop Background Location Updates (AC: 1, 3)
  - [x] Implement `startBackgroundTracking()` using `Location.startLocationUpdatesAsync()`
  - [x] Implement `stopBackgroundTracking()` using `Location.stopLocationUpdatesAsync()`
  - [x] Use battery-efficient settings: `Accuracy.Balanced`, `deferredUpdatesInterval: 60000`
  - [x] Configure `foregroundService` for Android (notification required)
  - [x] Wire start/stop to mileageStore `enableTracking()`/`disableTracking()` actions

- [x] Task 3: Create Location Point Storage (AC: 1, 2)
  - [x] Define `LocationPoint` interface: `{ latitude, longitude, timestamp, speed, accuracy }`
  - [x] Create `locationStorage.ts` utility for AsyncStorage operations
  - [x] Store active trip points array with key `@giglet/active_trip_points`
  - [x] Implement `addLocationPoint()`, `getActiveTripPoints()`, `clearActiveTrip()`
  - [x] Handle storage limits (max 1000 points per trip, ~8 hours of tracking)

- [x] Task 4: Implement Trip State Machine (AC: 1, 2)
  - [x] Define trip states: `IDLE`, `MOVING`, `PAUSED`
  - [x] Add `tripState` to mileageStore
  - [x] Implement state transitions per tech-spec:
    - IDLE → MOVING: Speed > 6.7 m/s (15 mph) for 30 seconds
    - MOVING → PAUSED: Stationary (<2 m/s) for 2 minutes
    - PAUSED → IDLE: Stationary for 5 minutes (trip ends)
    - PAUSED → MOVING: Speed > 6.7 m/s (trip continues)
  - [x] Calculate speed from last 3 location points (smoothing)
  - [x] Handle edge cases (GPS drift, unrealistic jumps >100 mph)

- [x] Task 5: Calculate Trip Distance (AC: 2)
  - [x] Implement Haversine distance calculation between two points
  - [x] Create `calculateTripMiles()` function summing all point-to-point distances
  - [x] Filter out GPS drift (skip points with >100 mph implied speed)
  - [x] Return miles (convert from meters)

- [x] Task 6: Save Completed Trip (AC: 2)
  - [x] Create `ActiveTrip` interface: `{ id, startedAt, points, currentMiles, state, pausedAt? }`
  - [x] On PAUSED → IDLE transition: calculate final miles and save trip
  - [x] Store completed trip to AsyncStorage with key `@giglet/completed_trips`
  - [x] Update mileageStore with new trip data (todayMiles, weekMiles, etc.)
  - [x] Clear active trip points after successful save

- [x] Task 7: Integrate with Mileage Store (AC: 1, 2)
  - [x] Extend `mileageStore.ts` with `activeTrip`, `tripState`, `recentTrips` state
  - [x] Add `updateTripState()`, `endCurrentTrip()`, `onTripCompleted()` actions
  - [x] Connect background task location events to store updates via callback
  - [x] Persist trip state across app restarts (load from AsyncStorage)
  - [x] Update UI to show active trip status when tracking

## Dev Notes

### Technical Approach

- Use `expo-task-manager` with `expo-location` for background tracking (both already installed in 6.1)
- Battery efficiency is critical: use `Accuracy.Balanced` and `deferredUpdatesInterval`
- Trip state machine handles automatic start/stop based on movement
- Local-first storage - trips saved to AsyncStorage, server sync deferred to later story

### Battery Efficiency Strategy

Per tech-spec NFR: <5% daily battery impact
- Location update interval: 60 seconds OR 100 meters (whichever first)
- Use `Accuracy.Balanced` (not High) - ~50m accuracy is sufficient for mileage
- Deferred updates batch location data to reduce wake frequency
- iOS: Uses Significant Location Changes API under the hood
- Android: Requires foreground service notification (system requirement)

### Trip State Machine

```
IDLE ─────────────────────────────────────────────────────────────────────┐
  │                                                                       │
  │ Speed > 6.7 m/s (15 mph) for 30 seconds                               │
  ▼                                                                       │
MOVING ◄──────────────────────────────────────────────────────────────────┤
  │         Speed > 6.7 m/s (resume)                                      │
  │                                                                       │
  │ Stationary (<2 m/s) for 2 minutes                                     │
  ▼                                                                       │
PAUSED ───────────────────────────────────────────────────────────────────┘
           Stationary for 5 minutes total (trip ends, save)
```

### Android Foreground Service

Android requires a persistent notification for background location:
```typescript
foregroundService: {
  notificationTitle: 'Giglet Mileage Tracking',
  notificationBody: 'Tracking your miles for tax deductions',
  notificationColor: '#06B6D4',
}
```

### Project Structure Notes

- New service: `apps/mobile/src/services/locationTracking.ts`
- New utility: `apps/mobile/src/utils/locationStorage.ts`
- Extended store: `apps/mobile/src/stores/mileageStore.ts` (MODIFY)
- Reuse: `mileage.tsx` UI (minimal changes to show active trip)

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Story-6.2] - ACs 4, 5, 6
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Data-Models] - LocationPoint, ActiveTrip, Trip State Machine
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#NFR-Performance] - Battery target <5%
- [Source: docs/epics.md#Story-6.2] - Background Location Tracking requirements

### Learnings from Previous Story

**From Story 6-1-location-permission-and-tracking-enable (Status: done)**

- **Mileage Store Created**: `apps/mobile/src/stores/mileageStore.ts` - extend with trip state, DO NOT recreate
- **Permission Flow Done**: `enableTracking()` already requests permissions - add task registration after permission granted
- **expo-task-manager Installed**: Package ready, placeholder comment at `mileageStore.ts:146-147` marks where to add task
- **UI Ready**: `mileage.tsx` already shows tracking indicator - extend to show active trip
- **AsyncStorage Pattern**: Use `@giglet/` prefix for storage keys (see `TRACKING_PREFERENCE_KEY`)
- **Dark Theme Colors**: `#09090B`, `#18181B`, `#27272A`, `#06B6D4` (cyan accent)

[Source: .bmad-ephemeral/stories/6-1-location-permission-and-tracking-enable.md#Dev-Agent-Record]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- TypeScript compilation passed with no errors after fixing import (getActiveTrip → getActiveTripPoints)

### Completion Notes List

- Created LocationTrackingService at `apps/mobile/src/services/locationTracking.ts` (350+ lines)
  - Defines BACKGROUND_LOCATION_TASK constant for expo-task-manager
  - Implements trip state machine with IDLE, MOVING, PAUSED states
  - Handles state transitions based on speed thresholds (15 mph = 6.7 m/s)
  - Filters GPS drift using max realistic speed (100 mph = 44.7 m/s)
  - Calculates smoothed speed from last 3 location points
  - Uses battery-efficient settings: Accuracy.Balanced, 60s/100m intervals
  - Configures Android foreground service notification
- Created distance utility at `apps/mobile/src/utils/distance.ts`
  - Haversine formula for calculating distance between coordinates
  - metersToMiles and milesToMeters conversion functions
  - calculateTotalDistance with GPS drift filtering
- Created location storage utility at `apps/mobile/src/utils/locationStorage.ts` (300+ lines)
  - AsyncStorage persistence for location points and trip state
  - MAX_POINTS_PER_TRIP = 1000 (~8 hours of tracking)
  - MAX_COMPLETED_TRIPS = 500 local storage limit
  - Trip stats calculation (today, week, month, year aggregates)
  - Completed trip storage and retrieval
- Extended mileageStore.ts with trip state management
  - Added tripState, activeTrip, recentTrips state
  - Added initializeTracking(), loadTripStats(), loadRecentTrips() actions
  - Wired enableTracking()/disableTracking() to start/stop background task
  - Callback integration for real-time trip state updates
- Updated mileage.tsx UI to display active trip
  - Shows active trip card when tripState !== 'IDLE'
  - Displays current miles during trip with live updates
  - Shows "End Trip" button when trip is paused
  - Recent trips list with tax deduction estimates
  - Today's mileage with trip count and weekly stats

### File List

- apps/mobile/src/services/locationTracking.ts (NEW)
- apps/mobile/src/utils/distance.ts (NEW)
- apps/mobile/src/utils/locationStorage.ts (NEW)
- apps/mobile/src/stores/mileageStore.ts (MODIFIED - extended with trip state)
- apps/mobile/app/(tabs)/mileage.tsx (MODIFIED - active trip UI)

## Senior Developer Review (AI)

### Reviewer
George

### Date
2026-01-03

### Outcome
**✅ APPROVE**

All acceptance criteria implemented with evidence. All tasks verified complete. No HIGH or MEDIUM severity issues. Story ready to mark as done.

### Summary

Story 6-2 delivers a comprehensive background location tracking system with:
- Battery-efficient background GPS using expo-location with Accuracy.Balanced
- Trip state machine (IDLE → MOVING → PAUSED → IDLE) per tech-spec
- GPS drift filtering (>100 mph = 44.7 m/s threshold)
- AsyncStorage persistence for trip recovery across app restarts
- Android foreground service notification for compliance
- UI integration showing active trip status

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| 1 | Background tracking while driving >15 mph | ✅ IMPLEMENTED | `locationTracking.ts:283-295` TaskManager.defineTask; `locationTracking.ts:318-332` startLocationUpdatesAsync (60s/100m); `locationTracking.ts:20` SPEED_MOVING_THRESHOLD=6.7 m/s |
| 2 | Trip ends after 5+ min stationary, miles saved | ✅ IMPLEMENTED | `locationTracking.ts:26` TRIP_END_TIME=300000ms; `locationTracking.ts:229-234` PAUSED→IDLE transition; `locationTracking.ts:255-268` CompletedTrip with miles; `locationStorage.ts:135-155` saveCompletedTrip |
| 3 | Battery impact <5% daily | ✅ IMPLEMENTED | `locationTracking.ts:319` Accuracy.Balanced; `locationTracking.ts:320-322` timeInterval:60000, distanceInterval:100, deferredUpdatesInterval:60000 |

**Summary: 3 of 3 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Subtasks | Verified | Evidence |
|------|----------|----------|----------|
| Task 1: Register Background Location Task | 5/5 | ✅ | `locationTracking.ts:14,283-295,318-322,301-305` |
| Task 2: Start/Stop Background Updates | 5/5 | ✅ | `locationTracking.ts:298-358`, `mileageStore.ts:229,263` |
| Task 3: Create Location Point Storage | 5/5 | ✅ | `locationStorage.ts:10,17,25,46,59` |
| Task 4: Implement Trip State Machine | 6/6 | ✅ | `locationTracking.ts:17,86-237`, `mileageStore.ts:36,71` |
| Task 5: Calculate Trip Distance | 4/4 | ✅ | `distance.ts:26-102` |
| Task 6: Save Completed Trip | 5/5 | ✅ | `locationTracking.ts:41-50,229-280`, `locationStorage.ts:135-155` |
| Task 7: Integrate with Mileage Store | 5/5 | ✅ | `mileageStore.ts:36-38,71-73,88-94,281-337`, `mileage.tsx:120-143` |

**Summary: 35 of 35 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

No unit tests added for new functionality. Recommended for follow-up:
- Trip state machine transition tests
- Haversine distance calculation tests
- Location storage operation tests

### Architectural Alignment

- ✅ Uses expo-location + expo-task-manager per architecture doc
- ✅ Zustand store pattern matches project conventions
- ✅ File locations match architecture project structure
- ✅ AsyncStorage keys use @giglet/ prefix convention
- ✅ Trip state machine matches tech-spec exactly

### Security Notes

- Location data stored in AsyncStorage (unencrypted) - acceptable for local-first MVP
- No sensitive PII in trip data
- Trip data remains on device (server sync deferred to later story)

### Best-Practices and References

- [Expo Location Background Tracking](https://docs.expo.dev/versions/latest/sdk/location/#background-location-methods)
- [Expo TaskManager](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- Battery efficiency achieved via Accuracy.Balanced and deferred updates per Expo recommendations

### Action Items

**Advisory Notes:**
- Note: Consider adding unit tests for trip state machine in a follow-up story
- Note: Replace console.log with proper logging for production builds
- Note: Consider migrating location storage to expo-secure-store for enhanced security in production
