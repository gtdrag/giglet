# Story 6.7: Delivery-Trip Correlation

Status: done

## Story

**As a** delivery driver with synced earnings and tracked trips,
**I want** my trips automatically matched to my deliveries,
**So that** I have better documentation linking my mileage to specific work for tax purposes.

## Acceptance Criteria

1. **Given** I have synced deliveries and tracked trips, **When** a delivery's timestamp falls within a trip's start/end time, **Then** the trip shows a matched delivery icon in the trip list

2. **Given** a trip matches one or more deliveries, **When** I view the trip details, **Then** I see the linked delivery info (platform, restaurant, earnings, time)

3. **Given** a trip has multiple deliveries (multi-drop), **When** I view trip details, **Then** all matched deliveries are listed

4. **Given** a trip has no matching deliveries, **When** I view the trip, **Then** no delivery icon is shown and details say "No linked deliveries"

## Prerequisites

- Story 6.5 (Trip History List) - Complete
- Story 6.6 (Manual Trip Entry and Editing) - Complete
- Note: Full functionality requires Epic 3 (Earnings Import) - correlation will work once deliveries exist

## Tasks / Subtasks

- [x] Task 1: Create Delivery Data Model for Local Storage (AC: 1, 2, 3)
  - [x] Define `DeliveryRecord` interface in `locationStorage.ts` or new `deliveryStorage.ts`
  - [x] Add storage functions: `getDeliveries()`, `getDeliveriesByDateRange()`
  - [x] Create mock delivery data for testing correlation logic
  - [x] Note: Real delivery data will come from Epic 3 CSV import

- [x] Task 2: Implement Correlation Algorithm (AC: 1, 2, 3)
  - [x] Create `correlateTripsWithDeliveries()` function
  - [x] Match logic: delivery.deliveredAt BETWEEN trip.startedAt AND trip.endedAt
  - [x] Handle multi-drop: multiple deliveries can match single trip
  - [x] Return correlation result with trip ID → delivery IDs mapping
  - [x] Add tolerance window (±5 min) for edge cases

- [x] Task 3: Update Trip List to Show Delivery Icon (AC: 1, 4)
  - [x] Modify `TripListItem.tsx` to accept `hasLinkedDeliveries` prop
  - [x] Add delivery icon (shopping bag or receipt icon) when trip has matches
  - [x] Show delivery count badge if multiple deliveries (e.g., "2 deliveries")
  - [x] Style: use cyan accent color (#06B6D4) for delivery indicator

- [x] Task 4: Update Trip Detail Modal with Delivery Info (AC: 2, 3, 4)
  - [x] Add "Linked Deliveries" section to `TripDetailModal.tsx`
  - [x] Display for each matched delivery: platform icon, restaurant name, earnings, time
  - [x] Show "No linked deliveries" message when none matched
  - [x] Style delivery cards consistent with dark theme

- [x] Task 5: Integrate Correlation on Trip Load (AC: 1, 2, 3)
  - [x] Call correlation logic when loading trip history
  - [x] Store correlation results in mileage store or compute on demand
  - [x] Update `getPaginatedTrips()` to include correlation data
  - [x] Ensure performance with large datasets (lazy evaluation)

- [x] Task 6: Add Unit Tests (AC: 1, 2, 3, 4)
  - [x] Test `correlateTripsWithDeliveries()` with various scenarios
  - [x] Test single delivery matching single trip
  - [x] Test multiple deliveries matching single trip (multi-drop)
  - [x] Test no matches scenario
  - [x] Test edge cases (delivery at exact trip start/end time)
  - [x] Test tolerance window behavior

## Dev Notes

### Technical Approach

This story creates the infrastructure for correlating mileage trips with delivery records. Since Epic 3 (Earnings Import) isn't implemented yet, we'll build the correlation logic and UI with mock data, ready for real delivery data when it's available.

**Correlation Algorithm:**
```typescript
interface CorrelationResult {
  tripId: string;
  deliveryIds: string[];
  deliveryCount: number;
}

function correlateTripsWithDeliveries(
  trips: Trip[],
  deliveries: DeliveryRecord[],
  toleranceMs: number = 5 * 60 * 1000 // 5 min tolerance
): Map<string, CorrelationResult>
```

### Delivery Record Interface

```typescript
interface DeliveryRecord {
  id: string;
  platform: 'DOORDASH' | 'UBEREATS';
  restaurantName: string;
  deliveredAt: Date;
  earnings: number;  // total (base + tip)
  tip: number;
  basePay: number;
  isManual: boolean;
}
```

### UI Components

```
TripListItem.tsx (modify)
├── Existing trip info (date, miles, times)
└── NEW: DeliveryIndicator
    ├── Icon (shopping bag)
    └── Badge count (if > 1)

TripDetailModal.tsx (modify)
├── Existing trip details
├── Edit/Delete buttons
└── NEW: LinkedDeliveriesSection
    ├── Section header "Linked Deliveries"
    └── DeliveryCard (for each match)
        ├── Platform icon
        ├── Restaurant name
        ├── Time delivered
        └── Earnings ($X.XX)
```

### Data Flow

```
Trip History Load:
1. Load trips from storage
2. Load deliveries from storage (or empty if Epic 3 not done)
3. Run correlation algorithm
4. Enrich trips with delivery match info
5. Render trip list with indicators
```

### Project Structure Notes

- Modified: `apps/mobile/src/components/TripListItem.tsx` (add delivery indicator)
- Modified: `apps/mobile/src/components/TripDetailModal.tsx` (add delivery section)
- New/Modified: `apps/mobile/src/utils/deliveryStorage.ts` (delivery data functions)
- Modified: `apps/mobile/src/utils/locationStorage.ts` (add correlation function)
- Modified: `apps/mobile/app/(tabs)/mileage.tsx` (wire up correlation)

### Platform Icons

Use platform-specific icons for visual identification:
- DoorDash: Red/white icon or text badge
- Uber Eats: Green/black icon or text badge

### Mock Data for Testing

Create 3-5 mock deliveries with timestamps that overlap with existing trips for development and testing.

### References

- [Source: docs/epics.md#Story-6.7] - Match trips to deliveries by timestamp proximity
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Story-6.7] - ACs 18, 19
- [Source: docs/architecture.md#Data-Models] - Delivery model in Prisma schema
- [Source: docs/architecture.md#Mileage] - Trip model structure

### Learnings from Previous Story

**From Story 6-6-manual-trip-entry-and-editing (Status: done)**

- **TripDetailModal Extended**: Already has edit mode infrastructure - add new section below edit/delete buttons
- **locationStorage.ts Pattern**: Follow same pattern for delivery storage functions
- **deleteTrip() Pattern**: Existing CRUD operations follow consistent pattern
- **Dark Theme Colors**: #09090B (bg), #18181B (card), #27272A (border), #06B6D4 (cyan), #22C55E (green for tax)
- **111 Tests Passing**: Continue using Vitest, add correlation tests
- **ManualTripData Interface**: Reference for interface patterns

[Source: .bmad-ephemeral/stories/6-6-manual-trip-entry-and-editing.md#Dev-Agent-Record]

## Dev Agent Record

### Context Reference

- .bmad-ephemeral/stories/6-7-delivery-trip-correlation.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Created deliveryStorage.ts with DeliveryRecord interface and correlation algorithm
- Implemented correlateTripsWithDeliveries() with 5-minute tolerance window
- Updated TripListItem.tsx with deliveryCount prop and delivery badge
- Updated TripDetailModal.tsx with Linked Deliveries section showing platform icons, restaurant, earnings
- Integrated correlation in trip-history.tsx - loads deliveries once, computes correlations on trip load
- Added 21 unit tests for correlation algorithm and storage functions

### Completion Notes List

- All 4 acceptance criteria implemented
- Correlation algorithm uses efficient O(n*m) approach with tolerance window
- Platform-specific styling: DoorDash (red), Uber Eats (green)
- "No linked deliveries" message shown when no matches
- Lazy evaluation: correlations computed per-page, not all at once
- 132 tests passing (21 new + 111 existing)
- TypeScript clean

### File List

**New Files:**
- apps/mobile/src/utils/deliveryStorage.ts
- apps/mobile/src/utils/__tests__/deliveryStorage.test.ts

**Modified Files:**
- apps/mobile/src/components/TripListItem.tsx
- apps/mobile/src/components/TripDetailModal.tsx
- apps/mobile/app/trip-history.tsx

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-03 | 1.0 | Story drafted |
| 2026-01-03 | 1.1 | Story implementation complete - all tasks done, 21 tests added |
| 2026-01-03 | 1.2 | Senior Developer Review - APPROVED |

---

## Senior Developer Review (AI)

### Reviewer
George

### Date
2026-01-03

### Outcome
**APPROVED** - All acceptance criteria implemented with evidence. All tasks verified complete. Tests comprehensive.

### Summary

This story successfully implements delivery-trip correlation for the Giglet mobile app. The implementation includes:
- New `deliveryStorage.ts` utility with `DeliveryRecord` interface and correlation algorithm
- UI updates to `TripListItem` (delivery badge) and `TripDetailModal` (linked deliveries section)
- Integration in `trip-history.tsx` with lazy evaluation for performance
- Comprehensive test coverage with 21 new tests (132 total passing)

### Key Findings

No high or medium severity issues found. Implementation is clean and follows existing patterns.

**Low Severity:**
- `trip-history.tsx:70` - Unused variable `updatedTrips` after setting state (harmless, could be cleaned up)

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| 1 | Trip shows matched delivery icon when timestamps overlap | IMPLEMENTED | `TripListItem.tsx:41-47`, `deliveryStorage.ts:131-174` |
| 2 | Trip details show linked delivery info (platform, restaurant, earnings, time) | IMPLEMENTED | `TripDetailModal.tsx:490-536` |
| 3 | Multi-drop trips show all matched deliveries | IMPLEMENTED | `deliveryStorage.ts:153-161`, `TripDetailModal.tsx:496` |
| 4 | Trips with no matches show "No linked deliveries" | IMPLEMENTED | `TripListItem.tsx:31,41`, `TripDetailModal.tsx:532-535` |

**Summary: 4 of 4 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Delivery Data Model | Complete | VERIFIED | `deliveryStorage.ts:22-31` (DeliveryRecord), `deliveryStorage.ts:55-82` (storage functions) |
| Task 2: Correlation Algorithm | Complete | VERIFIED | `deliveryStorage.ts:131-175` (function), `deliveryStorage.ts:50` (5-min tolerance) |
| Task 3: Trip List Delivery Icon | Complete | VERIFIED | `TripListItem.tsx:23,41-47` (deliveryCount prop, badge) |
| Task 4: Trip Detail Modal | Complete | VERIFIED | `TripDetailModal.tsx:39,490-536` (linkedDeliveries prop, section) |
| Task 5: Correlation Integration | Complete | VERIFIED | `trip-history.tsx:52-92,139-151` (loadInitialData, renderTripItem) |
| Task 6: Unit Tests | Complete | VERIFIED | `deliveryStorage.test.ts` (21 tests covering all scenarios) |

**Summary: 6 of 6 completed tasks verified, 0 questionable, 0 false completions**

### Test Coverage and Gaps

- **21 new tests** for correlation algorithm and storage functions
- **132 total tests passing** (up from 111)
- Tests cover: basic matching, multi-drop, no matches, tolerance window, edge cases (exact boundaries)
- No gaps identified - all acceptance criteria have corresponding tests

### Architectural Alignment

- Follows existing patterns from `locationStorage.ts`
- Uses `@giglet/` prefix for storage keys (per architecture)
- Pure functions for correlation logic (testable)
- Lazy evaluation for performance (per tech spec constraint)
- Platform icons with correct colors: DoorDash (#FF3008), Uber Eats (#06C167)

### Security Notes

No security concerns. All data stored locally using AsyncStorage. No external API calls in this story.

### Best-Practices and References

- [Expo AsyncStorage Docs](https://docs.expo.dev/versions/latest/sdk/async-storage/)
- [Vitest Testing Framework](https://vitest.dev/)
- Implementation follows React Native community patterns for local-first storage

### Action Items

**Code Changes Required:**
- [ ] [Low] Remove unused `updatedTrips` variable [file: apps/mobile/app/trip-history.tsx:70]

**Advisory Notes:**
- Note: When Epic 3 (Earnings Import) is implemented, real delivery data will flow through this correlation system
- Note: Consider adding a dev-mode button to populate mock deliveries for testing in the app
