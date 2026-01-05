# Story 7.2: Earnings Summary Export

Status: done

## Story

**As a** Pro subscriber with synced earnings,
**I want** to export my earnings summary in CSV or PDF format,
**So that** I have documentation of my income for tax filing and personal records.

## Acceptance Criteria

1. **Given** I am a Pro subscriber with synced earnings, **When** I tap "Export Earnings Summary" on the Tax Export screen, **Then** I can select CSV or PDF format

2. **Given** I export earnings, **When** I view the file, **Then** I see breakdown by platform (DoorDash/Uber Eats) with totals for each

3. **Given** I export for multiple months, **When** I view the PDF, **Then** I see monthly subtotals organized chronologically

4. **Given** I export a date range, **When** I check totals, **Then** they match the sum of individual deliveries within that range

## Prerequisites

- Story 7.1 (IRS Mileage Log Export) - Complete (provides export infrastructure)
- Story 4.2 (Time Period Switching) - Complete (provides earnings data access)
- Epic 8 (Subscription & Payments) - Complete (provides Pro tier gating)
- Export service infrastructure from Story 7.1 available

## Tasks / Subtasks

- [x] Task 1: Create Earnings Export Types and Interfaces (AC: 2, 3, 4)
  - [x] Define `EarningsExportRow` interface with date, platform, basePay, tip, total, restaurantName
  - [x] Define `EarningsExportSummary` interface with periodStart, periodEnd, totalEarnings, platformBreakdown, monthlyBreakdown
  - [x] Add types to `apps/mobile/src/services/export/earningsCsvGenerator.ts`

- [x] Task 2: Create Earnings CSV Generator (AC: 1, 2, 4)
  - [x] Create `apps/mobile/src/services/export/earningsCsvGenerator.ts`
  - [x] Implement `generateEarningsCSV(deliveries: Delivery[], dateRange: DateRange): string`
  - [x] Output columns: Date, Platform, Restaurant, Base Pay, Tip, Total
  - [x] Add platform subtotals at end (DoorDash: $X, Uber Eats: $Y)
  - [x] Add grand total row

- [x] Task 3: Create Earnings PDF Generator (AC: 1, 2, 3)
  - [x] Create `apps/mobile/src/services/export/earningsPdfGenerator.ts`
  - [x] Implement `generateEarningsPDF(deliveries: Delivery[], dateRange: DateRange): Promise<string>`
  - [x] Design HTML template with:
    - Header with date range and title
    - Platform summary section with breakdown
    - Monthly breakdown table with subtotals
    - Detailed delivery list (if under threshold, else summary only)
    - Grand totals footer

- [x] Task 4: Extend Export Service for Earnings (AC: 1, 4)
  - [x] Add `generateEarningsSummary(format: 'csv' | 'pdf', dateRange: DateRange)` to `export.ts`
  - [x] Query earningsStore/API for deliveries in date range
  - [x] Aggregate data by platform and month
  - [x] Generate file using CSV or PDF generator
  - [x] Return file path for sharing

- [x] Task 5: Add Earnings Export Preview (AC: 4)
  - [x] Extend `getExportPreview()` to support `type: 'earnings'`
  - [x] Return delivery count, total earnings, platform breakdown preview
  - [x] Show preview in UI before export confirmation

- [x] Task 6: Update Tax Export Screen UI (AC: 1)
  - [x] Add "Export Earnings Summary" card below mileage export
  - [x] Reuse DateRangeSelector component
  - [x] Reuse format selector (CSV/PDF) pattern
  - [x] Show earnings export preview (delivery count, total, platform breakdown)
  - [x] Wire up export flow with share sheet

- [x] Task 7: Add Unit Tests (AC: 2, 3, 4)
  - [x] Test CSV generator produces correct columns and platform totals
  - [x] Test monthly aggregation logic
  - [x] Test platform breakdown calculations
  - [x] Test date range filtering
  - [x] Test edge cases (no data, single delivery, single platform)

## Dev Notes

### Technical Approach

This story extends the tax export infrastructure from Story 7.1 to support earnings summary exports. The pattern mirrors mileage export but pulls from earningsStore/API instead of mileageStore.

**Key Design Decisions:**
- Client-side generation using existing expo-print (PDF) and CSVGenerator patterns
- Reuse DateRangeSelector component and date range utilities
- Aggregate deliveries by platform and month for summary views
- PDF includes visual breakdown; CSV includes raw data + subtotals

### Data Source

Earnings data comes from the API/local cache:
```typescript
// Query pattern from earningsStore or API
const deliveries = await getDeliveriesInRange(dateRange.startDate, dateRange.endDate);
```

### CSV Format Example

```csv
Date,Platform,Restaurant,Base Pay,Tip,Total
2025-01-15,DOORDASH,Chipotle,6.50,4.00,10.50
2025-01-15,UBEREATS,McDonald's,5.25,3.50,8.75
2025-01-16,DOORDASH,Panera Bread,7.00,5.00,12.00
...
DOORDASH SUBTOTAL,,,,,"$850.00"
UBEREATS SUBTOTAL,,,,,"$650.00"
TOTAL,,,,,"$1,500.00"
```

### PDF Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .summary-box { border: 1px solid #ddd; padding: 16px; margin-bottom: 20px; }
    .platform-row { display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .month-header { background-color: #f0f0f0; font-weight: bold; }
    .totals { font-weight: bold; background-color: #e8e8e8; }
  </style>
</head>
<body>
  <h1>Earnings Summary</h1>
  <p>Period: {{startDate}} - {{endDate}}</p>

  <div class="summary-box">
    <h3>Platform Breakdown</h3>
    <div class="platform-row"><span>DoorDash:</span><span>{{doordashTotal}}</span></div>
    <div class="platform-row"><span>Uber Eats:</span><span>{{ubereatsTotal}}</span></div>
    <div class="platform-row"><strong>Total:</strong><strong>{{grandTotal}}</strong></div>
  </div>

  <h3>Monthly Summary</h3>
  <table>
    <thead><tr><th>Month</th><th>DoorDash</th><th>Uber Eats</th><th>Total</th></tr></thead>
    <tbody>{{monthlyRows}}</tbody>
  </table>

  <p><small>Generated by Giglet. For informational purposes only.</small></p>
</body>
</html>
```

### Aggregation Logic

```typescript
interface MonthlyBreakdown {
  month: string; // "2025-01"
  doordash: number;
  ubereats: number;
  total: number;
}

interface PlatformBreakdown {
  DOORDASH: number;
  UBEREATS: number;
}

function aggregateByMonth(deliveries: Delivery[]): MonthlyBreakdown[] {
  // Group by YYYY-MM, sum by platform
}

function aggregateByPlatform(deliveries: Delivery[]): PlatformBreakdown {
  // Sum all deliveries by platform
}
```

### Project Structure Notes

**New Files:**
- `apps/mobile/src/services/export/earningsCsvGenerator.ts` - Earnings CSV generation
- `apps/mobile/src/services/export/earningsPdfGenerator.ts` - Earnings PDF generation
- `apps/mobile/src/services/export/__tests__/earningsCsvGenerator.test.ts` - Unit tests

**Modified Files:**
- `apps/mobile/app/tax-export.tsx` - Add earnings export UI section
- `apps/mobile/src/services/export.ts` - Add earnings export methods

### Existing Infrastructure to Reuse

| Component | Location | Purpose |
|-----------|----------|---------|
| DateRangeSelector | `src/components/DateRangeSelector.tsx` | Date range picker (reuse) |
| dateRange utils | `src/utils/dateRange.ts` | Date range calculations (reuse) |
| csvGenerator | `src/services/export/csvGenerator.ts` | CSV escaping utilities (reuse patterns) |
| pdfGenerator | `src/services/export/pdfGenerator.ts` | PDF HTML template patterns (reuse) |
| export service | `src/services/export.ts` | Orchestration patterns (extend) |
| share service | `src/services/share.ts` | Share sheet (reuse) |
| subscriptionStore | `src/stores/subscriptionStore.ts` | Pro tier validation (reuse) |
| earningsStore | `src/stores/earningsStore.ts` | Earnings data source |

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-7.md#Story-7.2] - Acceptance criteria and data models
- [Source: docs/epics.md#Story-7.2] - Story definition
- [Source: .bmad-ephemeral/stories/tech-spec-epic-7.md#Workflows] - Earnings export flow
- [Source: .bmad-ephemeral/stories/tech-spec-epic-7.md#Data-Models] - EarningsExportRow interface

### Learnings from Previous Story

**From Story 7-1-irs-mileage-log-export (Status: done)**

- **Export Infrastructure Created**: Full export service architecture at `src/services/export.ts` - extend with `generateEarningsSummary()` method
- **CSV Generator Pattern**: Use `escapeCSVField()` from csvGenerator.ts for proper escaping
- **PDF Generator Pattern**: HTML template with expo-print works well - follow same structure
- **DateRangeSelector Available**: Fully functional component at `src/components/DateRangeSelector.tsx` - reuse directly
- **Date Range Utils**: All preset calculations at `src/utils/dateRange.ts` - reuse directly
- **Pro Tier Gating**: `canAccess('taxExport')` pattern established - reuse for earnings export
- **Share Flow**: `exportAndShareMileageLog()` pattern works - create parallel `exportAndShareEarningsSummary()`
- **Test Patterns**: Vitest with explicit local dates (`new Date(2025, 0, 15)`) avoids timezone issues
- **UI Colors**: #09090B (bg), #18181B (card), #27272A (border), #06B6D4 (cyan), #22C55E (green)

**Advisory from Review:**
- Address cache TTL consideration applies here too if caching delivery data
- Follow same escaping patterns for CSV to handle commas in restaurant names

[Source: .bmad-ephemeral/stories/7-1-irs-mileage-log-export.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/7-2-earnings-summary-export.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All 253 tests pass including 22 new earningsCsvGenerator tests

### Completion Notes List

- Created complete earnings export infrastructure mirroring mileage export patterns
- CSV generator with platform subtotals and grand total
- PDF generator with professional HTML template, platform breakdown section, and monthly summary table
- Extended export.ts with earnings-specific functions (getEarningsExportPreview, generateEarningsSummary, exportAndShareEarningsSummary)
- UI uses green (#22C55E) accent color to differentiate from cyan mileage export
- 22 unit tests covering CSV generation, platform aggregation, monthly breakdown, and edge cases

### File List

**New Files:**
- `apps/mobile/src/services/export/earningsCsvGenerator.ts` - Earnings CSV generation with types
- `apps/mobile/src/services/export/earningsPdfGenerator.ts` - Earnings PDF generation with HTML template
- `apps/mobile/src/services/export/__tests__/earningsCsvGenerator.test.ts` - 22 unit tests

**Modified Files:**
- `apps/mobile/src/services/export.ts` - Extended with earnings export functions
- `apps/mobile/app/tax-export.tsx` - Added earnings export UI section

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-04 | 1.0 | Story drafted from tech-spec-epic-7.md |
| 2026-01-04 | 1.1 | Implementation complete, all tasks done |
| 2026-01-04 | 1.2 | Code review completed - APPROVED |

---

## Code Review Notes

**Review Date:** 2026-01-04
**Reviewer:** Senior Developer Agent (Claude Opus 4.5)
**Status:** ✅ APPROVED

### Acceptance Criteria Verification

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC1 | Format selection (CSV/PDF) | ✅ PASS | `tax-export.tsx:400-460` format selector; `export.ts:343-357` format branching |
| AC2 | Platform breakdown with totals | ✅ PASS | `earningsCsvGenerator.ts:92-109` aggregateByPlatform(); `earningsCsvGenerator.ts:222-227` subtotals |
| AC3 | Monthly subtotals chronologically | ✅ PASS | `earningsCsvGenerator.ts:147-149` chronological sort; `earningsPdfGenerator.ts:312-331` monthly table |
| AC4 | Totals match sum of deliveries | ✅ PASS | `earningsCsvGenerator.ts:99-106` loop sums earnings; test at `:240-243` verifies |

### Task Completion Verification

| Task | Status | Evidence |
|------|--------|----------|
| Task 1: Types/Interfaces | ✅ | `earningsCsvGenerator.ts:13-54` |
| Task 2: CSV Generator | ✅ | `earningsCsvGenerator.ts:194-231` |
| Task 3: PDF Generator | ✅ | `earningsPdfGenerator.ts:50-341` |
| Task 4: Export Service | ✅ | `export.ts:324-371` |
| Task 5: Earnings Preview | ✅ | `export.ts:307-319` |
| Task 6: UI Update | ✅ | `tax-export.tsx:378-533` |
| Task 7: Unit Tests | ✅ | 22 tests in `earningsCsvGenerator.test.ts` |

### Code Quality Assessment

**Strengths:**
- Follows established mileage export patterns from Story 7.1
- Proper CSV escaping using `escapeCSV()` helper (`:59-64`)
- Well-defined TypeScript interfaces with proper exports
- Green (#22C55E) UI accent differentiates from cyan mileage export
- Pro tier gating correctly via `canAccess('taxExport')`
- Professional PDF HTML template with brand colors
- Comprehensive test coverage (22 unit tests, 253 total pass)

**Minor Observations (Non-blocking):**
1. `fetchDeliveriesInRange` fetches full year data and filters client-side - acceptable with 10K safety limit
2. Platform brand colors hardcoded in PDF (#FF3008 DoorDash, #06C167 Uber Eats) - standard practice

### Blocking Issues

None.

### Advisory for Future Stories

- Consider adding API endpoint for server-side date filtering if delivery volumes grow significantly
- Platform brand colors could be moved to constants if more platforms are added

### Recommendation

**APPROVED** - Story meets all acceptance criteria with clean implementation following established patterns.
