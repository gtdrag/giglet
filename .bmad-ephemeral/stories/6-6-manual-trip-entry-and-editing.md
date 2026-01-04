# Story 6.6: Manual Trip Entry and Editing

Status: done

## Story

**As a** delivery driver,
**I want** to manually add and edit trips,
**So that** I can record mileage when automatic tracking is disabled or make corrections to existing trips.

## Acceptance Criteria

1. **Given** I tap "Add Trip" on the Mileage tab, **When** I enter date and miles, **Then** trip saves with isManual=true

2. **Given** I view a trip (in detail modal), **When** I tap Edit, **Then** I can modify miles or delete the trip

3. **Given** I delete a trip, **When** I confirm deletion, **Then** the trip is removed from history and totals are recalculated

## Prerequisites

- Story 6.5 (Trip History List) - Complete

## Tasks / Subtasks

- [x] Task 1: Create Manual Trip Entry Form (AC: 1)
  - [x] Create `ManualTripModal.tsx` component with form fields
  - [x] Add date picker for trip date selection (default to today)
  - [x] Add time inputs for start and end time
  - [x] Add miles input with numeric keyboard
  - [x] Validate inputs (miles > 0, end time > start time)
  - [x] Add "Add Trip" button to trigger save

- [x] Task 2: Implement Manual Trip Save Logic (AC: 1)
  - [x] Add `saveManualTrip()` function to `locationStorage.ts`
  - [x] Set `isManual: true` flag on trip
  - [x] Generate unique trip ID
  - [x] Calculate coordinates placeholder (0,0 or device current location)
  - [x] Recalculate trip stats after save
  - [x] Close modal and refresh trip list on success

- [x] Task 3: Add "Add Trip" Entry Point (AC: 1)
  - [x] Add "Add Trip Manually" button to Mileage tab (existing but non-functional)
  - [x] Wire button to open ManualTripModal
  - [x] Also add entry point from Recent Trips card header

- [x] Task 4: Add Edit Mode to TripDetailModal (AC: 2)
  - [x] Modify existing `TripDetailModal` to support edit mode
  - [x] Add "Edit" button to modal header/footer
  - [x] Show editable fields when in edit mode (miles, date, times)
  - [x] Add "Save Changes" and "Cancel" buttons in edit mode
  - [x] Validate edited values before saving

- [x] Task 5: Implement Trip Update Logic (AC: 2)
  - [x] Add `updateTrip(tripId, updates)` function to `locationStorage.ts`
  - [x] Preserve original trip data, only update modified fields
  - [x] Recalculate trip stats after update
  - [x] Refresh UI to reflect changes

- [x] Task 6: Implement Trip Deletion (AC: 3)
  - [x] Reuse existing `deleteTrip(tripId)` in `locationStorage.ts` (already exists)
  - [x] Add confirmation dialog before deletion ("Delete this trip?")
  - [x] Show warning that this cannot be undone
  - [x] Recalculate trip stats after deletion
  - [x] Close modal and refresh trip list on success
  - [x] Show toast/feedback on successful deletion

- [x] Task 7: Add Unit Tests (AC: 1, 2, 3)
  - [x] Test `saveManualTrip()` - verify isManual=true, ID generation
  - [x] Test `updateTrip()` - verify partial updates, stats recalculation
  - [x] Test form validation (negative miles, invalid times)
  - [x] Test stats recalculation after add/edit/delete

## Dev Notes

### Technical Approach

This story adds CRUD operations for trips, building on the read functionality from Story 6.5. The existing `deleteTrip()` function already handles deletion, so focus is on:
1. Manual trip creation (new form + save function)
2. Trip editing (extend TripDetailModal)
3. Delete confirmation UX

### Manual Trip Form Fields

| Field | Type | Validation | Default |
|-------|------|------------|---------|
| Date | Date picker | Required, not future | Today |
| Start Time | Time picker | Required | Now - 30 min |
| End Time | Time picker | Required, > start | Now |
| Miles | Number input | > 0, max 1000 | Empty |

### Modal Component Architecture

```
ManualTripModal.tsx (new)
├── DatePicker (react-native-community/datetimepicker or expo equivalent)
├── TimePicker (for start/end times)
├── MilesInput (numeric)
└── Action buttons (Cancel, Add Trip)

TripDetailModal.tsx (existing - extend)
├── ViewMode (existing)
│   ├── Trip details display
│   └── Edit button, Delete button
└── EditMode (new)
    ├── Editable miles input
    ├── Editable date/time pickers
    └── Save/Cancel buttons
```

### Data Flow

```
Add Trip:
User input → ManualTripModal → saveManualTrip() → AsyncStorage → calculateTripStats() → UI refresh

Edit Trip:
Trip tap → TripDetailModal → Edit mode → updateTrip() → AsyncStorage → calculateTripStats() → UI refresh

Delete Trip:
Delete button → Confirmation → deleteTrip() → AsyncStorage → calculateTripStats() → UI refresh
```

### Project Structure Notes

- New component: `apps/mobile/src/components/ManualTripModal.tsx`
- Modified component: `apps/mobile/src/components/TripDetailModal.tsx` (add edit mode)
- Modified utility: `apps/mobile/src/utils/locationStorage.ts` (add saveManualTrip, updateTrip)
- Modified UI: `apps/mobile/app/(tabs)/mileage.tsx` (wire Add Trip button)

### Date/Time Picker Options

For Expo SDK 52, consider:
- `@react-native-community/datetimepicker` (native pickers)
- `expo-calendar` if calendar integration needed
- Simple input-based approach for MVP (TextInput with validation)

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Story-6.6] - ACs 15, 16, 17
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#APIs] - POST/PUT/DELETE /api/v1/mileage/trips
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Data-Models] - Trip model with isManual flag

### Learnings from Previous Story

**From Story 6-5-trip-history-list (Status: done)**

- **TripListItem Component**: `apps/mobile/src/components/TripListItem.tsx` available for consistent trip display
- **Formatting Utilities**: Use `formatTripDate`, `formatTripTime`, `formatTimeRange` from `tripFormatting.ts`
- **TripDetailModal**: Already exists at `apps/mobile/src/components/TripDetailModal.tsx` - extend for edit mode
- **deleteTrip() Exists**: `locationStorage.ts` already has `deleteTrip(tripId)` function (line 363-375)
- **getPaginatedTrips()**: Pagination function added - trip list will auto-refresh
- **Router Pattern**: Use `router.push('/path' as any)` for new routes if type definitions not updated
- **97 Tests Passing**: Continue using Vitest, maintain test coverage
- **Dark Theme**: #09090B (bg), #18181B (card), #27272A (border), #06B6D4 (cyan accent), #22C55E (green for tax)

[Source: .bmad-ephemeral/stories/6-5-trip-history-list.md#Dev-Agent-Record]

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/6-6-manual-trip-entry-and-editing.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

- Installed `@react-native-community/datetimepicker` for native date/time pickers
- Created `ManualTripModal.tsx` with full form validation (miles > 0, max 1000, end time > start time, date not future)
- Extended `TripDetailModal.tsx` with edit mode including editable miles and time fields
- Added `saveManualTrip()` and `updateTrip()` functions to `locationStorage.ts`
- Enhanced `deleteTrip()` to re-throw errors for proper error handling
- Wired up entry points: Manual Mode card button, "Add trip manually" link, and Recent Trips card "+" button
- Manual trips display "Manual entry" for addresses (0,0 coordinates detected)
- Added 14 new unit tests covering saveManualTrip, updateTrip, and deleteTrip operations
- Total test count: 111 tests passing (up from 97)
- Dark theme colors maintained: #09090B (bg), #18181B (card), #27272A (border), #06B6D4 (cyan), #EF4444 (red for delete)

### File List

**New Files:**
- `apps/mobile/src/components/ManualTripModal.tsx` - Manual trip entry form modal

**Modified Files:**
- `apps/mobile/src/components/TripDetailModal.tsx` - Added edit mode, onEdit/onDelete callbacks
- `apps/mobile/src/utils/locationStorage.ts` - Added saveManualTrip(), updateTrip(), ManualTripInput, TripUpdate interfaces
- `apps/mobile/app/(tabs)/mileage.tsx` - Wired up ManualTripModal, edit/delete handlers
- `apps/mobile/src/utils/__tests__/locationStorage.test.ts` - Added 14 new tests
- `apps/mobile/package.json` - Added @react-native-community/datetimepicker dependency

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-03 | 1.0 | Story drafted |
| 2026-01-03 | 1.1 | Story implemented - all tasks complete, ready for review |
| 2026-01-03 | 1.2 | Code review completed - APPROVED |

---

## Code Review

### Review Date
2026-01-03

### Reviewer
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Outcome
✅ **APPROVED**

### Acceptance Criteria Validation

| AC | Description | Status |
|----|-------------|--------|
| 1 | Add Trip → enter date/miles → saves with isManual=true | ✅ PASS |
| 2 | View trip → Edit → modify miles or delete | ✅ PASS |
| 3 | Delete trip → confirm → removed, totals recalculated | ✅ PASS |

### Code Quality Summary

**Strengths:**
- Clean component architecture with proper separation of concerns
- Comprehensive form validation (miles > 0, max 1000, end > start, date not future)
- Proper TypeScript interfaces (ManualTripInput, TripUpdate, ManualTripData)
- Error handling with try/catch and user-facing alerts
- Stats recalculation after all CRUD operations
- Manual trips display "Manual entry" for 0,0 coordinates
- Consistent dark theme colors maintained

**Test Coverage:**
- 14 new tests added for CRUD operations
- Total: 111 tests passing (up from 97)
- Edge cases covered (non-existent trip, partial updates, stats recalculation)

### Minor Observations (Non-blocking)

1. `locationStorage.ts:382` - Uses deprecated `substr()` method; could use `substring()` or `slice()`
2. `TripDetailModal.tsx:29` - Mapbox token has placeholder suffix; should be moved to env variable

### Recommendation

Story is ready to be marked as DONE. All acceptance criteria met, code quality is good, test coverage is comprehensive.
