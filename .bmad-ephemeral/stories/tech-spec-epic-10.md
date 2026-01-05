# Epic Technical Specification: Tip Tracker

Date: 2026-01-05
Author: George
Epic ID: 10
Status: Draft

---

## Overview

Epic 10 implements a personal tip tracking system that allows food delivery drivers to bookmark locations where they received good tips. This feature builds a valuable personal database over time that enhances the Focus Zones intelligence with user-specific data. The Tip Tracker creates sticky engagement since this data cannot be obtained from platform CSV exports (which don't include customer addresses).

The feature consists of a one-tap tip logging UI, backend storage with geospatial queries, a map layer visualization, and filtering controls. It builds upon the existing Focus Zones map infrastructure from Epic 5.

## Objectives and Scope

**In Scope:**
- Floating action button (FAB) for quick tip logging on map screen
- T-shirt size rating system (None/S/M/L/XL/XXL) for relative tip quality
- Backend storage with geospatial indexing (PostGIS/H3)
- Map layer showing tip locations with color-coded markers
- Marker clustering for zoomed-out views
- Filter controls to show tips by minimum size
- Reverse geocoding on marker tap
- Persistent filter preferences

**Out of Scope:**
- Tip amount entry (only relative size ratings)
- Automatic tip detection from earnings data
- Sharing tip data with other users
- Integration with Focus Zones algorithm scoring (future consideration)
- Export of tip location data
- Notification alerts for high-tip areas

## System Architecture Alignment

This epic extends the existing Focus Zones map infrastructure:

**Components Referenced:**
- `apps/mobile/app/(tabs)/map.tsx` - Focus Zones map screen (add FAB + layer toggle)
- `apps/mobile/src/components/zones/ZoneMap.tsx` - Map component (add tip markers layer)
- `apps/api/src/routes/` - Add tips routes
- `apps/api/prisma/schema.prisma` - Add TipLog model
- PostGIS + H3 - Geospatial queries for viewport-bounded tip retrieval

**Constraints:**
- Must use existing Mapbox GL integration
- Follow established API response format patterns
- Use Zustand for client-side tip state management
- Maintain <5% battery impact (no background tip detection)

---

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs |
|----------------|----------------|--------|---------|
| `tips.service.ts` (API) | CRUD operations for tip logs, geospatial queries | userId, lat/lng, tipSize, viewport bounds | TipLog records |
| `tips.routes.ts` (API) | REST endpoints for tip operations | HTTP requests | JSON responses |
| `tips.ts` (Mobile) | API service for tip operations | Tip data, filters | API responses |
| `tipsStore.ts` (Mobile) | Client-side tip state | Actions | Reactive state |
| `TipLogFAB.tsx` (Mobile) | Floating action button component | onLog callback | Size picker UI |
| `TipMarkersLayer.tsx` (Mobile) | Mapbox layer for tip markers | Tips array, filters | Map markers |
| `TipFilterControls.tsx` (Mobile) | Filter UI component | Current filter | Filter selection |

### Data Models and Contracts

**New Prisma Model: TipLog**

```prisma
model TipLog {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  lat         Float
  lng         Float
  h3Index     String    // H3 resolution 9 for clustering

  tipSize     TipSize
  address     String?   // Reverse geocoded, cached

  createdAt   DateTime  @default(now())

  @@index([userId])
  @@index([userId, tipSize])
  @@index([h3Index])
}

enum TipSize {
  NONE
  S
  M
  L
  XL
  XXL
}
```

**User model extension:**

```prisma
model User {
  // ... existing fields
  tipLogs    TipLog[]
}

model UserPreferences {
  // ... existing fields
  tipFilterMinSize   TipSize?  @default(NONE)  // Minimum size to display
  tipsLayerEnabled   Boolean   @default(true)
}
```

**TypeScript Types:**

```typescript
// types/tips.ts
interface TipLog {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  h3Index: string;
  tipSize: TipSize;
  address: string | null;
  createdAt: string;
}

type TipSize = 'NONE' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

interface CreateTipInput {
  lat: number;
  lng: number;
  tipSize: TipSize;
}

interface TipFilters {
  minSize?: TipSize;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  startDate?: string;
  endDate?: string;
}

interface TipStats {
  total: number;
  bySizeCount: Record<TipSize, number>;
}
```

### APIs and Interfaces

**Tip Log Endpoints:**

```
POST   /api/v1/tips                    # Log a new tip
GET    /api/v1/tips                    # Get tips (with filters)
         ?minSize=L                    # Filter by minimum size
         &north=40.8&south=40.6       # Viewport bounds
         &east=-73.9&west=-74.1
         &startDate=2026-01-01
         &endDate=2026-01-31
GET    /api/v1/tips/:id                # Get single tip details
DELETE /api/v1/tips/:id                # Delete a tip
GET    /api/v1/tips/stats              # Get tip statistics
POST   /api/v1/tips/:id/geocode        # Reverse geocode tip location
```

**Request/Response Formats:**

```typescript
// POST /api/v1/tips
// Request
{
  "lat": 40.7128,
  "lng": -74.0060,
  "tipSize": "XL"
}

// Response (201 Created)
{
  "success": true,
  "data": {
    "id": "tip_cuid123",
    "lat": 40.7128,
    "lng": -74.0060,
    "h3Index": "892a100d2c3ffff",
    "tipSize": "XL",
    "address": null,
    "createdAt": "2026-01-05T12:00:00Z"
  }
}

// GET /api/v1/tips?minSize=L&north=40.8&south=40.6&east=-73.9&west=-74.1
// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": "tip_cuid123",
      "lat": 40.7128,
      "lng": -74.0060,
      "tipSize": "XL",
      "address": "123 Main St, New York, NY",
      "createdAt": "2026-01-05T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 47,
    "hasMore": false
  }
}

// GET /api/v1/tips/stats
// Response (200 OK)
{
  "success": true,
  "data": {
    "total": 156,
    "bySizeCount": {
      "NONE": 12,
      "S": 23,
      "M": 45,
      "L": 34,
      "XL": 28,
      "XXL": 14
    }
  }
}

// POST /api/v1/tips/:id/geocode
// Response (200 OK)
{
  "success": true,
  "data": {
    "address": "123 Main St, New York, NY 10001"
  }
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid tip data (missing lat/lng, invalid tipSize) |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `NOT_FOUND` | 404 | Tip not found |
| `FORBIDDEN` | 403 | Tip belongs to another user |

### Workflows and Sequencing

**Tip Logging Flow:**

```
1. User taps FAB on map screen
2. Quick picker appears with size options (None/S/M/L/XL/XXL)
3. User selects size
4. Mobile captures current GPS coordinates
5. POST /api/v1/tips with lat, lng, tipSize
6. Backend:
   a. Validates input
   b. Calculates H3 index (resolution 9)
   c. Creates TipLog record
   d. Returns created tip
7. Mobile:
   a. Adds tip to local store
   b. Shows "Tip logged!" toast
   c. Haptic feedback
   d. Updates map markers if layer visible
```

**Map Layer Display Flow:**

```
1. User toggles "My Tips" layer ON
2. Mobile gets current viewport bounds
3. GET /api/v1/tips with bounds + filter params
4. Backend:
   a. Queries tips within viewport
   b. Applies minSize filter if set
   c. Returns tips array
5. Mobile renders markers:
   a. Color-code by tip size
   b. Cluster nearby markers when zoomed out
   c. Show count badge on clusters
```

**Marker Tap Flow:**

```
1. User taps tip marker on map
2. Mobile shows tip detail card:
   - Size badge (color-coded)
   - Date logged
   - Address (if cached)
3. If address is null:
   a. POST /api/v1/tips/:id/geocode
   b. Backend reverse geocodes via Mapbox
   c. Caches address in database
   d. Returns address
   e. Mobile updates display
```

---

## Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Tip log save | < 500ms | Single DB insert + H3 calculation |
| Tips list query (viewport) | < 300ms | Indexed geospatial query |
| Marker rendering (100 tips) | < 100ms | Mapbox native layer |
| Cluster calculation | < 50ms | H3-based clustering |
| Reverse geocode | < 1s | External API call, cached |

**Optimizations:**
- H3 indexing at resolution 9 for efficient clustering
- Viewport-bounded queries to limit data transfer
- Client-side clustering using H3 for immediate display
- Lazy reverse geocoding (on tap, not on render)
- Cache geocoded addresses in database

### Security

- All tip endpoints require JWT authentication via `requireAuth` middleware
- Users can only access/modify their own tips (enforced by `userId` from JWT)
- Tip locations are private per-user data (no sharing)
- Rate limiting: 100 requests/15min on tip endpoints
- Input validation via Zod schemas

### Reliability/Availability

- Tips are stored server-side, synced from mobile
- Offline support: Queue tip logs locally, sync when online
- If geocoding fails, tip is still saved (address = null)
- Graceful degradation if Mapbox geocoding API unavailable

### Observability

| Signal | Type | Purpose |
|--------|------|---------|
| `tips.created` | Counter | Track tip logging volume |
| `tips.query.duration` | Histogram | Monitor query performance |
| `tips.geocode.success` | Counter | Track geocoding success rate |
| `tips.geocode.failure` | Counter | Track geocoding failures |
| Error logs | Log | Capture failures with context |

---

## Dependencies and Integrations

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| h3-js | 4.x | H3 hexagonal indexing |
| @mapbox/mapbox-sdk | 0.16.x | Reverse geocoding API |
| @rnmapbox/maps | 10.x | Map markers and layers |

### Internal Dependencies

| Dependency | Purpose |
|------------|---------|
| Focus Zones Map (Epic 5) | Base map component to extend |
| Auth middleware | JWT validation |
| Prisma client | Database operations |
| PostGIS | Spatial queries (viewport bounds) |
| Zustand | Client state management |

### Integration Points

- **Mapbox Geocoding API**: Reverse geocode tip locations on demand
- **Existing Map Component**: Add FAB overlay and markers layer
- **User Preferences**: Store tip filter settings

---

## Acceptance Criteria (Authoritative)

### Story 10.1: Tip Logging Button and UI

| AC ID | Acceptance Criteria | Testable Statement |
|-------|--------------------|--------------------|
| AC 10.1.1 | Given I am on the Map tab, When I tap the "Log Tip" floating action button, Then I see a quick picker with t-shirt sizes: None, S, M, L, XL, XXL |
| AC 10.1.2 | Given I see the size picker, When I select a size, Then my current GPS location is saved with that rating |
| AC 10.1.3 | Given I select a size, When the tip is saved, Then I see brief confirmation ("Tip logged!") |
| AC 10.1.4 | Given I am anywhere in the app, When I want to log a tip, Then I can access the Log Tip button from the map tab quickly |

### Story 10.2: Tip Location Storage Backend

| AC ID | Acceptance Criteria | Testable Statement |
|-------|--------------------|--------------------|
| AC 10.2.1 | Given a driver logs a tip, When the data is saved, Then it stores: userId, lat, lng, tipSize (enum), timestamp |
| AC 10.2.2 | Given a tip is saved, When querying, Then the record is queryable by user and location |
| AC 10.2.3 | Given a driver has many logged tips, When they query their tips, Then results can be filtered by tipSize |
| AC 10.2.4 | Given a driver has many logged tips, When they query their tips, Then results can be filtered by date range |
| AC 10.2.5 | Given a driver has many logged tips, When they query their tips, Then results can be bounded by map viewport |

### Story 10.3: Tip Locations Map Layer

| AC ID | Acceptance Criteria | Testable Statement |
|-------|--------------------|--------------------|
| AC 10.3.1 | Given I have logged tips, When I toggle "My Tips" layer on the map, Then I see markers at my logged tip locations |
| AC 10.3.2 | Given I see tip markers, Then markers are color-coded by tip size (green=L/XL/XXL, yellow=M, gray=S/None) |
| AC 10.3.3 | Given I have many tip markers, When zoomed out, Then nearby markers cluster |
| AC 10.3.4 | Given I tap on a tip marker, When the detail appears, Then I see: tip size, date logged, address (reverse geocoded) |

### Story 10.4: Tip Filter Controls

| AC ID | Acceptance Criteria | Testable Statement |
|-------|--------------------|--------------------|
| AC 10.4.1 | Given I am viewing My Tips layer, When I tap the filter button, Then I can select minimum tip size to display (e.g., "L and above") |
| AC 10.4.2 | Given I select a filter, When viewing the map, Then the map updates to show only matching tips |
| AC 10.4.3 | Given I filter to "XL and above", When viewing the map, Then only XL and XXL tips are shown |
| AC 10.4.4 | Given I set a filter, When I close and reopen the app, Then filter state persists across sessions |

---

## Traceability Mapping

| AC | Spec Section | Component/API | Test Idea |
|----|--------------|---------------|-----------|
| AC 10.1.1 | Workflows/Tip Logging | TipLogFAB.tsx | Tap FAB → size picker visible |
| AC 10.1.2 | APIs/POST /tips | tips.ts, tipsStore.ts | Select size → API called with GPS |
| AC 10.1.3 | Workflows/Tip Logging | TipLogFAB.tsx | Save → toast confirmation |
| AC 10.1.4 | Services/Modules | Map screen | FAB accessible on map tab |
| AC 10.2.1 | Data Models/TipLog | tips.service.ts | POST creates record with all fields |
| AC 10.2.2 | APIs/GET /tips | tips.service.ts | Query by userId returns tips |
| AC 10.2.3 | APIs/GET /tips | tips.service.ts | ?minSize=L filters correctly |
| AC 10.2.4 | APIs/GET /tips | tips.service.ts | ?startDate&endDate filters correctly |
| AC 10.2.5 | APIs/GET /tips | tips.service.ts | ?north&south&east&west bounds query |
| AC 10.3.1 | Workflows/Map Layer | TipMarkersLayer.tsx | Toggle ON → markers appear |
| AC 10.3.2 | Workflows/Map Layer | TipMarkersLayer.tsx | Marker colors match size |
| AC 10.3.3 | Workflows/Map Layer | TipMarkersLayer.tsx | Zoom out → markers cluster |
| AC 10.3.4 | Workflows/Marker Tap | TipMarkersLayer.tsx | Tap marker → detail card |
| AC 10.4.1 | Services/Modules | TipFilterControls.tsx | Filter button → size selector |
| AC 10.4.2 | Workflows/Map Layer | tipsStore.ts | Filter change → markers update |
| AC 10.4.3 | APIs/GET /tips | TipMarkersLayer.tsx | XL+ filter → only XL/XXL shown |
| AC 10.4.4 | Data Models/UserPreferences | settingsStore.ts | Filter persists after restart |

---

## Risks, Assumptions, Open Questions

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **High volume of tips** - Users with many tips may slow queries | Medium | Use H3 indexing, viewport bounds, pagination |
| **GPS accuracy** - Indoor/urban canyons may have poor GPS | Low | Accept ~100m accuracy typical for delivery locations |
| **Geocoding rate limits** - Mapbox has rate limits | Low | Cache addresses, lazy geocode on tap only |
| **Storage costs** - Tips accumulate over time | Low | Tip records are small (~200 bytes each) |

### Assumptions

| Assumption | Rationale |
|------------|-----------|
| Users want relative size ratings, not dollar amounts | Simpler UX, faster logging, no math required |
| T-shirt sizes are universally understood | Common UX pattern for relative sizing |
| H3 resolution 9 is appropriate for clustering | ~174m edge length, good for delivery-level granularity |
| Users will log 1-10 tips per day on average | Based on typical delivery volume |

### Open Questions

| Question | Decision Owner | Status |
|----------|---------------|--------|
| Should tip size options include "None"? | Product | **Decided: Yes** - useful for marking bad tip locations |
| Should we integrate tips into Focus Zones scoring? | Product | **Deferred** - future consideration |
| Maximum tips per user? | Tech | **Decided: No limit** - storage is cheap |

---

## Test Strategy Summary

### Unit Tests

| Area | Framework | Coverage |
|------|-----------|----------|
| tips.service.ts | Vitest | Create, query, filter, delete operations |
| tips.ts (mobile service) | Vitest | API calls, error handling |
| tipsStore.ts | Vitest | State mutations, filter logic |
| H3 index calculation | Vitest | Correct resolution, boundary cases |

### Integration Tests

| Area | Framework | Coverage |
|------|-----------|----------|
| POST /api/v1/tips | Vitest + Supertest | Create tip, validation errors |
| GET /api/v1/tips | Vitest + Supertest | Query with filters, viewport bounds |
| Geocoding integration | Vitest | Mock Mapbox API responses |

### Manual/E2E Testing

| Scenario | Priority |
|----------|----------|
| Log tip via FAB on iOS | High |
| Log tip via FAB on Android | High |
| View tips on map with layer toggle | High |
| Filter tips by size | Medium |
| Tap marker → see geocoded address | Medium |
| Marker clustering at zoom levels | Medium |
| Offline tip logging + sync | Low |

### Edge Cases

- Log tip at exact same location twice → Both should save (different timestamps)
- Log tip with no GPS signal → Show error, don't save
- Query tips with 0 results → Empty array, no error
- Delete tip that doesn't exist → 404 Not Found
- Geocode already-geocoded tip → Return cached address
