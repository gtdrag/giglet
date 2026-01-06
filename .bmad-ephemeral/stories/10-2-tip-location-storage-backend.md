# Story 10.2: Tip Location Storage Backend

Status: done

## Story

**As a** system,
**I want** to provide query endpoints for tip location data,
**So that** drivers can retrieve and filter their personal tip database.

## Acceptance Criteria

1. **Given** a driver has logged tips, **When** they request their tips via GET /api/v1/tips, **Then** they receive their tip records with: id, lat, lng, tipSize, createdAt.

2. **Given** a driver queries their tips, **When** they include a tipSize filter (e.g., `?tipSize=LARGE`), **Then** only tips matching that size or larger are returned.

3. **Given** a driver queries their tips, **When** they include date range filters (`?startDate=...&endDate=...`), **Then** only tips within that range are returned.

4. **Given** a driver queries tips for a map viewport, **When** they include bounds (`?minLat=...&maxLat=...&minLng=...&maxLng=...`), **Then** only tips within those coordinates are returned.

5. **Given** a driver has many tips, **When** they query without filters, **Then** results are paginated (limit/offset) with total count.

## Prerequisites

- Story 10.1 (Tip Logging Button and UI) - Complete (TipLog model, POST endpoint exist)
- Story 1.2 (Database Schema) - Complete

## Tasks / Subtasks

- [x] Task 1: Create GET /api/v1/tips Endpoint (AC: 1, 5)
  - [x] Add GET handler to tips.routes.ts
  - [x] Query TipLog by userId from auth context
  - [x] Implement pagination (limit/offset with defaults)
  - [x] Return total count in response for pagination UI

- [x] Task 2: Add TipSize Filter (AC: 2)
  - [x] Accept optional `tipSize` query param
  - [x] Filter tips where tipSize >= specified size (hierarchical: NONE < SMALL < MEDIUM < LARGE < XLARGE < XXLARGE)
  - [x] Validate tipSize enum value

- [x] Task 3: Add Date Range Filter (AC: 3)
  - [x] Accept optional `startDate` and `endDate` query params
  - [x] Filter createdAt between dates (inclusive)
  - [x] Validate date format (ISO 8601)

- [x] Task 4: Add Viewport Bounds Filter (AC: 4)
  - [x] Accept optional `minLat`, `maxLat`, `minLng`, `maxLng` query params
  - [x] Filter tips within coordinate bounds
  - [x] Validate coordinate ranges (-90 to 90 for lat, -180 to 180 for lng)

- [x] Task 5: Create Mobile Tips Query Service (AC: 1-5)
  - [x] Add getTips() function to src/services/tips.ts
  - [x] Accept filter options object
  - [x] Return typed response with tips array and pagination info

- [x] Task 6: Add Unit Tests (AC: 1-5)
  - [x] Backend: Test GET /tips returns user's tips only
  - [x] Backend: Test tipSize filter returns correct hierarchy
  - [x] Backend: Test date range filter
  - [x] Backend: Test viewport bounds filter
  - [x] Backend: Test pagination
  - [x] Mobile: Test getTips service function

## Dev Notes

### Technical Approach

This story extends the tips API created in Story 10-1 to support querying. The TipLog model and indexes already exist.

### TipSize Hierarchy for Filtering

When filtering by tipSize, return tips at that level OR ABOVE:
- `tipSize=NONE` → Returns all tips
- `tipSize=SMALL` → Returns SMALL, MEDIUM, LARGE, XLARGE, XXLARGE
- `tipSize=MEDIUM` → Returns MEDIUM, LARGE, XLARGE, XXLARGE
- `tipSize=LARGE` → Returns LARGE, XLARGE, XXLARGE
- `tipSize=XLARGE` → Returns XLARGE, XXLARGE
- `tipSize=XXLARGE` → Returns only XXLARGE

### API Contract

**GET /api/v1/tips**
- Auth: Required (Bearer token)
- Query Params:
  - `tipSize` (optional): Minimum tip size filter (enum value)
  - `startDate` (optional): ISO 8601 date string
  - `endDate` (optional): ISO 8601 date string
  - `minLat`, `maxLat`, `minLng`, `maxLng` (optional): Viewport bounds
  - `limit` (optional): Results per page (default 50, max 100)
  - `offset` (optional): Pagination offset (default 0)
- Response:
```json
{
  "success": true,
  "data": {
    "tips": [
      { "id": "...", "lat": 34.0522, "lng": -118.2437, "tipSize": "LARGE", "createdAt": "..." }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Existing Infrastructure to Leverage

**From Story 10-1:**
- `apps/api/src/routes/tips.routes.ts` - Add GET route
- `apps/api/src/services/tips.service.ts` - Add query method
- `apps/api/src/schemas/tips.schema.ts` - Add query schema
- `apps/mobile/src/services/tips.ts` - Add getTips function
- TipLog model with indexes on userId and lat/lng

### Learnings from Previous Story

**From Story 10-1-tip-logging-button-and-ui (Status: done)**

- **Database Model**: TipLog already exists with spatial indexes on lat/lng
- **Route Pattern**: tips.routes.ts created - add GET handler alongside existing POST
- **Service Pattern**: tips.service.ts has createTipLog - add queryTips method
- **Testing Pattern**: Use `vi.hoisted()` for proper mock setup in Vitest
- **Schema Pattern**: tips.schema.ts has CreateTipLogSchema - add GetTipsQuerySchema

**Files to REUSE (not recreate):**
- `apps/api/src/routes/tips.routes.ts` - Extend with GET route
- `apps/api/src/services/tips.service.ts` - Add queryTips method
- `apps/api/src/schemas/tips.schema.ts` - Add query validation schema
- `apps/mobile/src/services/tips.ts` - Add getTips function

[Source: .bmad-ephemeral/stories/10-1-tip-logging-button-and-ui.md#Dev-Agent-Record]

### References

- [Source: docs/epics.md#Story-10.2] - Original story definition
- [Source: .bmad-ephemeral/stories/10-1-tip-logging-button-and-ui.md] - Previous story with existing infrastructure

---

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/10-2-tip-location-storage-backend.context.xml` (generated 2026-01-06)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - implementation completed without issues.

### Completion Notes List

1. **Schema Updates**: Added GetTipsQuerySchema with comprehensive validation for all filter parameters (tipSize, date range, viewport bounds, pagination). Includes refinements for viewport completeness and date order validation.

2. **TipSize Hierarchy**: Implemented hierarchical filtering using getTipSizesAbove() helper function. When filtering by a tip size, returns that size AND ALL LARGER sizes.

3. **Service Method**: Added queryTips() to tips.service.ts with Prisma query building for all filter combinations. Uses Promise.all for parallel count and findMany queries.

4. **Controller Handler**: Added getTips() handler following existing pattern with auth check and typed query params.

5. **Mobile Service**: Extended tips.ts with getTips() and getTipsInViewport() functions using URLSearchParams for query string building.

6. **Testing**: Added 20 new tests covering all acceptance criteria:
   - API: 11 tests for queryTips (pagination, tipSize hierarchy, date range, viewport bounds)
   - Mobile: 9 tests for getTips and getTipsInViewport

### File List

**Backend (apps/api):**
- `src/schemas/tips.schema.ts` - Added GetTipsQuerySchema, TIP_SIZE_ORDER, getTipSizesAbove()
- `src/services/tips.service.ts` - Added queryTips() method with all filters
- `src/controllers/tips.controller.ts` - Added getTips() handler
- `src/routes/tips.routes.ts` - Added GET / route
- `src/services/__tests__/tips.service.test.ts` - Added queryTips tests (11 new tests)

**Mobile (apps/mobile):**
- `src/services/tips.ts` - Added getTips(), getTipsInViewport(), GetTipsFilters, Pagination interfaces
- `src/services/__tests__/tips.test.ts` - Added getTips tests (9 new tests)

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-06 | 1.0 | Story drafted from epics.md |
| 2026-01-06 | 2.0 | Story completed - GET endpoint with all filters implemented |
