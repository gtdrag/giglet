# Story 4.6: Hourly Rate Calculation

Status: done

## Story

**As a** user,
**I want** to see my effective hourly rate,
**So that** I understand my true earnings efficiency.

## Acceptance Criteria

1. **Given** I have mileage tracking data, **When** I view the hourly rate metric, **Then** I see "$/hour: $X.XX" calculated as Total Earnings / Active Hours

2. **Given** I don't have mileage tracking enabled or no trip data, **When** I view this metric, **Then** I see "Enable mileage tracking to see hourly rate"

3. **Given** I switch time periods, **When** the data updates, **Then** the hourly rate updates to reflect the new period

## Prerequisites

- Story 4.2 (Time Period Switching) - Complete
- Story 6.1+ (Mileage Tracking) - Complete

## Tasks / Subtasks

- [x] Task 1: Add Hourly Rate Endpoint to Backend API (AC: 1, 2)
  - [x] Create GetHourlyRateSchema in earnings.schema.ts
  - [x] Add getHourlyRate method to earningsService
  - [x] Add hourly-rate route and controller method
  - [x] Calculate active hours from Trip data
  - [x] Return hourlyRate, totalHours, totalEarnings, hasData

- [x] Task 2: Add Hourly Rate Function to Mobile Service (AC: 1)
  - [x] Add HourlyRateData interface to earnings.ts
  - [x] Add getHourlyRate function to earnings.ts

- [x] Task 3: Create HourlyRateCard Component (AC: 1, 2)
  - [x] Create component showing hourly rate
  - [x] Handle no data case with friendly message
  - [x] Format rate as "$XX.XX/hr"

- [x] Task 4: Integrate Hourly Rate into Dashboard (AC: 1, 3)
  - [x] Fetch hourly rate data on period change
  - [x] Display HourlyRateCard in earnings card
  - [x] Update on period switch

## Dev Notes

### Technical Approach

Create an hourly rate endpoint that calculates earnings efficiency by dividing total earnings by active hours (from Trip data). If no trip data exists, show a message encouraging the user to enable mileage tracking.

**API Design:**
```
GET /api/v1/earnings/hourly-rate?period=week&timezone=America/Los_Angeles

Response:
{
  "success": true,
  "data": {
    "totalEarnings": 542.75,
    "totalHours": 24.5,
    "hourlyRate": 22.15,
    "periodLabel": "This Week",
    "hasData": true
  }
}
```

**Active Hours Calculation:**
- Query Trip records for the period
- Sum (endedAt - startedAt) for each trip
- Convert to hours

**Key Components:**
- `apps/api/src/schemas/earnings.schema.ts` - Add GetHourlyRateSchema
- `apps/api/src/services/earnings.service.ts` - Add getHourlyRate method
- `apps/api/src/controllers/earnings.controller.ts` - Add hourly rate endpoint
- `apps/api/src/routes/earnings.routes.ts` - Add hourly-rate route
- `apps/mobile/src/services/earnings.ts` - Add getHourlyRate function
- `apps/mobile/src/components/HourlyRateCard.tsx` - New component
- `apps/mobile/app/(tabs)/dashboard.tsx` - Integrate hourly rate

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-4.md#AC-4.6.1-4.6.2] - Hourly rate ACs
- [Source: docs/epics.md#Story-4.6] - Story definition

### Learnings from Previous Story

**From Story 4-5-period-comparison (Status: done)**

- Use existing getDateRange helper for period calculations
- Component fetches independently with refreshTrigger pattern
- Color coding follows existing design patterns

---

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All 4 tasks completed successfully
- Backend endpoint calculates hourly rate from Trip data (startedAt/endedAt)
- Component shows "$XX.XX/hr" with cyan color (#06B6D4) and earnings/hours breakdown
- No-data state shows CTA to enable mileage tracking with link to mileage tab
- Follows existing refreshTrigger pattern for period updates
- Tests: 99 API + 163 mobile passing

### File List

- `apps/api/src/schemas/earnings.schema.ts` - Added GetHourlyRateSchema
- `apps/api/src/services/earnings.service.ts` - Added getHourlyRate method
- `apps/api/src/controllers/earnings.controller.ts` - Added getHourlyRate controller
- `apps/api/src/routes/earnings.routes.ts` - Added /hourly-rate route
- `apps/mobile/src/services/earnings.ts` - Added HourlyRateData interface and getHourlyRate function
- `apps/mobile/src/components/HourlyRateCard.tsx` - New component (185 lines)
- `apps/mobile/app/(tabs)/dashboard.tsx` - Integrated HourlyRateCard

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-04 | 1.0 | Story drafted with 4 tasks for hourly rate calculation feature |
| 2026-01-04 | 1.1 | Implementation complete, all tasks done |
| 2026-01-04 | 1.2 | Senior Developer Review notes appended - APPROVED |

---

## Senior Developer Review (AI)

### Review Details
- **Reviewer**: George
- **Date**: 2026-01-04
- **Outcome**: APPROVED

### Summary

Story 4.6 implementation is complete with all acceptance criteria verified. The hourly rate calculation feature correctly divides total earnings by active hours from Trip data and displays the result in a well-designed component that follows existing patterns.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | Display hourly rate as Total Earnings / Active Hours | IMPLEMENTED | `earnings.service.ts:443` calculates rate, `HourlyRateCard.tsx:15` formats as "$XX.XX/hr" |
| AC2 | Show "Enable mileage tracking" when no trip data | IMPLEMENTED | `earnings.service.ts:458` returns `hasData: trips.length > 0`, `HourlyRateCard.tsx:66-86` handles no-data state |
| AC3 | Hourly rate updates on period switch | IMPLEMENTED | `dashboard.tsx:161` passes `period` and `refreshTrigger` props, component re-fetches on change |

**Summary**: 3 of 3 acceptance criteria fully implemented

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Backend API endpoint | Complete | VERIFIED | Schema at `earnings.schema.ts:52-59`, Service at `earnings.service.ts:389-460`, Controller at `earnings.controller.ts:103-118`, Route at `earnings.routes.ts:76-80` |
| Task 2: Mobile service function | Complete | VERIFIED | Interface at `earnings.ts:44-50`, Function at `earnings.ts:167-186` |
| Task 3: HourlyRateCard component | Complete | VERIFIED | Component at `HourlyRateCard.tsx` (184 lines), formats rate, handles no-data case |
| Task 4: Dashboard integration | Complete | VERIFIED | Import at `dashboard.tsx:17`, Usage at `dashboard.tsx:161` with period/refresh props |

**Summary**: 4 of 4 completed tasks verified, 0 questionable, 0 false completions

### Test Coverage
- API tests: 99 passing
- Mobile tests: 163 passing
- No new tests added for hourly rate specifically, but existing test infrastructure covers the patterns used

### Architectural Alignment
- Follows existing pattern for period-based endpoints (same as comparison, summary)
- Component uses established refreshTrigger pattern
- Reuses getDateRange helper for timezone-aware period calculation
- Proper separation: schema validation → controller → service → Prisma

### Security Notes
- No security concerns - follows existing authenticated endpoint pattern
- User-scoped queries prevent data leakage between users

### Action Items

**Advisory Notes:**
- Note: Consider adding dedicated unit tests for getHourlyRate service method in future iteration
- Note: Edge case of very small hours (< 0.1) could result in very high hourly rates - consider capping or warning
