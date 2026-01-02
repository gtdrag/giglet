# Story 4.1: Today's Earnings Display

**Epic:** 4 - Earnings Dashboard
**Story ID:** 4.1
**Status:** done
**Priority:** P0
**Created:** 2026-01-02

---

## User Story

**As a** user,
**I want** to see my total earnings for today,
**So that** I know how much I've made.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Earnings tab shows today's total prominently | Large font, centered |
| AC2 | Platform breakdown visible (DoorDash: $X) | Shows per-platform amounts |
| AC3 | Display updates after sync completes | Pull-to-refresh or auto-update |
| AC4 | $0.00 shown with message if no earnings | "Start delivering to see earnings" |
| AC5 | Earnings calculated in user's timezone | Server respects timezone |
| AC6 | Tips and base pay summed correctly | Total = base_pay + tip |

---

## Tasks

### Task 1: Create Earnings API Endpoint
- [x] GET /api/v1/earnings/summary - Returns aggregated earnings
- [x] Accept query params: period (today, week, month, year), timezone
- [x] Return: total, tipTotal, basePayTotal, platformBreakdown[], deliveryCount
- [x] Query Delivery table with date filters

### Task 2: Create Earnings Service
- [x] Create `src/services/earnings.service.ts`
- [x] Implement `getEarningsSummary(userId, period, timezone)`
- [x] Group by platform for breakdown
- [x] Handle empty results gracefully

### Task 3: Create Earnings Screen (Mobile)
- [x] Create EarningsScreen component
- [x] Large total display at top
- [x] Platform breakdown cards below
- [x] Pull-to-refresh functionality
- [x] Loading and empty states

### Task 4: Wire Up Navigation
- [x] Ensure Earnings tab in bottom nav works
- [x] Screen fetches data on mount and focus

---

## Technical Notes

### API Response Structure

```typescript
interface EarningsSummaryResponse {
  period: 'today' | 'week' | 'month' | 'year';
  dateRange: {
    start: string; // ISO date
    end: string;
  };
  total: number;
  tipTotal: number;
  basePayTotal: number;
  deliveryCount: number;
  platformBreakdown: {
    platform: 'DOORDASH' | 'UBEREATS';
    total: number;
    tipTotal: number;
    basePayTotal: number;
    deliveryCount: number;
  }[];
}
```

### Timezone Handling

- Client sends timezone (e.g., "America/New_York") in request header or query
- Server calculates "today" based on user's local time
- Store all timestamps in UTC, convert for display

### Query Example

```sql
SELECT
  platform,
  SUM(earnings) as total,
  SUM(tip) as tip_total,
  SUM(base_pay) as base_pay_total,
  COUNT(*) as delivery_count
FROM deliveries
WHERE user_id = $1
  AND delivered_at >= $2  -- Start of today in user's TZ
  AND delivered_at < $3   -- End of today in user's TZ
GROUP BY platform
```

---

## Dependencies

### Prerequisites
- Story 3.2: DoorDash Earnings Sync Backend (completed)
- Story 1.4: Core Navigation (completed)

---

## Definition of Done

- [x] API endpoint returns correct aggregations
- [x] Mobile screen displays earnings
- [x] Pull-to-refresh works
- [x] Empty state shows correctly
- [x] Timezone handling verified

---

## Code Review

**Reviewer:** Claude (Senior Developer)
**Date:** 2026-01-02
**Verdict:** NEEDS REVISION

### Critical Issues

| ID | File | Issue | Severity |
|----|------|-------|----------|
| CR-1 | `earnings.controller.ts` | **Zod schemas defined but NOT used** - Controller casts query params directly without validation. Schemas in `earnings.schema.ts` are dead code. | HIGH |
| CR-2 | `earnings.service.ts:171-180` | **Invalid timezone could crash** - No validation of timezone string before passing to `Intl.DateTimeFormat`. Malformed timezone will throw uncaught exception. | HIGH |

### Medium Issues

| ID | File | Issue | Severity |
|----|------|-------|----------|
| CR-3 | `earnings.controller.ts:18,40` | **No period validation** - Controller accepts any string as period, relying on service default. Should validate against enum. | MEDIUM |
| CR-4 | `earnings.controller.ts:42-43` | **parseInt without radix** - `parseInt(req.query.limit as string)` should specify radix 10. Also NaN not handled. | MEDIUM |
| CR-5 | Mobile `earnings.ts` | **Duplicate type definitions** - Types duplicated between API and mobile. Should share types via a package or generate from OpenAPI. | MEDIUM |

### Minor Issues

| ID | File | Issue | Severity |
|----|------|-------|----------|
| CR-6 | `earningsStore.ts:101-104` | **useEffect missing deps** - In `earnings.tsx`, `useEffect` with empty deps but calls `fetchSummary`/`fetchDeliveries` which aren't stable refs. | LOW |
| CR-7 | `earnings.service.ts` | **No unit tests** - Service has complex timezone logic with no test coverage. | LOW |
| CR-8 | `earnings.routes.ts` | **Wrapper functions unnecessary** - `(req, res, next) => controller.method(req, res, next)` can just be `controller.method.bind(controller)` | LOW |

### Required Fixes Before Approval

1. ~~**Apply Zod validation middleware** to routes using the defined schemas~~ ✅ FIXED
2. ~~**Validate timezone** with try-catch around DateTimeFormat or allowlist~~ ✅ FIXED
3. ~~**Add radix to parseInt** and handle NaN cases~~ ✅ FIXED (using Zod coerce)

### Recommendations (Non-blocking)

- Add integration tests for earnings endpoints
- Consider shared type package for API/mobile type sync
- Add request validation middleware pattern to coding standards

### Fixes Applied

**CR-1 & CR-3 & CR-4 Fix:** Added `validateRequest` middleware to routes:
- `earnings.routes.ts` now uses `validateRequest(GetEarningsSummarySchema)` and `validateRequest(GetDeliveriesSchema)`
- Controller simplified to use validated typed params directly
- No more manual type casting or parseInt

**CR-2 Fix:** Added timezone validation to schema:
- `TimezoneSchema` uses `refine()` with try-catch around `Intl.DateTimeFormat`
- Invalid timezones now return 400 with clear error message

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-02 | Claude | Story created |
| 2026-01-02 | Claude | Code review completed - needs revision |
| 2026-01-02 | Claude | All critical issues fixed - approved |
