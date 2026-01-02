# Story 5.1: Focus Zones Map Display

**Epic:** 5 - Giglet Focus Zones
**Story ID:** 5.1
**Status:** done
**Priority:** P0
**Created:** 2026-01-02

---

## User Story

**As a** user,
**I want** to see a map with Focus Zones,
**So that** I can visualize where delivery opportunities are.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Map loads centered on current location | GPS location used |
| AC2 | Location permission requested if needed | Permission flow works |
| AC3 | Current location marker displayed | Blue dot or similar |
| AC4 | Map is pannable and zoomable | Smooth interaction |
| AC5 | Map tab accessible from bottom nav | Navigation works |

**Note:** Zone overlays will be added in Story 5.2+ after scoring backend is complete.

---

## Tasks

### Task 1: Install Map Library
- [x] Evaluate react-native-maps vs @rnmapbox/maps (chose react-native-maps)
- [x] Install chosen library with Expo compatibility
- [x] No API key needed for Apple Maps on iOS

### Task 2: Request Location Permission
- [x] Add expo-location package
- [x] Request foreground location permission
- [x] Handle permission denied gracefully (shows error banner, uses default location)

### Task 3: Create Map Screen
- [x] Update ZonesScreen component with map
- [x] Center map on user's current location
- [x] Display current location marker (blue dot via showsUserLocation)
- [x] Add center-on-user button
- [x] Add dark map style matching app theme

### Task 4: Wire Up Navigation
- [x] Zones tab already wired in bottom nav
- [x] Map loads when tab is selected

---

## Technical Notes

### Map Library Decision

**Options:**
1. `react-native-maps` - Google Maps/Apple Maps, well-supported
2. `@rnmapbox/maps` - Mapbox, more customizable, free tier generous

**Recommendation:** Start with `react-native-maps` for simplicity. Can migrate to Mapbox later if needed for custom styling.

### Location Permissions
- Use `expo-location` for permission handling
- Request `Accuracy.Balanced` for battery efficiency
- Cache last known location for faster initial load

### Future Considerations (not this story)
- Zone overlays (Story 5.2+)
- Real-time location tracking
- Background location for mileage (Epic 6)

---

## Dependencies

### Prerequisites
- Story 1.4: Core Navigation (completed)

### API Keys Needed
- Google Maps API key (if using react-native-maps with Google)
- Or Mapbox access token (if using Mapbox)

---

## Definition of Done

- [x] Map library installed and working
- [x] Location permission flow complete
- [x] Map displays centered on user location
- [x] Current location marker visible
- [x] Map tab accessible from navigation
- [x] Code review passed

---

## Code Review

**Reviewer:** Claude (Senior Developer)
**Date:** 2026-01-02
**Verdict:** APPROVED

### Summary

Story 5.1 implements a map display for the Focus Zones feature using react-native-maps and expo-location. Clean implementation with proper permission handling and dark theme.

### Issues Found

| ID | File | Issue | Severity |
|----|------|-------|----------|
| CR-1 | `zones.tsx:56` | **Unused error variable** - `catch (error)` captures error but doesn't use it. Could log for debugging. | LOW |
| CR-2 | `zones.tsx:141-159` | **Large inline constant** - `darkMapStyle` is 18 items. Could extract to separate file for cleanliness. | LOW |

### Notes

- Good use of fallback to DEFAULT_LOCATION when permission denied
- Proper loading state with spinner
- Error banner provides user feedback
- Center-on-user button is a nice UX touch
- "Zone data coming soon" badge sets expectations
- Dark map style matches app theme well

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-02 | Claude | Story created |
| 2026-01-02 | Claude | Implementation complete |
| 2026-01-02 | Claude | Code review completed - approved |
