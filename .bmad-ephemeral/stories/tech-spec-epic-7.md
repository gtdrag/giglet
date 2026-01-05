# Epic Technical Specification: Tax Export

Date: 2026-01-05
Author: George
Epic ID: 7
Status: Draft

---

## Overview

Epic 7 delivers IRS-compliant tax export functionality for Pro subscribers, enabling drivers to generate mileage logs and earnings summaries for tax filing purposes. This addresses PRD user story US-6.1 through US-6.5, providing the documentation drivers need to claim the standard mileage deduction ($0.67/mile for 2024) and report gig income accurately.

The export system generates both CSV (for accountants/spreadsheet users) and PDF (print-ready) formats, covering mileage logs with IRS-required fields (date, purpose, locations, miles) and earnings summaries with platform breakdowns. Date range selection supports common tax scenarios (quarterly, annual) as well as custom ranges.

## Objectives and Scope

### In Scope

- **Story 7.1**: IRS-compliant mileage log export (CSV and PDF formats)
- **Story 7.2**: Earnings summary export with platform breakdown
- **Story 7.3**: Date range selection with presets (This Year, Last Year, Q1-Q4, Custom)
- **Story 7.4**: Year-to-date tax deduction estimate display
- **Story 7.5**: Share sheet integration and direct email option
- Pro tier gating for export features
- On-device document generation (no server-side PDF rendering)

### Out of Scope

- Tax advice or filing assistance
- Integration with tax software (TurboTax, H&R Block)
- 1099 form generation (provided by platforms)
- Multi-year comparison reports
- Expense categories beyond mileage (fuel, phone, etc.)

## System Architecture Alignment

### Components Referenced

| Component | Location | Purpose |
|-----------|----------|---------|
| Mobile Export Service | `apps/mobile/src/services/export.ts` | New service for document generation |
| Trip Store | `apps/mobile/src/stores/mileageStore.ts` | Source data for mileage exports |
| Earnings Store | `apps/mobile/src/stores/earningsStore.ts` | Source data for earnings exports |
| Subscription Store | `apps/mobile/src/stores/subscriptionStore.ts` | Pro tier validation |
| API Export Endpoints | `apps/api/src/routes/export.routes.ts` | Optional server-side aggregation |

### Architectural Constraints

1. **Client-Side Generation**: PDF and CSV generation happens on-device to minimize API costs and latency
2. **Pro Feature Gating**: All export features require active Pro subscription (checked via subscriptionStore)
3. **Data Residency**: Export data comes from locally synced Trip and Delivery records
4. **File Size Limits**: Generated files must be reasonable for email attachment (<10MB)
5. **Offline Capable**: Exports work offline using cached data

## Detailed Design

### Services and Modules

| Service | Location | Responsibility |
|---------|----------|----------------|
| **ExportService** | `apps/mobile/src/services/export.ts` | Orchestrates document generation, format selection, file saving |
| **MileageExporter** | `apps/mobile/src/services/export/mileage.ts` | Generates IRS-compliant mileage log CSV/PDF |
| **EarningsExporter** | `apps/mobile/src/services/export/earnings.ts` | Generates earnings summary CSV/PDF |
| **PDFGenerator** | `apps/mobile/src/services/export/pdfGenerator.ts` | React-native-pdf-lib wrapper for PDF creation |
| **CSVGenerator** | `apps/mobile/src/services/export/csvGenerator.ts` | CSV formatting utility |
| **DateRangeUtils** | `apps/mobile/src/utils/dateRange.ts` | Preset and custom date range calculations |
| **ShareService** | `apps/mobile/src/services/share.ts` | Native share sheet integration |

### Data Models and Contracts

```typescript
// Export Request Types
interface ExportRequest {
  type: 'mileage' | 'earnings';
  format: 'csv' | 'pdf';
  dateRange: DateRange;
}

interface DateRange {
  start: Date;
  end: Date;
  preset?: DateRangePreset;
}

type DateRangePreset =
  | 'this_year'
  | 'last_year'
  | 'q1' | 'q2' | 'q3' | 'q4'
  | 'this_month'
  | 'custom';

// Mileage Export Row
interface MileageExportRow {
  date: string;           // "2025-12-15"
  businessPurpose: string; // "Delivery driving"
  startLocation: string;  // "123 Main St, Los Angeles, CA"
  endLocation: string;    // "456 Oak Ave, Los Angeles, CA"
  miles: number;          // 12.5
  tripId?: string;        // Internal reference
  deliveryId?: string;    // If correlated to delivery
}

// Earnings Export Row
interface EarningsExportRow {
  date: string;
  platform: 'DOORDASH' | 'UBEREATS';
  basePay: number;
  tip: number;
  total: number;
  restaurantName?: string;
}

// Export Summary (for PDF header)
interface ExportSummary {
  periodStart: Date;
  periodEnd: Date;
  totalMiles?: number;
  totalEarnings?: number;
  estimatedDeduction?: number;
  platformBreakdown?: Record<string, number>;
}
```

### APIs and Interfaces

**Client-Side Only (No Backend Endpoints Required)**

The export functionality is entirely client-side, pulling data from local stores:

```typescript
// apps/mobile/src/services/export.ts

class ExportService {
  // Generate and save mileage log
  async generateMileageLog(
    format: 'csv' | 'pdf',
    dateRange: DateRange
  ): Promise<string>; // Returns file path

  // Generate and save earnings summary
  async generateEarningsSummary(
    format: 'csv' | 'pdf',
    dateRange: DateRange
  ): Promise<string>; // Returns file path

  // Share generated file via native share sheet
  async shareFile(filePath: string): Promise<void>;

  // Get preview data (record count, totals) before export
  async getExportPreview(
    type: 'mileage' | 'earnings',
    dateRange: DateRange
  ): Promise<ExportPreview>;
}

interface ExportPreview {
  recordCount: number;
  totalMiles?: number;
  totalEarnings?: number;
  estimatedDeduction?: number;
  dateRange: { start: string; end: string };
}
```

**Optional Backend Endpoint (for server-aggregated data)**

```
POST /api/v1/mileage/export
  Request: { format: "csv" | "pdf", startDate: string, endDate: string }
  Response: { url: string } // Signed URL to download
  Auth: Required (Pro tier)
```

### Workflows and Sequencing

**Mileage Export Flow**

```
1. User taps "Export Mileage Log" on Tax Export screen
2. Pro subscription validated (subscriptionStore.isProUser)
3. Date range selector shown with presets
4. User selects date range and format (CSV/PDF)
5. ExportService.getExportPreview() called → shows record count
6. User confirms export
7. MileageExporter queries mileageStore for trips in range
8. For each trip: reverse geocode start/end if not cached
9. CSVGenerator or PDFGenerator formats data
10. File saved to device temp directory
11. Share sheet presented automatically
12. User shares via email, Files, AirDrop, etc.
```

**Earnings Export Flow**

```
1. User taps "Export Earnings Summary" on Tax Export screen
2. Pro subscription validated
3. Date range selector shown
4. User selects range and format
5. EarningsExporter queries earningsStore
6. Data aggregated by month and platform
7. Document generated (CSV: raw data, PDF: formatted report)
8. Share sheet presented
```

**YTD Deduction Display Flow**

```
1. User views Mileage tab or Tax Export screen
2. mileageStore queried for current year trips
3. Total miles calculated
4. Deduction = totalMiles × IRS_MILEAGE_RATE ($0.67)
5. Display "YTD: X miles | Est. Deduction: $Y"
```

## Non-Functional Requirements

### Performance

| Metric | Target | Source |
|--------|--------|--------|
| Export generation time (1 year data) | < 5 seconds | PRD §5.4 app responsiveness |
| PDF file size (1 year) | < 2 MB | Email attachment limits |
| CSV file size (1 year) | < 500 KB | Practical limit |
| Date range picker response | < 100ms | UI responsiveness |
| Reverse geocoding batch | < 2 seconds for 50 locations | Mapbox limits |

**Optimization Strategies:**
- Cache reverse geocoded addresses in Trip records
- Generate PDF progressively (stream to file)
- Limit export to 10,000 records per request

### Security

| Requirement | Implementation | Source |
|-------------|----------------|--------|
| Pro tier verification | Check subscriptionStore.isProUser before export | PRD §4.6 |
| No PII in logs | Do not log addresses or earnings amounts | Architecture §Cross-Cutting |
| Secure file storage | Use expo-file-system temp directory (auto-cleaned) | iOS/Android guidelines |
| Share sheet only | No direct upload to third-party servers | Privacy policy |

**Security Notes:**
- Export files contain sensitive financial data (earnings, addresses)
- Files stored temporarily and cleaned on app restart
- User controls sharing destination (not app)

### Reliability/Availability

| Scenario | Behavior |
|----------|----------|
| Offline export | Works using cached data from stores |
| Missing location data | Show "Unknown" for start/end location |
| Incomplete trip data | Skip malformed records, show count of skipped |
| Export interruption | Partial file deleted, user can retry |
| Large dataset | Progressive generation prevents memory issues |

### Observability

| Signal | Implementation |
|--------|----------------|
| Export initiated | Analytics: `export_started { type, format, date_range }` |
| Export completed | Analytics: `export_completed { type, format, record_count, duration_ms }` |
| Export failed | Sentry: Error with context (type, format, error message) |
| Share action | Analytics: `export_shared { type, format, share_target? }` |

**Metrics to Track:**
- Export success rate by type/format
- Average export generation time
- Most common date range presets used
- Share completion rate

## Dependencies and Integrations

### New Dependencies Required

| Package | Version | Purpose | Size Impact |
|---------|---------|---------|-------------|
| `expo-sharing` | ~14.0.x | Native share sheet integration | Minimal (Expo SDK) |
| `expo-file-system` | ~19.0.x | File read/write for exports | Minimal (Expo SDK) |
| `expo-print` | ~15.0.x | PDF generation via native WebView | Minimal (Expo SDK) |

### Existing Dependencies Used

| Package | Current Version | Purpose in Epic 7 |
|---------|-----------------|-------------------|
| `@react-native-community/datetimepicker` | 8.4.4 | Date range selection UI |
| `zustand` | 5.0.9 | Access mileageStore, earningsStore, subscriptionStore |
| `react-native-purchases` | 9.6.13 | Pro tier validation |
| `expo-location` | 19.0.8 | Reverse geocoding for addresses |
| `axios` | 1.13.2 | Optional: API calls for server-side export |

### External Integrations

| Integration | Purpose | API/SDK |
|-------------|---------|---------|
| Mapbox Geocoding | Reverse geocode trip start/end for addresses | Already integrated via zones |
| Native Share Sheet | iOS: UIActivityViewController, Android: Intent.ACTION_SEND | expo-sharing |
| iOS Files App | Save to user's files | expo-file-system + expo-sharing |
| Email Clients | Attach export as email attachment | Native share sheet |

### IRS Compliance Reference

| Requirement | Implementation |
|-------------|----------------|
| Date of trip | Trip.startedAt formatted as YYYY-MM-DD |
| Business purpose | Default: "Delivery driving" (editable per trip) |
| Starting location | Reverse geocoded address from Trip.startLat/startLng |
| Ending location | Reverse geocoded address from Trip.endLat/endLng |
| Total miles | Trip.miles |

**IRS Mileage Rate:** $0.67/mile for 2024 (configurable constant for annual updates)

## Acceptance Criteria (Authoritative)

### Story 7.1: IRS Mileage Log Export

| AC# | Criterion | Testable Statement |
|-----|-----------|-------------------|
| 7.1.1 | Pro user can export mileage log | Given I am a Pro subscriber with tracked mileage, When I tap "Export Mileage Log", Then I can select CSV or PDF format |
| 7.1.2 | CSV contains IRS fields | Given I export to CSV, When I open the file, Then it contains columns: Date, Business Purpose, Start Location, End Location, Miles |
| 7.1.3 | PDF is print-ready | Given I export to PDF, When I open the file, Then it is properly formatted with header, totals, and IRS-compliant layout |
| 7.1.4 | Date range applied | Given I select a date range, When export generates, Then only trips within that range are included |
| 7.1.5 | File accessible | Given export completes, When I tap Share, Then the native share sheet opens with the file |

### Story 7.2: Earnings Summary Export

| AC# | Criterion | Testable Statement |
|-----|-----------|-------------------|
| 7.2.1 | Pro user can export earnings | Given I am a Pro subscriber with synced earnings, When I tap "Export Earnings Summary", Then I can select CSV or PDF format |
| 7.2.2 | Platform breakdown included | Given I export earnings, When I view the file, Then I see breakdown by platform (DoorDash/Uber Eats) |
| 7.2.3 | Monthly breakdown included | Given I export for multiple months, When I view the PDF, Then I see monthly subtotals |
| 7.2.4 | Total earnings accurate | Given I export a date range, When I check totals, Then they match the sum of individual deliveries |

### Story 7.3: Date Range Selection

| AC# | Criterion | Testable Statement |
|-----|-----------|-------------------|
| 7.3.1 | Presets available | Given I am exporting, When I reach date selection, Then I see presets: This Year, Last Year, Q1-Q4 |
| 7.3.2 | Custom range works | Given I select Custom, When I pick start and end dates, Then export reflects my selection |
| 7.3.3 | Preview shows count | Given I select a date range, When preview loads, Then I see "X trips" or "Y deliveries" count |
| 7.3.4 | Last Year is accurate | Given I select "Last Year", When export generates, Then it covers Jan 1 - Dec 31 of previous year |

### Story 7.4: YTD Tax Deduction Display

| AC# | Criterion | Testable Statement |
|-----|-----------|-------------------|
| 7.4.1 | YTD miles shown | Given I have tracked mileage, When I view Mileage tab, Then I see "YTD: X miles" |
| 7.4.2 | Deduction calculated | Given I have YTD miles, When I view deduction, Then it shows "Est. Deduction: $Y" (miles × $0.67) |
| 7.4.3 | Rate explained | Given I tap info icon, When tooltip appears, Then it explains IRS mileage rate |
| 7.4.4 | Resets annually | Given it is January 1, When I view YTD, Then calculation starts fresh |

### Story 7.5: Export Share and Email

| AC# | Criterion | Testable Statement |
|-----|-----------|-------------------|
| 7.5.1 | Share sheet opens | Given I generated an export, When I tap Share, Then native share sheet appears |
| 7.5.2 | Email attachment works | Given I share via email, When I send, Then file is attached correctly |
| 7.5.3 | Save to Files works | Given I share, When I select "Save to Files", Then file saves to chosen location |
| 7.5.4 | AirDrop works (iOS) | Given I share on iOS, When I select AirDrop, Then file transfers successfully |

## Traceability Mapping

| AC | PRD Ref | Spec Section | Component | Test Idea |
|----|---------|--------------|-----------|-----------|
| 7.1.1 | US-6.1 | Workflows/Mileage Export | ExportService, MileageExporter | Integration: Export button → file generation |
| 7.1.2 | US-6.1 | Data Models/MileageExportRow | CSVGenerator | Unit: Verify CSV column headers and format |
| 7.1.3 | US-6.1 | Services/PDFGenerator | PDFGenerator | Snapshot: PDF layout matches design |
| 7.1.4 | US-6.4 | Workflows/Mileage Export | MileageExporter | Unit: Date filtering logic |
| 7.1.5 | US-6.5 | Dependencies/expo-sharing | ShareService | Integration: Share sheet invocation |
| 7.2.1 | US-6.2 | Workflows/Earnings Export | ExportService, EarningsExporter | Integration: Export button → file generation |
| 7.2.2 | US-6.2 | Data Models/EarningsExportRow | EarningsExporter | Unit: Platform grouping logic |
| 7.2.3 | US-6.2 | Services/PDFGenerator | PDFGenerator | Unit: Monthly aggregation |
| 7.2.4 | US-6.2 | Services/EarningsExporter | EarningsExporter | Unit: Total calculation accuracy |
| 7.3.1 | US-6.4 | Data Models/DateRangePreset | DateRangeUtils | Unit: Preset date calculations |
| 7.3.2 | US-6.4 | Data Models/DateRange | DateRangeUtils, DateTimePicker | Integration: Custom range selection |
| 7.3.3 | US-6.4 | APIs/ExportPreview | ExportService | Unit: Preview count calculation |
| 7.3.4 | US-6.4 | Data Models/DateRangePreset | DateRangeUtils | Unit: Last year calculation |
| 7.4.1 | US-6.3 | Workflows/YTD Display | mileageStore | Unit: YTD aggregation |
| 7.4.2 | US-6.3 | Workflows/YTD Display | MileageTab UI | Unit: Deduction calculation |
| 7.4.3 | US-6.3 | Detailed Design | UI Component | Manual: Tooltip content |
| 7.4.4 | US-6.3 | Workflows/YTD Display | DateRangeUtils | Unit: Year boundary handling |
| 7.5.1 | US-6.5 | Dependencies/expo-sharing | ShareService | Integration: Share sheet invocation |
| 7.5.2 | US-6.5 | Dependencies/Share Sheet | ShareService | Manual: Email with attachment |
| 7.5.3 | US-6.5 | Dependencies/expo-file-system | ShareService | Manual: Files app integration |
| 7.5.4 | US-6.5 | Dependencies/Share Sheet | ShareService | Manual: AirDrop transfer |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **R1**: PDF generation performance on older devices | Medium | Medium | Test on iPhone 8/older Android; implement progressive generation |
| **R2**: Reverse geocoding API rate limits | Low | Medium | Cache addresses on Trip records; batch requests |
| **R3**: Large exports exceed memory limits | Low | High | Stream to file; cap at 10,000 records |
| **R4**: Share sheet compatibility across Android versions | Medium | Low | Test on Android 8-14; fallback to file save |
| **R5**: IRS mileage rate changes annually | Certain | Low | Make rate a constant; update annually |

### Assumptions

| ID | Assumption | Impact if Wrong |
|----|------------|-----------------|
| **A1** | Users have mileage tracking enabled (Epic 6) | No mileage data to export |
| **A2** | Users have synced earnings (Epic 3/4) | No earnings data to export |
| **A3** | expo-print works for PDF generation | May need alternative library |
| **A4** | Most exports are under 1,000 records | Performance optimization unnecessary |
| **A5** | Users understand IRS requirements | May need educational UI |

### Open Questions

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| **Q1** | Should PDF include Giglet branding/logo? | PM/Design | Open |
| **Q2** | Need server-side export for large datasets? | Architect | Resolved: No, client-side sufficient |
| **Q3** | Support Excel (.xlsx) format? | PM | Open - Defer to post-MVP |
| **Q4** | Add disclaimer about IRS rate being informational? | Legal | Open |

## Test Strategy Summary

### Test Levels

| Level | Focus | Framework | Coverage Target |
|-------|-------|-----------|-----------------|
| **Unit** | Export formatting, date calculations, aggregations | Vitest | 80% of new code |
| **Integration** | Full export flow, share sheet invocation | Vitest + mocks | Key flows |
| **Manual/E2E** | Real file generation, share sheet, email | Manual QA | All AC criteria |

### Key Test Scenarios

**Unit Tests:**
- CSVGenerator produces correct column headers
- PDFGenerator formats dates and numbers correctly
- DateRangeUtils calculates presets accurately
- MileageExporter filters trips by date range
- EarningsExporter aggregates by platform and month
- Pro tier gating prevents free user exports

**Integration Tests:**
- ExportService.generateMileageLog creates file on disk
- ExportService.generateEarningsSummary creates file
- ShareService.shareFile invokes native share sheet
- Export preview shows accurate record counts

**Manual Tests:**
- PDF opens in native viewer (iOS/Android)
- CSV opens in Excel/Google Sheets
- Email attachment arrives correctly
- AirDrop transfer works (iOS)
- Large export (1,000+ records) completes successfully

### Test Data Requirements

- Mocked mileageStore with 100+ trips spanning multiple months
- Mocked earningsStore with deliveries from both platforms
- Date range spanning at least 2 years for preset testing
- Edge cases: no data, single record, maximum records

### Coverage of Acceptance Criteria

| Story | Unit | Integration | Manual |
|-------|------|-------------|--------|
| 7.1 | 7.1.2, 7.1.4 | 7.1.1, 7.1.5 | 7.1.3 |
| 7.2 | 7.2.2, 7.2.3, 7.2.4 | 7.2.1 | - |
| 7.3 | 7.3.1, 7.3.4 | 7.3.2, 7.3.3 | - |
| 7.4 | 7.4.1, 7.4.2, 7.4.4 | - | 7.4.3 |
| 7.5 | - | 7.5.1 | 7.5.2, 7.5.3, 7.5.4 |
