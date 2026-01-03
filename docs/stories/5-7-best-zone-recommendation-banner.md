# Story 5.7: Best Zone Recommendation Banner

Status: drafted

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
