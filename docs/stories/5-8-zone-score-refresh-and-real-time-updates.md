# Story 5.8: Zone Score Refresh and Real-Time Updates

Status: done

## Story

**As a** user,
**I want** zone scores to update regularly,
**So that** I have current information.

## Acceptance Criteria

1. **Given** I am viewing the map, **When** scores are recalculated (every 15 minutes), **Then** the map updates to show new colors **And** recommendation banner updates **And** I see "Updated X minutes ago" indicator

2. **Given** I pull-to-refresh on the map, **When** refresh completes, **Then** I see the latest zone scores **And** timestamp updates

## Prerequisites

- Story 5.2 (Zone Scoring Algorithm Backend) - Complete
- Story 5.7 (Best Zone Recommendation Banner) - Complete

## Tasks / Subtasks

- [x] Task 1: Add "Updated X minutes ago" timestamp indicator (AC: 1, 2)
  - [x] Add timestamp state to track when zones were last fetched
  - [x] Create LastUpdated component showing relative time ("Updated 5 min ago")
  - [x] Position indicator in map legend or header area
  - [x] Update timestamp text every minute (relative time stays current)

- [x] Task 2: Implement automatic zone refresh polling (AC: 1)
  - [x] Add useEffect interval to poll for zone updates every 15 minutes
  - [x] Only poll when app is in foreground (use AppState)
  - [x] Clear interval on component unmount
  - [x] Ensure smooth zone color transitions (no flash)

- [x] Task 3: Implement manual refresh button (AC: 2)
  - [x] Add refresh button next to center-on-user button
  - [x] Show loading indicator during refresh
  - [x] Call `handleRefresh` on button press
  - [x] Update timestamp on successful refresh
  - Note: Changed from pull-to-refresh to button since MapView doesn't support ScrollView wrapping

- [x] Task 4: Ensure banner updates on refresh (AC: 1)
  - [x] Verify RecommendationBanner re-renders when zones prop changes
  - [x] Banner recommendation changes when scores change (uses React props reactivity)
  - [x] No additional work needed - props-based update works correctly

## Dev Notes

### Technical Approach

- Use `setInterval` for polling with 15-minute intervals (900000ms)
- Use `AppState` from react-native to detect foreground/background
- For pull-to-refresh, consider `react-native-maps` doesn't support ScrollView - may need alternative approach:
  - Option A: Add refresh button (like existing centerOnUser button)
  - Option B: Use gesture handler for pull-down detection
  - Option C: Tap header to refresh
- Relative time formatting: use `Date.now() - lastFetched` to calculate minutes

### Project Structure Notes

- Modify: `apps/mobile/app/(tabs)/index.tsx` (add polling, timestamp, refresh)
- New component (optional): `apps/mobile/src/components/LastUpdated.tsx`
- Reuse: existing `loadZonesWithAnimation` function for refresh

### References

- [Source: docs/epics.md#Story-5.8] - Acceptance criteria and technical notes
- [Source: docs/architecture.md] - React Native patterns
- [Source: docs/PRD.md#Future-Considerations] - Real-time zone alerts (related future feature)

### Learnings from Previous Story

**From Story 5-7-best-zone-recommendation-banner (Status: done)**

- **RecommendationBanner Integration**: Banner already responds to zones prop changes - no additional work needed for AC1 banner updates
- **Map Integration**: `loadZonesWithAnimation` function fetches and animates zones - reuse for refresh
- **Cached Zone Data**: Modal now uses cached zone data (not fresh API call) - timestamp applies to this cached data
- **File Modified**: `apps/mobile/app/(tabs)/index.tsx` - add polling/refresh to this file
- **Review Note**: Consider consolidating duplicate Haversine implementations in future refactoring

[Source: docs/stories/5-7-best-zone-recommendation-banner.md#Senior-Developer-Review]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

- Changed from pull-to-refresh to manual refresh button since react-native-maps MapView doesn't support ScrollView wrapping
- Added `formatRelativeTime` utility function for human-readable timestamps
- Auto-refresh uses AppState to only poll when app is in foreground (saves battery)
- Refresh button shows ActivityIndicator while loading
- Banner updates automatically via React props reactivity (no additional work needed)

### File List

- apps/mobile/app/(tabs)/index.tsx (MODIFIED)

---

## Senior Developer Review (AI)

**Reviewer:** George
**Date:** 2026-01-03
**Outcome:** ✅ APPROVE

### Summary

Story 5.8 has been fully implemented. The map now auto-refreshes zones every 15 minutes (only when app is in foreground), displays an "Updated X min ago" timestamp that updates every minute, and provides a manual refresh button. The RecommendationBanner updates automatically via React props reactivity. Implementation adapted from pull-to-refresh to manual button due to MapView limitations.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | Auto-refresh every 15 min + map updates + banner updates + timestamp indicator | ✅ IMPLEMENTED | index.tsx:8-9, :98-119, :68-69, :368-373, :83-96 |
| AC2 | Manual refresh shows latest scores + timestamp updates | ✅ IMPLEMENTED | index.tsx:379-389, :187-201, :193-195 |

**Summary: 2 of 2 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Status | Evidence |
|------|--------|----------|
| Task 1: Add timestamp indicator | ✅ VERIFIED | formatRelativeTime, lastUpdated state, timestampContainer UI |
| Task 2: Implement auto-refresh polling | ✅ VERIFIED | REFRESH_INTERVAL_MS, AppState check, cleanup |
| Task 3: Implement manual refresh button | ✅ VERIFIED | bottomButtons, handleRefresh, ActivityIndicator |
| Task 4: Ensure banner updates | ✅ VERIFIED | React props reactivity on zones prop |

**Summary: 15 of 15 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

- No unit tests added for this story
- Note: Polling and refresh logic would benefit from unit tests in future

### Architectural Alignment

- ✅ Follows React Native patterns from architecture.md
- ✅ Uses AppState for battery-efficient polling
- ✅ Proper useEffect cleanup patterns
- ✅ Consistent dark theme styling

### Security Notes

- No security concerns - uses existing zones service API

### Best-Practices and References

- [React Native AppState](https://reactnative.dev/docs/appstate) - Used correctly for foreground detection
- [React useEffect cleanup](https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development) - Proper interval cleanup

### Action Items

**Advisory Notes:**
- Note: Consider adding unit tests for polling logic in future stories
- Note: ESLint may flag handleRefresh in useEffect deps - code works but could be reordered for clarity

