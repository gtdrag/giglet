# Story 10.4: Tip Filter Controls

Status: done

## Story

**As a** driver,
**I want** to filter which tips show on the map,
**So that** I can focus on high-value locations.

## Acceptance Criteria

1. **Given** I am viewing My Tips layer, **When** I tap the filter button, **Then** I can select minimum tip size to display (e.g., "L and above"), **And** the map updates to show only matching tips.

2. **Given** I filter to "XL and above", **When** viewing the map, **Then** only XL and XXL tips are shown, **And** filter state persists across sessions.

## Prerequisites

- Story 10.1 (Tip Logging Button and UI) - Complete (FAB, TipSizePicker)
- Story 10.2 (Tip Location Storage Backend) - Complete (getTipsInViewport API with tipSize filter)
- Story 10.3 (Tip Locations Map Layer) - Complete (TipMarker, TipsToggle, TipMarkersLayer)

## Tasks / Subtasks

- [x] Task 1: Create TipSizeFilter Component (AC: 1)
  - [x] Create src/components/tips/TipSizeFilter.tsx
  - [x] Display chip/dropdown selector for minimum tip size
  - [x] Options: All, S+, M+, L+, XL+, XXL only
  - [x] Show selected state visually
  - [x] Call onChange when selection changes

- [x] Task 2: Add Filter Persistence to Settings Store (AC: 2)
  - [x] Add tipSizeFilter field to localSettingsStore (new store)
  - [x] Persist filter selection in AsyncStorage
  - [x] Load persisted filter on app start

- [x] Task 3: Integrate Filter into MapPage (AC: 1, 2)
  - [x] Add TipSizeFilter component near TipsToggle
  - [x] Connect filter selection to tip loading
  - [x] Pass tipSize filter param to getTipsInViewport

- [x] Task 4: Show Filtered/Total Count (AC: 1)
  - [x] TipsToggle already shows count badge (from Story 10-3)
  - [x] Count updates when filter changes (tips re-fetched)

- [x] Task 5: Add Unit Tests (AC: 1-2)
  - [x] Test filter options configuration
  - [x] Test settings store persists filter value
  - [x] Test filter label mapping

## Dev Notes

### Technical Approach

This story adds filtering capability to the existing tip markers layer. The backend API (from Story 10-2) already supports tipSize filtering via query parameter, so we just need to wire up the UI.

### Filter Options

| Selection | API tipSize param | Tips Shown |
|-----------|-------------------|------------|
| All | (none) | All tips |
| S+ | SMALL | SMALL, MEDIUM, LARGE, XLARGE, XXLARGE |
| M+ | MEDIUM | MEDIUM, LARGE, XLARGE, XXLARGE |
| L+ | LARGE | LARGE, XLARGE, XXLARGE |
| XL+ | XLARGE | XLARGE, XXLARGE |
| XXL only | XXLARGE | Only XXLARGE |

Note: The API's tipSize filter returns tips at that size OR ABOVE (hierarchical filtering implemented in Story 10-2).

### Settings Store Pattern

Follow existing settingsStore pattern in `src/stores/settingsStore.ts`:
- Add `tipSizeFilter: TipSize | null` (null = show all)
- Use `AsyncStorage.setItem('tip_size_filter', ...)` for persistence

### Learnings from Previous Story

**From Story 10-3-tip-locations-map-layer (Status: done)**

- **TipsToggle Component**: Available at `src/components/tips/TipsToggle.tsx` - place filter next to toggle
- **Viewport Loading**: Tips fetched via `fetchTipsInViewport()` in MapPage - add tipSize param
- **TipMarkersLayer**: Receives tips array, no changes needed (filtering happens at fetch time)
- **Debounced Loading**: Region change already debounced at 500ms - filter change should also debounce
- **Color Scheme**: getTipSizeColor() available for filter chip colors

**Files to REUSE (not recreate):**
- `apps/mobile/app/(tabs)/index.tsx` - Extend with filter component
- `apps/mobile/src/stores/settingsStore.ts` - Add filter setting
- `apps/mobile/src/services/tips.ts` - getTipsInViewport already accepts tipSize param

[Source: .bmad-ephemeral/stories/10-3-tip-locations-map-layer.md#Dev-Agent-Record]

### References

- [Source: docs/epics.md#Story-10.4] - Original story definition
- [Source: apps/mobile/src/services/tips.ts] - getTipsInViewport with tipSize param
- [Source: apps/mobile/src/stores/settingsStore.ts] - Settings persistence pattern

---

## Dev Agent Record

### Context Reference

- Leveraged context from Story 10-3 (Dev Agent Record)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - implementation completed without issues.

### Completion Notes List

1. **TipSizeFilter Component**: Created chip-style filter with 6 options (All, S+, M+, L+, XL+, XXL). Each chip uses getTipSizeColor for visual consistency. Shows filter icon header with scrollable chips.

2. **LocalSettingsStore**: Created new Zustand store for device-local settings (separate from user account preferences). Uses AsyncStorage for persistence. Stores tipSizeFilter as TipSize | null (null = show all).

3. **MapPage Integration**: Filter appears below TipsToggle when tips layer is enabled. Filter changes immediately trigger re-fetch with the new tipSize parameter. Filter state persists across app sessions.

4. **Filter Logic**: Uses existing API hierarchical filtering (tipSize param returns tips >= specified size). Filter is debounce-friendly - immediate state update + re-fetch.

5. **Testing**: Added 24 new tests covering filter options, settings persistence, and label mapping. All 399 tests pass.

### File List

**New Components:**
- `apps/mobile/src/components/tips/TipSizeFilter.tsx` - Chip-style minimum tip size filter
- `apps/mobile/src/stores/localSettingsStore.ts` - Local device settings store with AsyncStorage persistence

**Modified:**
- `apps/mobile/app/(tabs)/index.tsx` - Integrated filter into MapPage with tips layer

**Tests:**
- `apps/mobile/src/components/tips/__tests__/TipSizeFilter.test.ts` - Filter options and label tests
- `apps/mobile/src/stores/__tests__/localSettingsStore.test.ts` - Settings persistence tests

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-06 | 1.0 | Story drafted from epics.md |
| 2026-01-06 | 2.0 | Story completed - Tip filter controls with persistence |
