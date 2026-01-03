# Epic Technical Specification: Automatic Mileage Tracking

Date: 2026-01-03
Author: George
Epic ID: 6
Status: Draft

---

## Overview

Epic 6 implements automatic mileage tracking for Giglet, enabling delivery drivers to passively log miles driven for tax deductions. This is a core P0 feature that eliminates the tedious manual mileage logging that drivers currently struggle with. The implementation requires battery-efficient background location tracking, intelligent trip detection, and seamless integration with the existing mobile app architecture.

Background location tracking is one of the most technically challenging features in the app, requiring careful balance between accuracy, battery impact (<5% daily), and iOS/Android platform differences. The goal is "automatic everything" - drivers just drive, and Giglet handles the rest.

## Objectives and Scope

### In Scope

- Background location permission request with clear user explanation
- Battery-efficient background GPS tracking (target <5% daily impact)
- Automatic trip detection (start when driving >15 mph, stop after 5 min stationary)
- Trip logging with start/end times, miles, and route
- Mileage dashboard showing totals by period (day, week, month, year)
- IRS tax deduction estimate calculation ($0.67/mile for 2024)
- Trip history list with pagination
- Manual trip entry and editing
- Trip deletion with confirmation
- Delivery-trip correlation (match trips to synced deliveries)

### Out of Scope

- Real-time route visualization on map (nice-to-have for MVP)
- Background sync of trips to server (local-first, batch upload)
- Geofencing for known hot spots (optimization for later)
- Push notifications for trip completion (future enhancement)
- Integration with third-party mileage apps
- Offline map support

## System Architecture Alignment

This epic aligns with the architecture document's Background Location Tracking section:

**Mobile Components:**
- `expo-location` for background GPS with `TaskManager`
- `expo-task-manager` for background task registration
- Zustand store for mileage state (`mileageStore.ts`)
- Trip detection state machine (IDLE → MOVING → PAUSED → IDLE)

**Backend Components:**
- `mileage.routes.ts` - REST endpoints for trip CRUD
- `mileage.service.ts` - Trip aggregation and export logic
- Prisma `Trip` model (already defined in schema)

**Constraints:**
- iOS: Requires "Always Allow" location permission for background tracking
- Android: Requires `ACCESS_BACKGROUND_LOCATION` permission + foreground service
- Battery target: <5% daily impact using `Accuracy.Balanced` and batched updates

---

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs |
|--------|---------------|--------|---------|
| `LocationTrackingService` | Manages background location task lifecycle | User permissions, tracking state | Location events, trip state changes |
| `TripDetectionService` | State machine for trip start/stop detection | Location updates, speed, time | Trip start/end events |
| `MileageCalculator` | Calculates distance between location points | Location array | Miles traveled (Haversine formula) |
| `MileageStore` (Zustand) | Client-side mileage state management | Trips, settings | Reactive UI updates |
| `mileage.service.ts` (API) | Server-side trip aggregation and export | Trip records | Summaries, CSV/PDF exports |

### Data Models and Contracts

**Trip Model (Prisma - already exists):**
```prisma
model Trip {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(...)
  startedAt       DateTime
  endedAt         DateTime?
  miles           Decimal   @db.Decimal(10, 2)
  startLat        Float
  startLng        Float
  endLat          Float?
  endLng          Float?
  isManual        Boolean   @default(false)
  purpose         String    @default("Business - Delivery")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId, startedAt])
}
```

**Mobile Location Point (local storage):**
```typescript
interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;  // m/s
  accuracy: number;
}

interface ActiveTrip {
  id: string;
  startedAt: Date;
  points: LocationPoint[];
  currentMiles: number;
  state: 'MOVING' | 'PAUSED';
  pausedAt?: Date;
}
```

**Trip State Machine:**
```
IDLE → MOVING: Speed > 6.7 m/s (15 mph) for 30 seconds
MOVING → PAUSED: Stationary (<2 m/s) for 2 minutes
PAUSED → IDLE: Stationary for 5 minutes (trip ends, save)
PAUSED → MOVING: Speed > 6.7 m/s (trip continues)
```

### APIs and Interfaces

**Mileage API Endpoints (from architecture.md):**

| Method | Path | Request | Response | Auth |
|--------|------|---------|----------|------|
| GET | `/api/v1/mileage` | `?period=day\|week\|month\|year` | `{ totalMiles, taxDeduction, tripCount }` | Required |
| GET | `/api/v1/mileage/trips` | `?page=1&limit=20` | `{ trips[], pagination }` | Required |
| POST | `/api/v1/mileage/trips` | `{ startedAt, endedAt, miles, startLat, startLng, endLat, endLng, isManual }` | `{ trip }` | Required |
| PUT | `/api/v1/mileage/trips/:id` | `{ miles?, endedAt? }` | `{ trip }` | Required |
| DELETE | `/api/v1/mileage/trips/:id` | - | `{ success: true }` | Required |
| POST | `/api/v1/mileage/export` | `{ format: 'csv'\|'pdf', startDate, endDate }` | Binary file | Pro Required |

**Error Codes:**
- `LOCATION_PERMISSION_DENIED` - Background location not granted
- `TRIP_NOT_FOUND` - Trip ID doesn't exist
- `INVALID_TRIP_DATA` - Validation failed (e.g., negative miles)
- `EXPORT_LIMIT_EXCEEDED` - Free tier export attempt

### Workflows and Sequencing

**Enable Tracking Flow:**
```
1. User taps "Enable Automatic Tracking" on Mileage tab
2. App shows explanation modal (why "Always Allow" is needed)
3. Request `Location.requestBackgroundPermissionsAsync()`
4. If granted:
   a. Register background task with TaskManager
   b. Start location updates with battery-efficient settings
   c. Update preference: autoMileageTracking = true
   d. Show tracking indicator in UI
5. If denied:
   a. Show fallback modal (manual mode + settings link)
   b. User can still use manual trip entry
```

**Trip Detection Flow:**
```
1. Location update received (every 60s or 100m)
2. TripDetectionService evaluates state transition:
   - Calculate speed from last 3 points (smoothing)
   - Check duration thresholds
3. On IDLE → MOVING:
   a. Create new ActiveTrip
   b. Store first point
4. On each point while MOVING:
   a. Add point to trip
   b. Calculate cumulative distance
   c. Update currentMiles
5. On MOVING → PAUSED:
   a. Record pausedAt timestamp
   b. Continue collecting points (might resume)
6. On PAUSED → IDLE (trip end):
   a. Calculate final miles
   b. Save trip to local storage
   c. Queue for server sync (batch)
   d. Update UI (new trip in history)
```

**Batch Sync Flow:**
```
1. App becomes active or every 15 minutes in foreground
2. Check for unsynced trips in local storage
3. POST each trip to /api/v1/mileage/trips
4. On success: mark as synced, remove from queue
5. On failure: retry with exponential backoff
```

---

## Non-Functional Requirements

### Performance

| Metric | Target | Source |
|--------|--------|--------|
| Location update frequency | Every 60 seconds or 100 meters | Battery efficiency |
| Trip save latency | < 500ms local, < 2s server sync | PRD NFR |
| Mileage dashboard load | < 1 second | PRD: App cold start < 3s |
| Distance calculation accuracy | ±5% of actual miles | GPS inherent limitation |
| Batch sync | < 10 seconds for 20 trips | PRD: offline→online sync |

### Security

- Location data stored locally using `expo-secure-store` for encryption at rest
- Trip data transmitted via HTTPS/TLS 1.3
- Server-side: trips scoped to authenticated user (JWT required)
- No location data shared with third parties
- Location history retained per user preference (default: indefinite for tax purposes)
- Account deletion removes all trip history

### Reliability/Availability

- **Offline-first**: Trips recorded locally even without network
- **Background resilience**: TaskManager task survives app kill (iOS significant location changes)
- **Data integrity**: Trips saved atomically to local storage
- **Sync retry**: Exponential backoff (1min, 2min, 4min, max 30min)
- **Graceful degradation**: If GPS fails, pause tracking and notify user

### Observability

| Signal | Type | Purpose |
|--------|------|---------|
| `mileage.trip.started` | Event | Track trip detection rate |
| `mileage.trip.completed` | Event | Measure miles per trip |
| `mileage.permission.denied` | Event | Track permission grant rate |
| `mileage.sync.failed` | Error | Monitor sync reliability |
| `location.battery.usage` | Metric | Validate <5% target |
| `location.accuracy.avg` | Metric | Monitor GPS quality |

---

## Dependencies and Integrations

### NPM Dependencies (Mobile)

| Package | Version | Purpose |
|---------|---------|---------|
| `expo-location` | SDK 52 | Background location tracking |
| `expo-task-manager` | SDK 52 | Background task registration |
| `expo-secure-store` | SDK 52 | Encrypted local storage |
| `@react-native-async-storage/async-storage` | Latest | Trip queue storage |

### API Dependencies (Backend)

| Package | Version | Purpose |
|---------|---------|---------|
| `prisma` | 6.x | Database ORM (Trip model) |
| `zod` | 3.x | Request validation |
| `pdfkit` | Latest | PDF export generation |
| `csv-stringify` | Latest | CSV export generation |

### External Integrations

None for this epic - purely local GPS and server sync.

---

## Acceptance Criteria (Authoritative)

### Story 6.1: Location Permission and Tracking Enable
1. Given I tap "Enable Automatic Tracking", When prompted, Then I see clear explanation of why "Always Allow" is needed
2. Given I grant background location permission, When tracking enables, Then I see tracking indicator in UI
3. Given I deny location permission, When I view mileage tab, Then I see manual-only mode option and settings link

### Story 6.2: Background Location Tracking
4. Given tracking is enabled and I am driving >15 mph, When app is backgrounded, Then my location is recorded
5. Given I am stationary for 5+ minutes, When tracking detects this, Then trip ends and miles are saved
6. Given tracking is running all day, When I check battery usage, Then impact is <5%

### Story 6.3: Trip Detection and Logging
7. Given I start driving, When speed exceeds 15 mph for 30 seconds, Then a new trip begins
8. Given I am on a trip, When I stop for <5 minutes then resume, Then it's the same trip (not new)
9. Given trip ends, When saved, Then I see: start time, end time, miles, route points

### Story 6.4: Mileage Dashboard Display
10. Given I have tracked trips, When I view Mileage tab, Then I see totals: Today, This Week, This Month, This Year
11. Given I have trips, When I view dashboard, Then I see IRS tax deduction estimate (miles × $0.67)
12. Given tracking is disabled, When I view Mileage tab, Then I see prompt to enable + manual entry option

### Story 6.5: Trip History List
13. Given I have trips, When I tap "View All Trips", Then I see chronological list (newest first)
14. Given I view trip list, When I see entries, Then each shows: date, time, miles

### Story 6.6: Manual Trip Entry and Editing
15. Given I tap "Add Trip", When I enter date and miles, Then trip saves with isManual=true
16. Given I view a trip, When I tap Edit, Then I can modify miles or delete trip
17. Given I delete a trip, When I confirm, Then trip is removed from history and totals

### Story 6.7: Delivery-Trip Correlation
18. Given I have synced deliveries and trips, When times overlap, Then trips show matched delivery icon
19. Given trip matches delivery, When I view trip details, Then I see linked delivery info

---

## Traceability Mapping

| AC# | Spec Section | Component(s) | Test Idea |
|-----|--------------|--------------|-----------|
| 1 | Workflows/Enable Tracking | PermissionModal, LocationTrackingService | Mock permission flow, verify modal content |
| 2 | Workflows/Enable Tracking | TrackingIndicator, MileageStore | Grant permission, verify indicator renders |
| 3 | Workflows/Enable Tracking | ManualModeCard | Deny permission, verify fallback UI |
| 4 | Data Models/Location Point | TaskManager task, LocationTrackingService | Mock backgrounded state, verify points recorded |
| 5 | Workflows/Trip Detection | TripDetectionService, PAUSED→IDLE | Simulate stationary, verify trip saved |
| 6 | NFR/Performance | Battery profiling | Run 8-hour tracking, measure battery delta |
| 7 | Data Models/Trip State Machine | IDLE→MOVING transition | Simulate speed series, verify trip starts |
| 8 | Data Models/Trip State Machine | PAUSED→MOVING transition | Short stop + resume, verify single trip |
| 9 | Data Models/Trip | Trip save logic | Complete trip, verify all fields populated |
| 10 | APIs/GET /mileage | MileageDashboard, mileage.service | Create trips, verify aggregations correct |
| 11 | APIs/GET /mileage | TaxEstimate component | Verify: 100 miles × $0.67 = $67 |
| 12 | Workflows/Enable Tracking | EnableTrackingCard | New user, verify CTA displayed |
| 13 | APIs/GET /mileage/trips | TripHistoryList | Create 25 trips, verify pagination works |
| 14 | Data Models/Trip | TripListItem | Verify date, time, miles display format |
| 15 | APIs/POST /mileage/trips | ManualTripForm | Submit form, verify isManual=true |
| 16 | APIs/PUT /mileage/trips | TripEditModal | Modify miles, verify update persists |
| 17 | APIs/DELETE /mileage/trips | DeleteConfirmation | Delete trip, verify totals recalculated |
| 18 | Workflows/Trip-Delivery Matching | CorrelationService | Overlapping timestamps, verify match |
| 19 | Data Models/Trip + Delivery | TripDetailModal | Matched trip, verify delivery info shown |

---

## Risks, Assumptions, Open Questions

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | iOS may reject app due to background location without clear use case | Medium | High | Prepare detailed App Store justification; emphasize tax deduction purpose |
| R2 | Battery usage exceeds 5% target on some devices | Medium | Medium | Use `Accuracy.Balanced`, defer updates with `deferredUpdatesInterval`; test on multiple devices |
| R3 | GPS drift causes inaccurate mileage | Medium | Medium | Filter unrealistic jumps (>100 mph), use Kalman filtering for smoothing |
| R4 | Trip detection triggers incorrectly (e.g., passenger in car) | Low | Low | Add optional "work mode" toggle; consider activity recognition |

### Assumptions

- Users will grant "Always Allow" location permission when explained properly
- IRS mileage rate ($0.67/mile for 2024) is acceptable hardcoded for MVP; rate updates annually
- Local-first storage with batch sync is acceptable (no real-time server updates needed)
- Trip purpose defaults to "Business - Delivery" (editable later if needed)

### Open Questions

| ID | Question | Impact | Proposed Resolution |
|----|----------|--------|---------------------|
| Q1 | Should we support activity recognition to auto-pause when walking? | Battery/UX | Defer to post-MVP; current speed threshold is sufficient |
| Q2 | How long to retain trip history for free tier users? | Storage/Policy | Unlimited for now (tax records need 7 years) |
| Q3 | Should manual trips require location or allow text-only? | UX | Allow text-only for simplicity; optional location picker |

---

## Test Strategy Summary

### Unit Tests
- Trip state machine transitions (TripDetectionService)
- Distance calculation (Haversine formula accuracy)
- Tax deduction calculation (miles × rate)
- Trip aggregation by period (mileage.service)

### Integration Tests
- Location permission flow (mock expo-location)
- Trip CRUD API endpoints (Supertest)
- Sync queue processing

### E2E Tests (Detox)
- Enable tracking flow → grant permission → verify indicator
- Complete trip simulation → verify in history
- Manual trip entry → verify in totals

### Device Testing
- iOS 15+ (iPhone 12, 14, 15)
- Android API 26+ (Pixel 6, Samsung S23)
- Battery usage profiling over 8-hour driving session
- Accuracy comparison: app miles vs odometer reading
