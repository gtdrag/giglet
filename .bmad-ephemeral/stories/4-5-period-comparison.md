# Story 4.5: Period Comparison

Status: done

## Story

**As a** user,
**I want** to compare my earnings to the previous period,
**So that** I can see if I'm earning more or less.

## Acceptance Criteria

1. **Given** I am viewing a time period (Week/Month/Year), **When** I see the comparison indicator, **Then** I see "vs last week: +$X (+Y%)" or "-$X (-Y%)" with positive in green and negative in red

2. **Given** there's no data for the comparison period, **When** I view the comparison, **Then** I see "No data for last [period]" instead of comparison

3. **Given** I switch time periods, **When** the data updates, **Then** the comparison updates to show the new period comparison

## Prerequisites

- Story 4.2 (Time Period Switching) - Complete
- Story 4.4 (Individual Delivery List) - Complete

## Tasks / Subtasks

- [x] Task 1: Add Compare Endpoint to Backend API (AC: 1, 2)
  - [x] Create GetCompareSchema in earnings.schema.ts
  - [x] Add getComparison method to earningsService
  - [x] Add compare route and controller method
  - [x] Calculate previous period date range
  - [x] Return current, previous, and change data

- [x] Task 2: Add Compare Function to Mobile Service (AC: 1)
  - [x] Add PeriodComparison interface to earnings.ts
  - [x] Add getComparison function to earnings.ts

- [x] Task 3: Create PeriodComparisonCard Component (AC: 1, 2)
  - [x] Create component showing comparison data
  - [x] Green for positive, red for negative change
  - [x] Handle no data case with friendly message
  - [x] Format currency and percentage

- [x] Task 4: Integrate Comparison into Dashboard (AC: 1, 3)
  - [x] Fetch comparison data on period change
  - [x] Display PeriodComparisonCard in earnings card
  - [x] Update on period switch

## Dev Notes

### Technical Approach

Create a new compare endpoint that fetches both current and previous period summaries and calculates the difference. The comparison appears on the dashboard below the earnings amount.

**API Design:**
```
GET /api/v1/earnings/compare?period=week&timezone=America/Los_Angeles

Response:
{
  "success": true,
  "data": {
    "current": { "total": 542.75, "deliveryCount": 47, ... },
    "previous": { "total": 487.25, "deliveryCount": 42, ... },
    "change": {
      "earnings": 55.50,
      "earningsPercent": 11.4,
      "deliveries": 5
    },
    "hasPreviousData": true
  }
}
```

**Previous Period Calculation:**
- Week: Go back 7 days from current week start
- Month: Same dates in previous month
- Year: Same dates in previous year
- Today: Yesterday

**Key Components:**
- `apps/api/src/schemas/earnings.schema.ts` - Add GetCompareSchema
- `apps/api/src/services/earnings.service.ts` - Add getComparison method
- `apps/api/src/controllers/earnings.controller.ts` - Add compare endpoint
- `apps/api/src/routes/earnings.routes.ts` - Add compare route
- `apps/mobile/src/services/earnings.ts` - Add getComparison function
- `apps/mobile/src/components/PeriodComparisonCard.tsx` - New component
- `apps/mobile/app/(tabs)/dashboard.tsx` - Integrate comparison

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-4.md#AC-4.5.1-4.5.2] - Comparison ACs
- [Source: docs/epics.md#Story-4.5] - Story definition

### Learnings from Previous Story

**From Story 4-4-individual-delivery-list (Status: done)**

- Platform colors: DoorDash (#FF3008), Uber Eats (#06C167)
- Backend uses Zod schemas for validation
- Dashboard already fetches summary on period change

---

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Backend API: Added `/api/v1/earnings/compare` endpoint with `GetCompareSchema` validation
- Previous period calculation handles today (yesterday), week (-7 days), month (-1 month), year (-1 year)
- Mobile: Added `PeriodComparison` interface and `getComparison` function to earnings service
- New `PeriodComparisonCard` component with color-coded changes (green positive, red negative, gray neutral)
- Integrated into dashboard with refresh trigger for pull-to-refresh and manual delivery updates
- All tests pass (99 API + 163 mobile)

### File List

**Backend:**
- `apps/api/src/schemas/earnings.schema.ts` - Added GetCompareSchema
- `apps/api/src/services/earnings.service.ts` - Added getComparison, getSimpleSummary, getPreviousDateRange methods
- `apps/api/src/controllers/earnings.controller.ts` - Added getComparison method
- `apps/api/src/routes/earnings.routes.ts` - Added /compare route

**Mobile:**
- `apps/mobile/src/services/earnings.ts` - Added PeriodComparison interface and getComparison function
- `apps/mobile/src/components/PeriodComparisonCard.tsx` - New component (created)
- `apps/mobile/app/(tabs)/dashboard.tsx` - Integrated PeriodComparisonCard

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-04 | 1.0 | Story drafted with 4 tasks for period comparison feature |
| 2026-01-04 | 1.1 | Implementation complete: Backend compare endpoint, mobile service, PeriodComparisonCard component, dashboard integration |
| 2026-01-04 | 1.2 | Senior Developer Review notes appended - APPROVED |

---

## Senior Developer Review (AI)

**Reviewer:** George
**Date:** 2026-01-04
**Outcome:** APPROVED

### Summary

Story 4-5 Period Comparison is fully implemented. The backend compare endpoint correctly calculates previous period earnings and returns structured comparison data. The mobile PeriodComparisonCard component displays comparisons with proper color coding (green positive, red negative) and handles no-data cases gracefully. All tests pass.

### Key Findings

No HIGH or MEDIUM severity issues found.

**LOW Severity:**
- No unit tests added for the new PeriodComparisonCard component (advisory only)

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | Comparison shows "+$X (+Y%)" with positive green, negative red | IMPLEMENTED | `PeriodComparisonCard.tsx:99-118` - formatCurrency, formatPercent, changeColor logic |
| AC2 | No data shows "No data from last [period]" | IMPLEMENTED | `PeriodComparisonCard.tsx:70-96` - hasPreviousData checks |
| AC3 | Comparison updates on period switch | IMPLEMENTED | `PeriodComparisonCard.tsx:52-54` - useEffect with period dependency |

**Summary:** 3 of 3 acceptance criteria fully implemented

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| Task 1: Backend API | [x] | COMPLETE | earnings.schema.ts:41-46, earnings.service.ts:164-289, earnings.controller.ts:81-96, earnings.routes.ts:67-72 |
| Task 2: Mobile Service | [x] | COMPLETE | earnings.ts:44-67 (interface), earnings.ts:132-154 (function) |
| Task 3: PeriodComparisonCard | [x] | COMPLETE | PeriodComparisonCard.tsx (new file, 181 lines) |
| Task 4: Dashboard Integration | [x] | COMPLETE | dashboard.tsx:16, 46, 77, 85, 156-157 |

**Summary:** 4 of 4 tasks verified, 0 questionable, 0 false completions

### Test Coverage and Gaps

- All 262 tests passing (99 API + 163 mobile)
- No new tests added for PeriodComparisonCard (advisory - component uses existing tested service)

### Architectural Alignment

Implementation follows established patterns:
- Express/Prisma backend with Zod validation
- React Native/Expo mobile with Zustand state
- Consistent API response format `{success: true, data: ...}`
- Dark theme colors match existing UI

### Security Notes

No security concerns - follows existing auth patterns, all endpoints protected by requireAuth middleware.

### Best-Practices and References

- [Zustand state management](https://github.com/pmndrs/zustand)
- [React Native component patterns](https://reactnative.dev/docs/components-and-apis)

### Action Items

**Advisory Notes:**
- Note: Consider adding unit tests for PeriodComparisonCard component for future maintainability
- Note: Component fetches data independently (valid design choice for encapsulation)
