# Story 6.4: Mileage Dashboard Display

Status: done

## Story

**As a** delivery driver,
**I want** to see my tracked mileage totals and tax deduction estimate,
**So that** I understand my driving activity and potential tax benefit at a glance.

## Acceptance Criteria

1. **Given** I have tracked trips, **When** I view the Mileage tab, **Then** I see totals for: Today, This Week, This Month, This Year **And** totals update as new trips are logged

2. **Given** I have trips, **When** I view the dashboard, **Then** I see IRS tax deduction estimate calculated as (total miles × $0.67) **And** the calculation uses the 2024 IRS standard mileage rate

3. **Given** tracking is disabled, **When** I view the Mileage tab, **Then** I see a prompt to enable automatic tracking **And** I see an option for manual trip entry

## Prerequisites

- Story 6.3 (Trip Detection and Logging) - Complete

## Tasks / Subtasks

- [x] Task 1: Create Period Totals Aggregation Logic (AC: 1)
  - [x] Discovered existing `calculateTripStats()` and `getDateRanges()` in `locationStorage.ts`
  - [x] Exported `getDateRanges()` for testability
  - [x] Verified date range calculation for each period (respecting user timezone)
  - [x] Added 14 unit tests for period calculation edge cases (week boundaries starting Monday, month/year start)

- [x] Task 2: Create Tax Deduction Calculator (AC: 2)
  - [x] Created `apps/mobile/src/constants/tax.ts` with `IRS_MILEAGE_RATE_2024 = 0.67`
  - [x] Created `calculateTaxDeduction(miles: number, rate?: number)` function
  - [x] Created `formatUSD(amount: number)` function for currency formatting
  - [x] Created `formatTaxDeduction(miles, rate?)` convenience function
  - [x] Added 18 unit tests verifying calculation accuracy

- [x] Task 3: Update Mileage Tab with Period Stats Cards (AC: 1, 2)
  - [x] Created `MileageStatsCard.tsx` component with full and compact variants
  - [x] Display four stat cards: Today, This Week, This Month, This Year
  - [x] Each card shows: period label, miles value, tax deduction estimate
  - [x] Styled cards with dark theme (#18181B background, #06B6D4 cyan accent)
  - [x] Added loading state while calculating

- [x] Task 4: Add Period Selector UI (AC: 1)
  - [x] Created horizontal scrollable period selector using `MileageStatsCardCompact`
  - [x] Highlighted selected period with cyan border/background
  - [x] Updated main display (summary card) when period changes
  - [x] Persisted selected period preference to AsyncStorage

- [x] Task 5: Add Tracking Disabled State (AC: 3)
  - [x] Verified existing "Enable Tracking Card" when tracking disabled
  - [x] Verified "Manual Mode Card" when permission denied
  - [x] Both states include appropriate buttons (Enable, Open Settings, Add Trip Manually)

- [x] Task 6: Integrate with Zustand Store (AC: 1, 2)
  - [x] Added `monthTrips`, `yearTrips` to mileageStore state
  - [x] Added `selectedPeriod: PeriodType` state with default 'day'
  - [x] Added `setSelectedPeriod(period)` action with AsyncStorage persistence
  - [x] Updated `loadTripStats()` to include monthTrips/yearTrips
  - [x] Added period preference loading during initialization

## Dev Notes

### Technical Approach

This story enhances the existing mileage.tsx with aggregated statistics. The core functionality (trip tracking, storage) exists from Stories 6.1-6.3. This story focuses on:

1. **Aggregation Logic**: Calculate totals by time period from stored trips
2. **Dashboard UI**: Visual display of stats with tax estimate
3. **State Integration**: Wire aggregations to Zustand store for reactivity

### IRS Mileage Rate

- 2024 Rate: $0.67 per mile (IRS standard mileage rate for business use)
- Rate changes annually - store as configurable constant
- Show as informational estimate, not tax advice (add disclaimer)

### Period Definitions

- **Today**: Current calendar day in user's timezone
- **This Week**: Monday 00:00 through Sunday 23:59 (ISO week)
- **This Month**: 1st of month 00:00 through last day 23:59
- **This Year**: Jan 1 00:00 through Dec 31 23:59

### UI Layout Reference

The mileage.tsx already has:
- Tracking status indicator
- Recent trips list (tappable from Story 6.3)
- Trip detail modal

Add above recent trips:
- Period stats cards (horizontal scroll or grid)
- Selected period total with tax estimate (prominent display)

### Project Structure Notes

- New component: `apps/mobile/src/components/MileageStatsCard.tsx`
- New constants: `apps/mobile/src/constants/tax.ts`
- Modified utility: `apps/mobile/src/utils/locationStorage.ts` (add period calculation)
- Modified store: `apps/mobile/src/stores/mileageStore.ts` (add period state)
- Modified UI: `apps/mobile/app/(tabs)/mileage.tsx` (add stats display)

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Story-6.4] - ACs 10, 11, 12
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#NFR-Performance] - Dashboard load < 1 second
- [Source: docs/epics.md#Story-6.4] - Mileage Dashboard Display requirements
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#APIs] - GET /api/v1/mileage endpoint pattern

### Learnings from Previous Story

**From Story 6-3-trip-detection-and-logging (Status: done)**

- **TripDetailModal Created**: `apps/mobile/src/components/TripDetailModal.tsx` - follows modal pattern with slide-up animation, use as reference for any new modals
- **Polyline Encoding Ready**: `distance.ts` has `encodePolyline()` and `decodePolyline()` - route data is efficiently stored
- **CompletedTrip Interface**: Has `encodedRoute?: string` field, `miles`, `startedAt`, `endedAt` - use for aggregation
- **Recent Trips List Pattern**: `mileage.tsx:189-222` shows trip list rendering - extend don't replace
- **Vitest Testing Setup**: `vitest.config.ts` ready, add tests to `__tests__` directories
- **Dark Theme Colors**: `#09090B` (bg), `#18181B` (card), `#27272A` (border), `#06B6D4` (cyan accent)
- **IRS Rate Already Used**: `TripDetailModal.tsx` calculates per-trip deduction at $0.67/mile - reuse constant

[Source: .bmad-ephemeral/stories/6-3-trip-detection-and-logging.md#Dev-Agent-Record]

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/6-4-mileage-dashboard-display.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- **Period Aggregation Already Existed**: Discovered that `calculateTripStats()` and `getDateRanges()` were already implemented in locationStorage.ts from previous work. Exported `getDateRanges()` for testability.
- **Week Starts Monday**: ISO week standard is followed - weeks start on Monday 00:00:00 and end Sunday 23:59:59.
- **Timezone Handling**: Used local Date objects in tests to properly test period boundaries. UTC timestamps don't align with local time ranges.
- **Tax Constant Centralized**: Moved IRS rate from inline constant in TripDetailModal to shared `tax.ts` for reusability.
- **Period Preference Persistence**: Selected period (day/week/month/year) persists to AsyncStorage with key `@giglet/selected_mileage_period`.
- **79 Unit Tests Pass**: 24 (locationTracking) + 18 (tax) + 23 (distance) + 14 (locationStorage) = 79 tests.
- **Tracking Disabled State Pre-Existing**: Enable Tracking Card and Manual Mode Card already implemented from Story 6.1/6.2.

### File List

**Created:**
- `apps/mobile/src/constants/tax.ts` - IRS mileage rate constant and tax calculation functions
- `apps/mobile/src/constants/__tests__/tax.test.ts` - 18 unit tests for tax calculations
- `apps/mobile/src/utils/__tests__/locationStorage.test.ts` - 14 unit tests for period calculations
- `apps/mobile/src/components/MileageStatsCard.tsx` - Period stats card components (full and compact)

**Modified:**
- `apps/mobile/src/utils/locationStorage.ts` - Exported `getDateRanges()` function
- `apps/mobile/src/stores/mileageStore.ts` - Added monthTrips, yearTrips, selectedPeriod, setSelectedPeriod, PeriodType
- `apps/mobile/app/(tabs)/mileage.tsx` - Added period stats cards, summary card with IRS disclaimer, integrated store

