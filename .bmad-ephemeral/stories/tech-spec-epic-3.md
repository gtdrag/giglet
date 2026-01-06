# Technical Specification: Epic 3 - Earnings Import

**Epic ID:** epic-3
**Generated:** 2026-01-03
**Status:** Draft
**Author:** SM Agent (Claude Opus 4.5)

---

## 1. Overview and Scope

### Epic Summary

Enable users to import their DoorDash and Uber Eats earnings via CSV export files, providing a simple, secure, and cost-effective way to consolidate earnings data without credential storage or server-side scraping infrastructure.

### Business Value

- **User Value:** Consolidated earnings view across platforms without credential sharing
- **Technical Value:** Zero server-side scraping infrastructure ($0 vs ~$50-200/month)
- **Privacy Value:** No credential storage liability; user controls their data
- **Simplicity:** CSV import is reliable and maintenance-free (no platform UI changes to track)

### Stories in Scope

| Story | Title | Priority | Complexity |
|-------|-------|----------|------------|
| 3.1 | CSV Import UI | P0 | Medium |
| 3.2 | CSV Parser Backend | P0 | Medium |
| 3.3 | Import History & Duplicate Detection | P0 | Medium |
| 3.4 | Manual Delivery Entry | P0 | Low |
| 3.5 | Import Tutorial & Platform Deep Links | P1 | Low |

### Out of Scope

- Automated credential-based platform sync (see deferred Epic 3 Alternative in epics.md)
- WebView-assist import approach (future consideration)
- Real-time earnings notifications
- Multi-currency support (USD only for MVP)

### Existing Infrastructure Note

The codebase contains platform connection infrastructure (`platform.service.ts`, `doordash.service.ts`) designed for credential-based automated sync. This is the **deferred approach**. Epic 3 implements the **CSV import approach** which is simpler and runs parallel to that infrastructure.

---

## 2. Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBILE APP                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Import UI   │  │ File Picker │  │ CSV Preview │              │
│  │ (Screen)    │  │ (Document)  │  │ (Component) │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │         Client-Side CSV Parser                 │              │
│  │         (Preview & Validation)                 │              │
│  └──────────────────────┬────────────────────────┘              │
│                         │                                        │
│  ┌──────────────────────┴────────────────────────┐              │
│  │              Earnings Store (Zustand)          │              │
│  └──────────────────────┬────────────────────────┘              │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS (multipart/form-data)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND API                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 POST /earnings/import                    │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐            │    │
│  │  │  Multer   │  │   CSV     │  │ Dedupe    │            │    │
│  │  │  Upload   │  │  Parser   │  │ Service   │            │    │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘            │    │
│  │        │              │              │                   │    │
│  │  ┌─────┴──────────────┴──────────────┴─────┐            │    │
│  │  │           Delivery Service               │            │    │
│  │  └──────────────────────┬──────────────────┘            │    │
│  └─────────────────────────┼───────────────────────────────┘    │
│                            │                                     │
│  ┌─────────────────────────┴─────────────────────────────┐      │
│  │                    PostgreSQL                          │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐         │      │
│  │  │ Delivery │  │  Import  │  │ PlatformAcct │         │      │
│  │  │  Table   │  │  Batch   │  │   (optional) │         │      │
│  │  └──────────┘  └──────────┘  └──────────────┘         │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### New Components Required

**Mobile App:**
- `app/(tabs)/earnings/import.tsx` - Import screen
- `src/components/earnings/CSVPreview.tsx` - Preview component
- `src/components/earnings/ImportTutorial.tsx` - Platform-specific tutorial
- `src/components/earnings/ManualDeliveryModal.tsx` - Manual entry form
- `src/services/csvParser.ts` - Client-side CSV parsing
- `src/stores/earningsStore.ts` - Extended for import state

**Backend API:**
- `src/routes/earnings.routes.ts` - Extended with import endpoints
- `src/services/csv-parser.service.ts` - Server-side CSV parsing
- `src/services/delivery.service.ts` - Delivery CRUD operations
- `src/schemas/earnings.schema.ts` - Extended with import schemas

---

## 3. Detailed Design

### 3.1 Story 3.1: CSV Import UI

#### User Flow

1. User navigates to Earnings tab → taps "Import" button
2. Selects platform (DoorDash or Uber Eats)
3. (Optional) Views tutorial for that platform
4. Opens device file picker
5. Selects CSV file
6. Sees preview: delivery count, date range, estimated total
7. Confirms or cancels import
8. Sees success message with import summary

#### Mobile Components

**Import Screen (`app/(tabs)/earnings/import.tsx`):**

```typescript
interface ImportState {
  step: 'select' | 'preview' | 'importing' | 'complete';
  platform: 'DOORDASH' | 'UBEREATS' | null;
  file: DocumentPickerAsset | null;
  preview: ImportPreview | null;
  error: string | null;
}

interface ImportPreview {
  deliveryCount: number;
  dateRange: { start: string; end: string };
  estimatedTotal: number;
  duplicateCount: number;
  sampleDeliveries: ParsedDelivery[];
}
```

**File Picker Integration:**

```typescript
import * as DocumentPicker from 'expo-document-picker';

const pickCSVFile = async (): Promise<DocumentPickerAsset | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;
  return result.assets[0];
};
```

### 3.2 Story 3.2: CSV Parser Backend

#### CSV Format Specifications

**DoorDash CSV Columns:**
| Column | Type | Maps To |
|--------|------|---------|
| Date | DateTime | deliveredAt |
| Subtotal | Currency | basePay |
| Tip | Currency | tip |
| Total | Currency | earnings |
| Restaurant | String | restaurantName |

**Uber Eats CSV Columns:**
| Column | Type | Maps To |
|--------|------|---------|
| Trip Date | DateTime | deliveredAt |
| Fare | Currency | basePay |
| Tip | Currency | tip |
| Total | Currency | earnings |
| Restaurant | String | restaurantName |

#### Parser Service

```typescript
// src/services/csv-parser.service.ts

interface ParsedDelivery {
  externalId: string;  // Generated hash for deduplication
  platform: 'DOORDASH' | 'UBEREATS';
  deliveredAt: Date;
  basePay: number;
  tip: number;
  earnings: number;
  restaurantName: string | null;
}

interface ParseResult {
  deliveries: ParsedDelivery[];
  skippedRows: { row: number; reason: string }[];
  platform: Platform;
}

class CSVParserService {
  async parse(
    fileBuffer: Buffer,
    platform: Platform
  ): Promise<ParseResult> {
    // 1. Detect encoding (UTF-8, UTF-16)
    // 2. Parse CSV with papaparse
    // 3. Map columns based on platform
    // 4. Validate and normalize data
    // 5. Generate external IDs for deduplication
    // 6. Return parsed result with skipped rows
  }

  private generateExternalId(
    platform: Platform,
    deliveredAt: Date,
    earnings: number
  ): string {
    // Hash: platform + timestamp + earnings
    // Enables deduplication across imports
    return crypto
      .createHash('sha256')
      .update(`${platform}-${deliveredAt.toISOString()}-${earnings}`)
      .digest('hex')
      .substring(0, 32);
  }
}
```

#### API Endpoint

```typescript
// POST /api/v1/earnings/import
// Content-Type: multipart/form-data

interface ImportRequest {
  file: File;
  platform: 'DOORDASH' | 'UBEREATS';
}

interface ImportResponse {
  success: true;
  data: {
    importBatchId: string;
    imported: number;
    duplicatesSkipped: number;
    errorsSkipped: number;
    dateRange: { start: string; end: string };
    totalEarnings: number;
  };
}
```

### 3.3 Story 3.3: Import History & Duplicate Detection

#### Deduplication Strategy

**Composite Key:** `platform + deliveredAt + earnings`

```typescript
// Check for existing deliveries before insert
const existingIds = await prisma.delivery.findMany({
  where: {
    userId,
    externalId: { in: parsedDeliveries.map(d => d.externalId) }
  },
  select: { externalId: true }
});

const existingSet = new Set(existingIds.map(d => d.externalId));
const newDeliveries = parsedDeliveries.filter(
  d => !existingSet.has(d.externalId)
);
```

#### Import Batch Tracking

```prisma
// Add to schema.prisma

model ImportBatch {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform        Platform
  filename        String
  importedCount   Int
  duplicateCount  Int
  errorCount      Int
  createdAt       DateTime  @default(now())

  deliveries      Delivery[]

  @@index([userId, createdAt])
}

// Update Delivery model
model Delivery {
  // ... existing fields
  importBatchId   String?
  importBatch     ImportBatch? @relation(fields: [importBatchId], references: [id])
}
```

#### Import History API

```typescript
// GET /api/v1/earnings/imports
// Returns list of import batches for user

// DELETE /api/v1/earnings/imports/:batchId
// Deletes all deliveries from an import batch (undo import)
```

### 3.4 Story 3.4: Manual Delivery Entry

#### Modal Form

```typescript
interface ManualDeliveryInput {
  platform: 'DOORDASH' | 'UBEREATS';
  deliveredAt: Date;
  basePay: number;
  tip: number;
  restaurantName?: string;
}

// Validation
const ManualDeliverySchema = z.object({
  platform: z.enum(['DOORDASH', 'UBEREATS']),
  deliveredAt: z.date().max(new Date(), 'Cannot be in the future'),
  basePay: z.number().min(0).max(1000),
  tip: z.number().min(0).max(500),
  restaurantName: z.string().max(100).optional(),
});
```

#### API Endpoint

```typescript
// POST /api/v1/earnings/deliveries
// Create manual delivery

// PUT /api/v1/earnings/deliveries/:id
// Update any delivery (imported or manual)

// DELETE /api/v1/earnings/deliveries/:id
// Delete a delivery
```

### 3.5 Story 3.5: Import Tutorial & Platform Deep Links

#### Tutorial Content

**DoorDash Steps:**
1. Open DoorDash Dasher app
2. Go to Earnings section
3. Tap menu (•••) → Download History
4. Select date range → Download CSV
5. Return to Giglet and select the file

**Uber Eats Steps:**
1. Open Uber Driver app
2. Go to Earnings → Earnings Activity
3. Tap "Download" or "Export"
4. Select date range → Download CSV
5. Return to Giglet and select the file

#### Deep Links

```typescript
const PLATFORM_DEEP_LINKS = {
  DOORDASH: {
    app: 'doordash://earnings',  // Verify actual scheme
    web: 'https://dasher.doordash.com/earnings',
  },
  UBEREATS: {
    app: 'uber-driver://earnings',  // Verify actual scheme
    web: 'https://drivers.uber.com/earnings',
  },
};

const openPlatformEarnings = async (platform: Platform) => {
  const links = PLATFORM_DEEP_LINKS[platform];
  const canOpenApp = await Linking.canOpenURL(links.app);

  if (canOpenApp) {
    await Linking.openURL(links.app);
  } else {
    await Linking.openURL(links.web);
  }
};
```

---

## 4. Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| CSV Parse Time | <2s for 1000 rows | Responsive preview |
| Import API Response | <5s for 1000 deliveries | Acceptable wait time |
| Client Memory | <50MB during parse | Mobile device constraints |

### Security

- CSV files processed in memory, not persisted
- File size limit: 10MB
- MIME type validation before processing
- No executable content allowed
- Sanitize all string fields (prevent injection)

### Reliability

- Atomic batch import (all or nothing per batch)
- Retry logic for network failures
- Graceful handling of malformed CSVs
- Clear error messages for common issues

---

## 5. Dependencies

### Story Dependencies

```
Story 3.1 (CSV Import UI)
    ↓
Story 3.2 (CSV Parser Backend)
    ↓
Story 3.3 (Import History & Duplicate Detection)
    ↓
Story 3.4 (Manual Delivery Entry)

Story 3.5 (Import Tutorial) ← Independent, can parallel with 3.1
```

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| expo-document-picker | ~14.0 | File selection |
| papaparse | 5.x | CSV parsing |
| multer | 1.x | File upload handling |

### Database Changes

- New `ImportBatch` table
- Add `importBatchId` to `Delivery` table
- Add `externalId` to `Delivery` table (for deduplication)
- Migration required before Epic 3 stories

---

## 6. Acceptance Criteria Mapping

### Story 3.1: CSV Import UI

| AC | Criterion | Implementation |
|----|-----------|----------------|
| 1 | User can select CSV file | expo-document-picker integration |
| 2 | Preview shows count, date range, total | Client-side CSV parse + preview component |
| 3 | Confirm/cancel before import | Two-step flow with preview screen |
| 4 | Success message with summary | Toast/modal after API response |

### Story 3.2: CSV Parser Backend

| AC | Criterion | Implementation |
|----|-----------|----------------|
| 1 | DoorDash CSV parsed correctly | Column mapping per platform |
| 2 | Uber Eats CSV parsed correctly | Column mapping per platform |
| 3 | Invalid rows skipped with warning | ParseResult.skippedRows array |
| 4 | Data normalized to Delivery model | CSVParserService.parse() |

### Story 3.3: Import History & Duplicate Detection

| AC | Criterion | Implementation |
|----|-----------|----------------|
| 1 | Duplicates detected by composite key | externalId generation + lookup |
| 2 | "X new, Y duplicates skipped" shown | ImportResponse.duplicatesSkipped |
| 3 | Import history visible | GET /earnings/imports endpoint |
| 4 | Batch deletion works | DELETE /earnings/imports/:batchId |

### Story 3.4: Manual Delivery Entry

| AC | Criterion | Implementation |
|----|-----------|----------------|
| 1 | Add delivery form works | ManualDeliveryModal component |
| 2 | Manual entries marked as "Manual" | isManual flag on Delivery |
| 3 | Edit/delete any delivery | PUT/DELETE endpoints |

### Story 3.5: Import Tutorial & Platform Deep Links

| AC | Criterion | Implementation |
|----|-----------|----------------|
| 1 | Tutorial shows steps | ImportTutorial component |
| 2 | "Open Platform" button works | Deep link handling |
| 3 | Skip option available | tutorialSeen preference |

---

## 7. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Platform CSV format changes | Medium | Low | Version detection in parser, alert users |
| Large CSV files cause memory issues | High | Medium | Stream parsing, chunk processing |
| Deep links don't work on all devices | Low | Medium | Fallback to web URLs |
| Duplicate detection false positives | Medium | Low | Use timestamp + earnings + platform |

---

## 8. Test Strategy

### Unit Tests

- CSV parser for DoorDash format
- CSV parser for Uber Eats format
- External ID generation consistency
- Deduplication logic
- Date range calculation
- Currency parsing (various formats)

### Integration Tests

- Full import flow: file → parse → dedupe → save
- Import history retrieval
- Batch deletion cascade
- Manual entry CRUD

### E2E Tests

- Complete import user flow
- Tutorial navigation
- Manual entry flow
- Error state handling

### Test Data

Create mock CSV files:
- `doordash-sample.csv` (10 deliveries)
- `ubereats-sample.csv` (10 deliveries)
- `malformed.csv` (mixed valid/invalid)
- `large-file.csv` (1000 deliveries for performance)

---

## 9. Implementation Notes

### Migration Strategy

1. Create `ImportBatch` table
2. Add `externalId` and `importBatchId` columns to `Delivery`
3. Backfill `externalId` for existing deliveries (if any from credential-based sync)
4. Deploy backend changes
5. Deploy mobile changes

### Feature Flags

Consider feature flag for CSV import during rollout:
- `FEATURE_CSV_IMPORT_ENABLED` - Master toggle
- `FEATURE_MANUAL_DELIVERY_ENABLED` - Manual entry toggle

### Monitoring

- Track import success/failure rates
- Monitor parse error types
- Alert on high duplicate rates (may indicate user confusion)

---

## Change Log

| Date | Version | Author | Description |
|------|---------|--------|-------------|
| 2026-01-03 | 1.0 | SM Agent | Initial tech spec generated |
