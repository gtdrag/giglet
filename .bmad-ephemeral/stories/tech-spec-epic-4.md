# Epic Technical Specification: Earnings Dashboard

Date: 2026-01-04
Author: George
Epic ID: 4
Status: Draft

---

## Overview

Epic 4 builds upon the CSV import infrastructure from Epic 3 to deliver a comprehensive earnings dashboard that displays synced earnings from DoorDash and Uber Eats. The dashboard provides time-based views, platform breakdowns, delivery lists, period comparisons, and hourly rate calculations - fulfilling PRD requirements FR-3.1 through FR-3.6.

This epic transforms the static placeholder dashboard into a fully functional earnings intelligence center that answers the driver's core question: "How much did I make?"

## Objectives and Scope

**In Scope:**
- Display today's total earnings prominently with real-time data
- Implement functional period selector (day/week/month/year)
- Show platform-wise earnings breakdown (DoorDash vs Uber Eats)
- Create scrollable delivery list with filtering
- Add period comparison feature (this week vs last week)
- Calculate and display effective hourly rate

**Out of Scope:**
- Custom date range picker (future enhancement)
- Earnings projections or forecasting
- Tips trend analysis (future story)
- Push notifications for earnings milestones
- Export functionality (Epic 7: Tax Export)

## System Architecture Alignment

This epic leverages the existing Express API backend with Prisma ORM and the React Native mobile app with Zustand state management. All earnings data flows through the established `/api/v1/earnings` endpoints created in Epic 3.

**Key Architecture Components:**
- Backend: Express routes → Controller → Service → Prisma → PostgreSQL
- Mobile: Zustand stores → API service → Axios → Backend API
- State: earningsStore.ts already has summary/deliveries/period infrastructure

**Constraints:**
- Must use existing Delivery model schema (no migrations required)
- Must follow established dark theme UI patterns
- API response format must match existing `{success: true, data: ...}` structure

## Detailed Design

### Services and Modules

| Module | Responsibility | Location |
|--------|---------------|----------|
| EarningsService | Aggregation queries, period calculations | `apps/api/src/services/earnings.service.ts` |
| EarningsController | Request handling, response formatting | `apps/api/src/controllers/earnings.controller.ts` |
| earningsStore | Client state, period switching, data fetching | `apps/mobile/src/stores/earningsStore.ts` |
| earnings service | API calls, data transformation | `apps/mobile/src/services/earnings.ts` |
| Dashboard UI | Earnings card, period selector, breakdown | `apps/mobile/app/(tabs)/dashboard.tsx` |
| DeliveriesScreen | Delivery list with infinite scroll | `apps/mobile/app/deliveries.tsx` |

### Data Models and Contracts

**Existing Delivery Model (no changes needed):**
```prisma
model Delivery {
  id                String    @id @default(cuid())
  userId            String
  platform          Platform  // DOORDASH | UBEREATS
  earnings          Decimal   @db.Decimal(10, 2)
  tip               Decimal   @db.Decimal(10, 2)
  basePay           Decimal   @db.Decimal(10, 2)
  restaurantName    String?
  deliveredAt       DateTime
  createdAt         DateTime  @default(now())
}
```

**EarningsSummary Response (existing):**
```typescript
interface EarningsSummary {
  totalEarnings: number;
  totalTips: number;
  totalBasePay: number;
  deliveryCount: number;
  startDate: string;
  endDate: string;
}
```

**NEW: PlatformBreakdown Response:**
```typescript
interface PlatformBreakdown {
  platform: 'DOORDASH' | 'UBEREATS';
  totalEarnings: number;
  deliveryCount: number;
  percentage: number;
}

interface EarningsSummaryWithBreakdown extends EarningsSummary {
  platformBreakdown: PlatformBreakdown[];
}
```

**NEW: PeriodComparison Response:**
```typescript
interface PeriodComparison {
  current: EarningsSummary;
  previous: EarningsSummary;
  change: {
    earnings: number;      // absolute change
    earningsPercent: number; // percentage change
    deliveries: number;
  };
}
```

**NEW: HourlyRateData:**
```typescript
interface HourlyRateData {
  totalEarnings: number;
  totalHours: number;
  hourlyRate: number;
  periodLabel: string;
}
```

### APIs and Interfaces

**Existing Endpoints (no changes needed):**
```
GET /api/v1/earnings/summary?period=today|week|month|year&timezone=America/Los_Angeles
GET /api/v1/earnings/deliveries?period=...&limit=20&offset=0
```

**NEW: Enhanced Summary with Platform Breakdown:**
```
GET /api/v1/earnings/summary?period=week&timezone=...&includeBreakdown=true

Response:
{
  "success": true,
  "data": {
    "totalEarnings": 542.75,
    "totalTips": 145.00,
    "totalBasePay": 397.75,
    "deliveryCount": 47,
    "startDate": "2026-01-01",
    "endDate": "2026-01-07",
    "platformBreakdown": [
      { "platform": "DOORDASH", "totalEarnings": 312.50, "deliveryCount": 28, "percentage": 57.6 },
      { "platform": "UBEREATS", "totalEarnings": 230.25, "deliveryCount": 19, "percentage": 42.4 }
    ]
  }
}
```

**NEW: Period Comparison Endpoint:**
```
GET /api/v1/earnings/compare?period=week&timezone=...

Response:
{
  "success": true,
  "data": {
    "current": { "totalEarnings": 542.75, "deliveryCount": 47, ... },
    "previous": { "totalEarnings": 487.25, "deliveryCount": 42, ... },
    "change": {
      "earnings": 55.50,
      "earningsPercent": 11.4,
      "deliveries": 5
    }
  }
}
```

**NEW: Hourly Rate Endpoint:**
```
GET /api/v1/earnings/hourly-rate?period=week&timezone=...

Response:
{
  "success": true,
  "data": {
    "totalEarnings": 542.75,
    "totalHours": 24.5,
    "hourlyRate": 22.15,
    "periodLabel": "This Week"
  }
}
```

### Workflows and Sequencing

**Dashboard Load Flow:**
1. User opens dashboard tab
2. earningsStore.fetchSummary() called with current period
3. API returns summary with platform breakdown
4. UI renders earnings card with animated numbers
5. Period selector shows current selection (default: week)

**Period Switch Flow:**
1. User taps different period (e.g., "Month")
2. earningsStore.setPeriod('month') updates state
3. Triggers fetchSummary() and fetchDeliveries()
4. UI updates with loading state, then new data

**Delivery List Flow:**
1. User taps "View all deliveries"
2. Navigate to /deliveries screen
3. Initial fetch: first 20 deliveries
4. Scroll to bottom triggers loadMore (infinite scroll)
5. Platform filter updates query params

## Non-Functional Requirements

### Performance

| Metric | Target | Implementation |
|--------|--------|----------------|
| Summary API response | < 200ms | PostgreSQL aggregation with indexes on userId, deliveredAt |
| Deliveries list load | < 300ms | Paginated with limit 20, cursor-based offset |
| Period switch | < 500ms | Client-side optimistic UI, background fetch |
| Dashboard cold start | < 1s | Cached last-known values in AsyncStorage |

### Security

- All endpoints require JWT authentication (existing middleware)
- User can only access their own earnings data (userId from JWT)
- No sensitive data logged (earnings amounts are safe)
- Input validation via Zod schemas (existing pattern)

### Reliability/Availability

- Graceful degradation: Show cached data if API unavailable
- Error states with retry buttons
- Pull-to-refresh on all data screens
- Offline indicator when no connection

### Observability

- Log earnings summary requests with period and result count
- Track period switch events in analytics
- Error logging for failed API calls
- Performance timing for aggregation queries

## Dependencies and Integrations

**Backend Dependencies (existing):**
- `prisma` ^6.x - ORM and aggregation queries
- `express` ^4.x - HTTP framework
- `zod` ^3.x - Request validation
- `date-fns` ^4.x - Date manipulation

**Mobile Dependencies (existing):**
- `zustand` ^5.x - State management
- `axios` ^1.x - HTTP client
- `expo-router` ^6.x - Navigation
- `victory-native` ^41.x - Charts (for breakdown visualization)

**No new dependencies required.**

## Acceptance Criteria (Authoritative)

| AC# | Description | Story |
|-----|-------------|-------|
| AC-4.1.1 | Today's total earnings displayed prominently, updates on sync | 4-1 |
| AC-4.2.1 | Period selector allows day/week/month/year switching | 4-2 |
| AC-4.2.2 | Data updates when period changes | 4-2 |
| AC-4.3.1 | Platform breakdown shows DoorDash vs Uber Eats visually | 4-3 |
| AC-4.3.2 | Percentages calculated correctly | 4-3 |
| AC-4.4.1 | Delivery list shows date, time, earnings, tip, platform, restaurant | 4-4 |
| AC-4.4.2 | Infinite scroll loads more deliveries | 4-4 |
| AC-4.4.3 | Platform filter works correctly | 4-4 |
| AC-4.5.1 | Period comparison shows this vs last (week/month/year) | 4-5 |
| AC-4.5.2 | Change shown as absolute and percentage | 4-5 |
| AC-4.6.1 | Hourly rate calculated from earnings / active hours | 4-6 |
| AC-4.6.2 | Rate displayed on dashboard | 4-6 |

## Traceability Mapping

| AC# | Spec Section | Component(s) | Test Idea |
|-----|--------------|--------------|-----------|
| AC-4.1.1 | APIs/Summary | Dashboard.tsx, earningsStore | Mock API returns $150.00, verify displayed |
| AC-4.2.1 | Workflows/Period Switch | PeriodSelector, earningsStore | Tap each period, verify state change |
| AC-4.2.2 | Workflows/Period Switch | earningsStore.fetchSummary | Verify API called on period change |
| AC-4.3.1 | Data Models/PlatformBreakdown | PlatformBreakdownCard | Render with 60/40 split, check chart |
| AC-4.3.2 | APIs/Summary | earnings.service | Calculate percentages for 2 platforms |
| AC-4.4.1 | Data Models/Delivery | DeliveryListItem | Render delivery, verify all fields shown |
| AC-4.4.2 | Workflows/Delivery List | DeliveriesScreen | Scroll, verify more items loaded |
| AC-4.4.3 | APIs/Deliveries | DeliveriesScreen filter | Filter DOORDASH, verify list filtered |
| AC-4.5.1 | APIs/Compare | PeriodComparisonCard | Compare this vs last week |
| AC-4.5.2 | Data Models/PeriodComparison | PeriodComparisonCard | Show +$55.50 (+11.4%) |
| AC-4.6.1 | APIs/HourlyRate | earnings.service | 542.75 / 24.5 = 22.15 |
| AC-4.6.2 | Data Models/HourlyRateData | Dashboard hourly rate | Display $22.15/hr |

## Risks, Assumptions, Open Questions

**Risks:**
- RISK: Hours tracking not implemented - depends on mileage/trip data from Epic 6. MITIGATION: For Story 4-6, estimate hours from delivery timestamps (end - start time between deliveries).
- RISK: No data for new users. MITIGATION: Show empty states with "Import earnings to get started" CTA.

**Assumptions:**
- ASSUMPTION: Users have imported at least one CSV to see meaningful data
- ASSUMPTION: Timezone handling from Epic 3 works correctly
- ASSUMPTION: victory-native charts perform well on older devices

**Open Questions:**
- Q: Should "Today" period be the default, or "This Week"? A: Default to "Week" per existing earningsStore.
- Q: How to handle deliveries spanning midnight? A: Use deliveredAt timestamp in user's timezone.

## Test Strategy Summary

**Unit Tests:**
- earningsStore actions (setPeriod, fetchSummary, fetchDeliveries)
- earnings.service.ts API call mocking
- Date/period calculation utilities

**Integration Tests:**
- Backend: earnings.controller summary with breakdown
- Backend: earnings.controller compare endpoint
- Backend: earnings.controller hourly-rate endpoint

**E2E/Manual Tests:**
- Period switching on dashboard
- Infinite scroll in deliveries list
- Platform filter functionality
- Comparison card accuracy
- Hourly rate display

**Test Coverage Target:** 80%+ for new service methods, 60%+ for UI components
