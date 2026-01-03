# Story 6.3: Trip Detection and Logging

Status: done

## Story

**As a** user,
**I want** my trips automatically detected and logged with full details,
**So that** I have accurate, reviewable mileage records for tax purposes.

## Acceptance Criteria

1. **Given** I start driving, **When** speed exceeds 15 mph for 30 seconds, **Then** a new trip begins recording **And** the trip state transitions to MOVING

2. **Given** I am on a trip, **When** I stop for <5 minutes then resume driving, **Then** it's the same trip (not a new one) **And** the pause is handled seamlessly

3. **Given** a trip ends, **When** saved, **Then** I can see: start time, end time, miles, and route points **And** the route is stored efficiently as encoded polyline

## Prerequisites

- Story 6.2 (Background Location Tracking) - Complete

## Tasks / Subtasks

- [x] Task 1: Implement Polyline Route Encoding (AC: 3)
  - [x] Add Google Polyline encoding algorithm to `distance.ts` utility
  - [x] Create `encodePolyline(points: LocationPoint[]): string` function
  - [x] Create `decodePolyline(encoded: string): Array<{lat, lng}>` function
  - [x] Update `CompletedTrip` interface to store `encodedRoute: string` instead of pointCount
  - [x] Modify `saveCompletedTrip()` to encode route before saving
  - [x] Add unit tests for polyline encoding/decoding

- [x] Task 2: Add Trip Detail View UI (AC: 3)
  - [x] Create `TripDetailModal.tsx` component in `apps/mobile/src/components/`
  - [x] Display trip header: date, duration, total miles
  - [x] Show start and end times with timezone-aware formatting
  - [x] Display start and end locations (reverse geocoded addresses)
  - [x] Calculate and display average speed
  - [x] Show IRS tax deduction estimate for this trip
  - [x] Add "Edit" and "Delete" action buttons (functionality in Story 6.6)

- [x] Task 3: Add Route Map Visualization (AC: 3)
  - [x] Add small map preview to TripDetailModal
  - [x] Decode polyline and render as route line on map
  - [x] Show start marker (green) and end marker (red)
  - [x] Fit map bounds to route with padding
  - [x] Use Mapbox Static Images API for lightweight preview (no interactive map needed)

- [x] Task 4: Wire Trip List to Detail Modal (AC: 3)
  - [x] Make trip list items in `mileage.tsx` tappable
  - [x] Pass selected trip data to TripDetailModal
  - [x] Add slide-up animation for modal
  - [x] Handle modal close with back gesture

- [x] Task 5: Add Trip State Machine Unit Tests (AC: 1, 2)
  - [x] Create `apps/mobile/src/services/__tests__/locationTracking.test.ts`
  - [x] Test IDLE → MOVING transition (speed > 6.7 m/s for 30s)
  - [x] Test MOVING → PAUSED transition (stationary <2 m/s for 2 min)
  - [x] Test PAUSED → MOVING transition (resume driving)
  - [x] Test PAUSED → IDLE transition (stationary 5+ min, trip ends)
  - [x] Test GPS drift filtering (speeds > 44.7 m/s rejected)
  - [x] Test smoothed speed calculation from multiple points

- [x] Task 6: Add Distance Calculation Unit Tests (AC: 3)
  - [x] Create `apps/mobile/src/utils/__tests__/distance.test.ts`
  - [x] Test Haversine distance calculation accuracy
  - [x] Test meters to miles conversion
  - [x] Test polyline encoding/decoding round-trip
  - [x] Test total distance calculation with drift filtering

## Dev Notes

### Technical Approach

Story 6.2 implemented the core trip detection state machine and basic trip persistence. This story enhances that foundation with:

1. **Efficient Route Storage**: Encode location points as Google Polyline format (typically 10x compression)
2. **Trip Detail View**: Full trip information display with route visualization
3. **Comprehensive Testing**: Unit tests for state machine and distance calculations

### Polyline Encoding

Google Polyline Algorithm encodes coordinates as ASCII string:
- Coordinates rounded to 5 decimal places (~1.1m precision)
- Delta encoding between consecutive points
- Variable-length encoding for efficiency
- Typical compression: ~10x vs raw lat/lng JSON

Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm

### Route Visualization Options

For the MVP, use lightweight static map approach:
1. **Mapbox Static Images API**: Generate static image URL with polyline overlay
2. No need for interactive map in trip detail (saves bundle size)
3. URL format: `https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/path-5+06B6D4({encoded})/auto/400x200@2x`

### Project Structure Notes

- New component: `apps/mobile/src/components/TripDetailModal.tsx`
- Modified utility: `apps/mobile/src/utils/distance.ts` (add polyline encoding)
- Modified storage: `apps/mobile/src/utils/locationStorage.ts` (encode route on save)
- New tests: `apps/mobile/src/services/__tests__/locationTracking.test.ts`
- New tests: `apps/mobile/src/utils/__tests__/distance.test.ts`
- Modified UI: `apps/mobile/app/(tabs)/mileage.tsx` (wire trip tap to modal)

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Story-6.3] - ACs 7, 8, 9
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Data-Models] - Trip model, LocationPoint
- [Source: docs/epics.md#Story-6.3] - Trip Detection and Logging requirements
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Test-Strategy] - Unit test requirements

### Learnings from Previous Story

**From Story 6-2-background-location-tracking (Status: done)**

- **LocationTrackingService Created**: `apps/mobile/src/services/locationTracking.ts` - contains trip state machine, REUSE this
- **Distance Utility Ready**: `apps/mobile/src/utils/distance.ts` - add polyline encoding here, DO NOT create new file
- **Location Storage Ready**: `apps/mobile/src/utils/locationStorage.ts` - extend `saveCompletedTrip()` to encode route
- **Trip State Machine Working**: IDLE → MOVING → PAUSED → IDLE transitions already implemented at lines 146-237
- **CompletedTrip Interface**: Has `pointCount` field - replace/augment with `encodedRoute` field
- **Mileage UI Pattern**: Recent trips list at `mileage.tsx:189-222` - make items tappable
- **Dark Theme Colors**: `#09090B`, `#18181B`, `#27272A`, `#06B6D4` (cyan accent)
- **Review Note**: "Consider adding unit tests for trip state machine" - this story addresses that

[Source: .bmad-ephemeral/stories/6-2-background-location-tracking.md#Dev-Agent-Record]

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/6-3-trip-detection-and-logging.context.xml`

### Agent Model Used

- Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- None required

### Completion Notes List

1. **Polyline Encoding Implemented**: Added `encodePolyline()` and `decodePolyline()` functions to `distance.ts` using the Google Polyline Algorithm. Achieves 3-10x compression vs raw JSON for route data.

2. **CompletedTrip Interface Extended**: Added optional `encodedRoute?: string` field to maintain backwards compatibility with existing trips while enabling efficient route storage for new trips.

3. **Trip Detail Modal Created**: `TripDetailModal.tsx` follows the existing modal pattern from `ZoneDetailModal.tsx` with:
   - Slide-up animation via PanResponder
   - Swipe-to-dismiss gesture
   - X close button
   - Dark theme styling (#18181B background, #06B6D4 cyan accent)
   - Reverse geocoded addresses using expo-location
   - IRS mileage rate calculation ($0.67/mile for 2024)

4. **Route Map Visualization**: Integrated Mapbox Static Images API for lightweight route preview. Falls back to placeholder when route unavailable or API error.

5. **Trip List Wired to Modal**: Recent trips in mileage.tsx are now tappable with chevron indicator. Selected trip data passed to TripDetailModal for detail view.

6. **Comprehensive Unit Tests**: 47 tests added covering:
   - Distance calculations (Haversine accuracy, unit conversions)
   - Polyline encoding/decoding (round-trip precision, compression ratio)
   - Trip state machine logic (all state transitions, thresholds)
   - GPS drift filtering (speed validation)

7. **Testing Infrastructure**: Set up Vitest for mobile app with `vitest.config.ts` and added test scripts to package.json.

### File List

**Created:**
- `apps/mobile/src/components/TripDetailModal.tsx` - Trip detail modal component
- `apps/mobile/src/utils/__tests__/distance.test.ts` - Distance/polyline unit tests (23 tests)
- `apps/mobile/src/services/__tests__/locationTracking.test.ts` - State machine unit tests (24 tests)
- `apps/mobile/vitest.config.ts` - Vitest configuration

**Modified:**
- `apps/mobile/src/utils/distance.ts` - Added encodePolyline(), decodePolyline() functions
- `apps/mobile/src/services/locationTracking.ts` - Added encodedRoute to CompletedTrip, integrated polyline encoding
- `apps/mobile/app/(tabs)/mileage.tsx` - Made trip list items tappable, added TripDetailModal
- `apps/mobile/package.json` - Added test scripts, vitest devDependency

---

## Senior Developer Review

**Review Date**: 2026-01-03
**Reviewer**: Claude Opus 4.5 (Automated Code Review)
**Outcome**: ✅ APPROVED

### Acceptance Criteria Validation

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| 1 | Trip starts when speed > 15 mph for 30s, state → MOVING | ✅ Verified | `locationTracking.ts:20` SPEED_MOVING_THRESHOLD=6.7 m/s (~15 mph), `locationTracking.ts:24` MOVING_CONFIRM_TIME=30000ms, `locationTracking.ts:149-176` state machine handles IDLE→MOVING transition |
| 2 | Short stops (<5 min) resume same trip seamlessly | ✅ Verified | `locationTracking.ts:26` TRIP_END_TIME=300000ms (5 min), `locationTracking.ts:217-239` PAUSED→MOVING transition logic |
| 3 | Trip saves with start/end time, miles, encoded polyline route | ✅ Verified | `locationTracking.ts:53-65` CompletedTrip interface, `locationTracking.ts:257` encodePolyline() call, `TripDetailModal.tsx:200-264` displays all fields |

### Task Verification

| Task | Subtasks | Status | Evidence |
|------|----------|--------|----------|
| 1. Polyline Route Encoding | 6/6 | ✅ Complete | `distance.ts:105-221` encodePolyline/decodePolyline, `locationTracking.ts:64` encodedRoute field, `distance.test.ts:141-246` tests |
| 2. Trip Detail View UI | 7/7 | ✅ Complete | `TripDetailModal.tsx:77-331` component with header, times, addresses, speed, tax deduction, Edit/Delete buttons |
| 3. Route Map Visualization | 5/5 | ✅ Complete | `TripDetailModal.tsx:166-241` Mapbox Static Images with markers and fallback |
| 4. Wire Trip List to Modal | 4/4 | ✅ Complete | `mileage.tsx:70-78,208-226` Pressable trips, modal state, slide animation |
| 5. Trip State Machine Tests | 6/6 | ✅ Complete | `locationTracking.test.ts:44-395` (24 tests) covering all state transitions |
| 6. Distance Calculation Tests | 4/4 | ✅ Complete | `distance.test.ts:12-246` (23 tests) Haversine, conversions, polyline round-trip |

**Total Tasks**: 6/6 complete (32 subtasks verified)
**Falsely Marked Complete**: 0

### Test Results

```
✓ src/services/__tests__/locationTracking.test.ts (24 tests) 4ms
✓ src/utils/__tests__/distance.test.ts (23 tests) 5ms
Test Files: 2 passed (2)
Tests: 47 passed (47)
```

### Code Quality Assessment

**Strengths:**
- Well-documented polyline algorithm with reference link
- TypeScript interfaces properly defined with optional `encodedRoute` for backwards compatibility
- Comprehensive test coverage (47 tests) including Google's official polyline test case
- Dark theme consistent with design system (#18181B, #06B6D4)
- Follows existing modal pattern from ZoneDetailModal
- Compression ratio verified in tests (3x+ minimum)

**Minor Notes (Non-blocking):**
- Mapbox token placeholder at `TripDetailModal.tsx:26` - noted in comment to use env var
- Edit/Delete buttons UI-only - functionality correctly deferred to Story 6.6

### Security Review

- ✅ No hardcoded credentials (token is placeholder)
- ✅ No SQL injection vectors
- ✅ No XSS vulnerabilities
- ✅ Location data stored locally only

### Architecture Alignment

- ✅ Follows Zustand store pattern
- ✅ Uses AsyncStorage with @giglet/ prefix
- ✅ Modal pattern consistent with existing components
- ✅ Service layer properly separates concerns

