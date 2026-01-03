# Story 5.7: Best Zone Recommendation Banner

Status: done

## Story

**As a** user,
**I want** to see a recommendation of where to go,
**So that** I don't have to analyze the whole map.

## Acceptance Criteria

1. **Given** I am on the Map tab, **When** zones are loaded, **Then** I see a banner at the top: "Head to [Zone Name]. [Top Reason]." **And** the banner updates when scores refresh **And** tapping the banner centers the map on that zone

2. **Given** I am already in the highest-scoring zone, **When** I view the banner, **Then** I see "You're in a hot zone! [Score]"

## Prerequisites

- Story 5.6 (Zone Tap Detail View) - Complete

## Tasks / Subtasks

- [x] Task 1: Create RecommendationBanner component (AC: 1, 2)
  - [x] Create banner component in `apps/mobile/src/components/RecommendationBanner.tsx`
  - [x] Display zone name and top contributing factor
  - [x] Show "You're in a hot zone!" variant when user is in best zone
  - [x] Style with dark theme consistency (match existing UI)

- [x] Task 2: Implement zone recommendation logic (AC: 1, 2)
  - [x] Find highest-scoring zone from zones array
  - [x] Calculate distance from user's current location to each zone
  - [x] Filter out zones > 30 minutes away (~15km at city speeds)
  - [x] Determine top contributing factor for recommended zone
  - [x] Detect if user is already in the highest-scoring zone

- [x] Task 3: Generate human-readable zone names (AC: 1)
  - [x] Use reverse geocoding or zone grid position for naming
  - [x] Fallback: Directional naming ("North area", "Southeast zone")

- [x] Task 4: Integrate banner with map screen (AC: 1)
  - [x] Add banner above map in `apps/mobile/app/(tabs)/index.tsx`
  - [x] Pass zones data and user location to banner
  - [x] Implement onPress to center map on recommended zone
  - [x] Update banner when zones refresh

## Dev Notes

### Technical Approach

- Reuse `getScoreColor` from zones service for consistent coloring
- Use Haversine formula (already in index.tsx) for distance calculation
- Top factor: find highest value in `factors` object from zone data
- Map centering: use `mapRef.current?.animateToRegion()` (already implemented for centerOnUser)

### Project Structure Notes

- New component: `apps/mobile/src/components/RecommendationBanner.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx` (add banner, pass props)
- Reuse: `apps/mobile/src/services/zones.ts` (getScoreColor, factor types)

### References

- [Source: docs/epics.md#Story-5.7] - Acceptance criteria and technical notes
- [Source: docs/architecture.md] - UI patterns and component structure
- [Source: docs/stories/5-6-zone-tap-detail-view.md] - Previous story patterns

### Learnings from Previous Story

**From Story 5-6-zone-tap-detail-view (Status: done)**

- **Component Pattern**: `ZoneDetailModal.tsx` shows how to create styled modal components with dark theme
- **Factor Config**: `FACTOR_CONFIG` in ZoneDetailModal maps factor keys to human-readable labels - reuse this pattern
- **Map Integration**: `handleMapPress` and `mapRef.current?.animateToRegion()` patterns established
- **Zones State**: `zones` array with `NearbyZone[]` type available in index.tsx
- **Distance Calculation**: `getDistanceMeters()` Haversine function available in index.tsx

[Source: docs/stories/5-6-zone-tap-detail-view.md#Senior-Developer-Review]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- apps/mobile/src/components/RecommendationBanner.tsx (NEW)
- apps/mobile/app/(tabs)/index.tsx (MODIFIED)

---

## Senior Developer Review (AI)

**Reviewer:** George
**Date:** 2026-01-03
**Outcome:** ✅ APPROVE

### Summary

Story 5.7 has been fully implemented. The RecommendationBanner component displays zone recommendations with directional naming and top contributing factors. Both variants (recommendation and "in hot zone") work correctly. The banner is properly integrated with the map screen, centering on tap and using cached zone data to prevent score mismatches.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | Banner shows "Head to [Zone Name]. [Top Reason]." + updates on refresh + tapping centers map | ✅ IMPLEMENTED | RecommendationBanner.tsx:144-146, index.tsx:171-183 |
| AC2 | When in best zone, show "You're in a hot zone! [Score]" | ✅ IMPLEMENTED | RecommendationBanner.tsx:101-103, 121-124 |

**Summary: 2 of 2 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Status | Evidence |
|------|--------|----------|
| Task 1: Create RecommendationBanner component | ✅ VERIFIED | RecommendationBanner.tsx (193 lines) |
| Task 2: Implement zone recommendation logic | ✅ VERIFIED | getDistanceKm, getTopFactor, bestZone logic |
| Task 3: Generate human-readable zone names | ✅ VERIFIED | getZoneName with directional naming |
| Task 4: Integrate banner with map screen | ✅ VERIFIED | index.tsx:234-242, handleBannerPress |

**Summary: 15 of 15 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

- No unit tests added for this story
- Note: Component is straightforward presentation logic; manual testing sufficient for MVP

### Architectural Alignment

- ✅ Follows React Native component patterns from architecture.md
- ✅ Uses consistent dark theme styling (#18181B, #27272A, etc.)
- ✅ Proper use of React hooks (useCallback, props-based reactivity)
- ✅ Haversine formula implementation matches existing pattern

### Security Notes

- No security concerns - component uses only cached zone data, no API calls or user input handling

### Best-Practices and References

- [React Native Pressable](https://reactnative.dev/docs/pressable) - Used correctly for tap handling
- Good separation of concerns between presentation and state management

### Action Items

**Advisory Notes:**
- Note: Consider consolidating duplicate Haversine implementations (getDistanceKm in banner, getDistanceMeters in index.tsx) to a shared utility in future refactoring
