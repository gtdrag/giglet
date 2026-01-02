# Story 5.3: Meal Time Boost Logic

**Epic:** 5 - Giglet Focus Zones
**Story ID:** 5.3
**Status:** done
**Priority:** P0
**Created:** 2026-01-02

---

## User Story

**As a** system,
**I want** to boost zone scores during meal times with timezone awareness,
**So that** scores reflect typical demand patterns in the user's local time.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Lunch boost (1.3-1.5x) applied during 11AM-2PM | Test at 11:30 AM shows higher score |
| AC2 | Dinner boost (1.4-1.6x) applied during 5-9PM | Test at 6:30 PM shows higher score |
| AC3 | Weekend dinner boost higher than weekday | Saturday 6PM > Tuesday 6PM |
| AC4 | Off-peak hours show no meal boost (1.0x) | Test at 3:00 PM shows base score |
| AC5 | Breakfast boost (7-10AM) and late night (9PM-12AM) windows implemented | All four meal windows work |
| AC6 | User timezone used for calculations | Score varies by timezone parameter |
| AC7 | Smooth transitions at window boundaries | No abrupt score jumps at 11:00 AM exactly |

---

## Tasks

### Task 1: Enhance getMealTimeScore with Timezone Support (AC: 1-6)
- [x] Accept optional timezone parameter (IANA format, e.g., "America/Los_Angeles")
- [x] Default to UTC if no timezone provided
- [x] Use date-fns-tz for timezone conversion
- [x] Calculate local hour in user's timezone

### Task 2: Implement All Meal Windows (AC: 5)
- [x] Define meal windows per architecture spec:
  - Breakfast: 7-10AM → score 40
  - Lunch: 11AM-2PM → score 80
  - Dinner: 5-9PM → score 100
  - Late night: 9PM-12AM → score 50
  - Off-peak: all other times → score 20
- [x] Update getMealTimeScore() to check all windows

### Task 3: Add Weekend vs Weekday Differentiation (AC: 3)
- [x] Detect if current day is weekend (Saturday/Sunday)
- [x] Apply weekend multiplier to dinner boost (1.2x for dinner on weekends)
- [x] Weekend breakfast/brunch boost (1.1x on weekend mornings)

### Task 4: Implement Smooth Transitions (AC: 7)
- [x] Add transition zones at window boundaries (±30 minutes)
- [x] Linearly interpolate between adjacent scores during transitions
- [x] Example: 10:30-11:00 AM transitions from breakfast(40) to lunch(80)

### Task 5: Update API Endpoint (AC: 6)
- [x] Add `timezone` query parameter to GET /api/v1/zones
- [x] Add `timezone` query parameter to GET /api/v1/zones/score
- [x] Update Zod schema validation for timezone (valid IANA timezone string)

### Task 6: Add Unit Tests
- [x] Test each meal window returns correct score
- [x] Test weekend vs weekday differentiation
- [x] Test smooth transitions at boundaries
- [x] Test timezone parameter handling
- [x] Test invalid timezone fallback to UTC

---

## Technical Notes

### Meal Window Scoring (from architecture.md)

```typescript
// Factor scores (0-100 scale)
const MEAL_WINDOWS = {
  breakfast: { start: 7, end: 10, score: 40 },
  lunch: { start: 11, end: 14, score: 80 },
  dinner: { start: 17, end: 21, score: 100 },
  lateNight: { start: 21, end: 24, score: 50 },
  offPeak: { score: 20 }
};

// Weekend multipliers
const WEEKEND_MULTIPLIER = {
  dinner: 1.2,  // Weekend dinner is 20% higher
  breakfast: 1.1  // Weekend breakfast/brunch 10% higher
};
```

### Smooth Transition Formula

```typescript
// Transition zone: 30 minutes before/after window boundary
// Linear interpolation between adjacent scores
function getTransitionScore(currentHour: number, fromScore: number, toScore: number): number {
  const transitionDuration = 0.5; // 30 minutes = 0.5 hours
  const progress = (currentHour % 1) / transitionDuration; // 0 to 1
  return fromScore + (toScore - fromScore) * progress;
}
```

### Timezone Handling Pattern

```typescript
import { utcToZonedTime, getHours } from 'date-fns-tz';

function getLocalHour(timezone: string = 'UTC'): number {
  const now = new Date(); // UTC
  const localTime = utcToZonedTime(now, timezone);
  return getHours(localTime) + localTime.getMinutes() / 60; // Include fractional hour
}
```

### Changes to Existing Code

**File:** `apps/api/src/services/zones.service.ts`
- Modify `getMealTimeScore(timezone?: string)` to accept timezone
- Add all meal windows (breakfast, late night)
- Add weekend detection and multiplier
- Add smooth transition logic

**File:** `apps/api/src/schemas/zones.schema.ts`
- Add `timezone` query parameter validation (optional, IANA string)

---

## Dev Notes

### Project Structure Notes

- Existing service: `apps/api/src/services/zones.service.ts`
- Existing schema: `apps/api/src/schemas/zones.schema.ts`
- No new files needed - enhancing existing implementation

### Learnings from Previous Story

**From Story 5-2 (Status: done)**

- **Existing Service:** `zones.service.ts` with basic `getMealTimeScore()` implementation
- **Current Weights:** mealTime: 0.3, peakHour: 0.3, weekend: 0.2, base: 0.2
- **Validation Pattern:** Use `parseAndValidateFloat` helper in schemas
- **Batch Updates:** Use `Promise.all` for efficient database updates
- **Code Review Fixes:** Ensure no unused variables or parameters

[Source: docs/stories/5-2-zone-scoring-algorithm-backend.md]

### Future Enhancement: Data-Driven Meal Windows

**Current State:** Meal windows and boosts are based on industry assumptions (typical food delivery peak times).

**Future Enhancement:** Once sufficient delivery data is imported via Epic 3 (CSV Import), analyze actual delivery timestamps to:
1. Calculate real peak ordering times per market/city
2. Adjust meal window start/end times based on data
3. Calibrate boost multipliers based on actual order volume
4. Consider making windows dynamic per region

**Implementation:**
- Track `deliveredAt` timestamps from imported deliveries
- Aggregate by hour-of-day across all users
- Identify statistical peaks vs. current hardcoded windows
- Consider a background job to recalculate windows monthly

### References

- [Source: docs/architecture.md#Focus-Zones-Algorithm] - Meal time boost scoring (0-100 scale)
- [Source: docs/architecture.md#Date/Time-Handling] - Timezone handling pattern with date-fns-tz
- [Source: docs/epics.md#Story-5.3] - Acceptance criteria and technical notes

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Implemented timezone-aware meal time scoring
- Added all 4 meal windows with architecture-spec scores
- Weekend multipliers for dinner (1.2x) and breakfast (1.1x)
- Smooth transitions using linear interpolation
- Updated API endpoints with timezone query param

### File List

- `apps/api/src/services/zones.service.ts` - Enhanced getMealTimeScore, added timezone support
- `apps/api/src/schemas/zones.schema.ts` - Added timezone param validation
- `apps/api/src/controllers/zones.controller.ts` - Pass timezone to service
- `apps/api/src/routes/zones.routes.ts` - Added GetZoneScoreSchema validation
- `apps/api/src/services/__tests__/zones.service.test.ts` - Unit tests (21 tests)
- `apps/api/vitest.config.ts` - Vitest configuration
- `apps/api/package.json` - Added test scripts

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-02 | Claude | Story drafted from Epic 5 |
| 2026-01-02 | Claude | Implementation complete (Tasks 1-5), Task 6 pending |
| 2026-01-02 | Claude | Senior Developer Review notes appended |
| 2026-01-02 | Claude | Added unit tests (21 tests), story complete |

---

## Senior Developer Review (AI)

**Reviewer:** Claude
**Date:** 2026-01-02
**Outcome:** APPROVED

### Summary

Story 5.3 implementation is **complete** with all 7 acceptance criteria met and all 6 tasks done. The timezone-aware meal time boost logic is well-implemented with smooth transitions, weekend multipliers, proper API integration, and comprehensive unit tests (21 tests, 100% pass rate).

### Acceptance Criteria Coverage

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC1 | Lunch boost during 11AM-2PM (score 80) | ✅ IMPLEMENTED | zones.service.ts:21-23, 121-124 |
| AC2 | Dinner boost during 5-9PM (score 100) | ✅ IMPLEMENTED | zones.service.ts:24, 136-140 |
| AC3 | Weekend dinner > weekday (1.2x) | ✅ IMPLEMENTED | zones.service.ts:29-33, 139 |
| AC4 | Off-peak hours base score (20) | ✅ IMPLEMENTED | zones.service.ts:26, 149 |
| AC5 | All 4 meal windows | ✅ IMPLEMENTED | zones.service.ts:21-27 |
| AC6 | Timezone parameter | ✅ IMPLEMENTED | zones.schema.ts:39-43, zones.controller.ts:12,48 |
| AC7 | Smooth transitions (30min) | ✅ IMPLEMENTED | zones.service.ts:35-36, 152-175 |

**Summary: 7 of 7 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Timezone support | [x] | ✅ DONE | zones.service.ts:2,45-47,87-94 |
| Task 2: Meal windows | [x] | ✅ DONE | zones.service.ts:21-27, MEAL_WINDOWS |
| Task 3: Weekend differentiation | [x] | ✅ DONE | zones.service.ts:29-33,53,108,139 |
| Task 4: Smooth transitions | [x] | ✅ DONE | zones.service.ts:35-36,152-175 |
| Task 5: Update API endpoint | [x] | ✅ DONE | zones.schema.ts:39-55, zones.routes.ts:28-32 |
| **Task 6: Unit tests** | [x] | ✅ DONE | zones.service.test.ts (21 tests) |

**Summary: 6 of 6 tasks completed**

### Key Findings

**MEDIUM Severity:**
- [x] [Med] **Task 6 implemented**: Unit tests added (21 tests, all passing)

**LOW Severity:**
- [x] [Low] Story tasks marked complete
- [ ] [Low] Timezone regex could be more robust (safe due to UTC fallback)

### Architectural Alignment

✅ Compliant with architecture.md meal window scores and weekend multipliers

### Security Notes

✅ No security issues. Input validation appropriate for timezone strings.

### Action Items

**Code Changes Required:**
- [x] [Med] Add unit tests for zones.service.ts meal time logic (Task 6) ✅ DONE
  - Test each meal window returns correct score ✅
  - Test weekend multipliers ✅
  - Test smooth transitions at boundaries ✅
  - Test timezone parameter handling ✅
  - Test edge case timezones ✅

**Advisory Notes:**
- Note: Consider using `Intl.DateTimeFormat` for timezone validation (future enhancement)
