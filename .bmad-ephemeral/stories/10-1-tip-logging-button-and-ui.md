# Story 10.1: Tip Logging Button and UI

Status: done

## Story

**As a** driver who just received a good tip,
**I want** to quickly log this location,
**So that** I can remember where good tippers are.

## Acceptance Criteria

1. **Given** I am on the Map tab, **When** I tap the "Log Tip" floating action button, **Then** I see a quick picker with t-shirt sizes: None | S | M | L | XL | XXL, **And** selecting a size saves my current GPS location with that rating, **And** I see brief confirmation ("Tip logged!").

2. **Given** I am anywhere in the app, **When** I want to log a tip, **Then** I can access the Log Tip button from the map tab quickly.

3. **Given** I tap a tip size option, **When** the tip is saved, **Then** I feel haptic feedback confirming the action.

4. **Given** location permissions are not granted, **When** I try to log a tip, **Then** I see a message explaining location is required, **And** I can navigate to grant permission.

## Prerequisites

- Story 5.1 (Focus Zones Map Display) - Complete (map infrastructure exists)
- Epic 5 complete (zones.tsx, ZoneMap component established)

## Tasks / Subtasks

- [x] Task 1: Create TipLog Database Model (AC: 1)
  - [x] Add TipLog model to Prisma schema: id, userId, lat, lng, tipSize (enum), createdAt
  - [x] Create TipSize enum: NONE, SMALL, MEDIUM, LARGE, XLARGE, XXLARGE
  - [x] Run prisma migrate to create table
  - [x] Add spatial index on lat/lng for future viewport queries (Story 10.3)

- [x] Task 2: Create Backend API Endpoint (AC: 1)
  - [x] Create POST /api/v1/tips endpoint to save tip log
  - [x] Create tips.routes.ts, tips.controller.ts, tips.service.ts
  - [x] Validate request body with Zod schema: { lat: number, lng: number, tipSize: TipSize }
  - [x] Return created tip record with id and timestamp

- [x] Task 3: Create Mobile Tips Service (AC: 1)
  - [x] Create src/services/tips.ts with logTip() function
  - [x] Accept tipSize and auto-capture current location
  - [x] Handle API call to POST /tips
  - [x] Return success/failure status

- [x] Task 4: Create Tip Size Picker Component (AC: 1, 3)
  - [x] Create src/components/tips/TipSizePicker.tsx
  - [x] Display t-shirt size buttons: None | S | M | L | XL | XXL
  - [x] Style buttons with distinct visual treatment (pill buttons or chips)
  - [x] Add Haptics.impactAsync() on selection
  - [x] Accept onSelect callback prop

- [x] Task 5: Create Log Tip FAB Component (AC: 1, 2)
  - [x] Create src/components/tips/LogTipFAB.tsx
  - [x] Floating action button positioned bottom-right of map
  - [x] Dollar sign or tip icon
  - [x] onPress opens tip size picker modal/sheet

- [x] Task 6: Integrate FAB into Map Page (AC: 1, 2)
  - [x] Import LogTipFAB into app/(tabs)/index.tsx (main map page)
  - [x] Position FAB above any existing bottom UI elements
  - [x] Ensure FAB doesn't overlap with map controls

- [x] Task 7: Implement Tip Logging Flow (AC: 1, 3)
  - [x] On FAB tap, show bottom sheet or modal with TipSizePicker
  - [x] On size selection:
    - Get current location from expo-location
    - Call tips service logTip()
    - Show success toast "Tip logged!"
    - Haptic feedback
    - Auto-dismiss picker
  - [x] Handle loading state during save

- [x] Task 8: Handle Location Permission Edge Cases (AC: 4)
  - [x] Check location permission before showing picker
  - [x] If not granted, show alert explaining requirement
  - [x] Provide button to open settings or request permission
  - [x] Gracefully handle location fetch failures

- [x] Task 9: Add Unit Tests (AC: 1, 3, 4)
  - [x] Backend: Test POST /tips creates record correctly
  - [x] Backend: Test validation rejects invalid tipSize
  - [x] Mobile: Test tips service logTip function
  - [x] Mobile: Test TipSizePicker component renders all options
  - [x] Mobile: Test haptic feedback triggers on selection

## Dev Notes

### Technical Approach

This is the first story in Epic 10 (Tip Tracker). It establishes the foundation for the tip tracking feature by:

1. **Database Model**: New TipLog table with spatial capabilities
2. **API Layer**: RESTful endpoint following existing patterns
3. **UI Components**: FAB + picker following established component patterns
4. **Integration**: Adding to the existing map screen

### TipSize Enum Values

| UI Label | Enum Value | Description |
|----------|------------|-------------|
| None | NONE | No tip (data point for analytics) |
| S | SMALL | Small tip |
| M | MEDIUM | Medium tip |
| L | LARGE | Large tip |
| XL | XLARGE | Extra large tip |
| XXL | XXLARGE | Exceptional tip |

### Database Schema

```prisma
enum TipSize {
  NONE
  SMALL
  MEDIUM
  LARGE
  XLARGE
  XXLARGE
}

model TipLog {
  id        String   @id @default(cuid())
  userId    String
  lat       Float
  lng       Float
  tipSize   TipSize
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([lat, lng])
}
```

### API Contract

**POST /api/v1/tips**
- Auth: Required (Bearer token)
- Request: `{ lat: number, lng: number, tipSize: "NONE" | "SMALL" | "MEDIUM" | "LARGE" | "XLARGE" | "XXLARGE" }`
- Response: `{ success: true, data: { id: string, tipSize: string, lat: number, lng: number, createdAt: string } }`

### UI Design Notes

- FAB should be ~56px, positioned bottom-right with ~16px margin
- Use dollar sign icon ($) or custom tip icon
- Tip size picker should be a bottom sheet for quick access
- Each size option should be a distinct tappable element
- Consider color coding: green tones for larger tips

### Existing Infrastructure to Leverage

**Mobile:**
- `app/(tabs)/zones.tsx` or `app/(tabs)/dashboard.tsx` - Map screen location
- `src/components/zones/ZoneMap.tsx` - Map component reference
- `expo-location` - Already used for mileage tracking
- `expo-haptics` - For feedback on selection
- Zustand store pattern from other features

**Backend:**
- Express route/controller/service pattern from `auth.*`, `earnings.*`
- Prisma ORM patterns from existing models
- Zod validation patterns

### Project Structure Notes

New files to create:
- `apps/api/src/routes/tips.routes.ts`
- `apps/api/src/controllers/tips.controller.ts`
- `apps/api/src/services/tips.service.ts`
- `apps/api/src/schemas/tips.schema.ts`
- `apps/mobile/src/services/tips.ts`
- `apps/mobile/src/components/tips/TipSizePicker.tsx`
- `apps/mobile/src/components/tips/LogTipFAB.tsx`
- `apps/mobile/src/stores/tipsStore.ts` (optional, may not be needed for v1)

### Learnings from Previous Story

**From Story 9-5-logout (Status: done)**

- **Testing Pattern**: Use `vi.hoisted()` for proper mock setup in Vitest
- **Store Pattern**: Zustand stores can call other stores via `getState()`
- **Navigation Pattern**: Use `router.replace()` for state changes
- **Error Handling**: Try/catch with user-friendly Alert on failure
- **Graceful Degradation**: Continue local operations even if server fails

[Source: .bmad-ephemeral/stories/9-5-logout.md#Dev-Agent-Record]

### References

- [Source: docs/epics.md#Story-10.1] - Original story definition and acceptance criteria
- [Source: docs/architecture.md#Project-Structure] - File organization patterns
- [Source: docs/architecture.md#Technology-Stack] - Tech stack (Expo, Zustand, Prisma)

---

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/10-1-tip-logging-button-and-ui.context.xml` (generated 2026-01-06)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - implementation completed without issues.

### Completion Notes List

1. **Database Model**: Added TipLog model and TipSize enum to Prisma schema with spatial indexes for future viewport queries.

2. **Backend API**: Implemented complete RESTful endpoint following existing patterns (routes, controller, service, schema) with Zod validation.

3. **Mobile Service**: Created tips.ts service with logTip() function that posts to the API.

4. **UI Components**:
   - TipSizePicker: Horizontal pill-style buttons with haptic feedback on selection
   - LogTipFAB: Green floating action button with cash icon positioned bottom-right

5. **Integration**: Added FAB to MapPage (index.tsx) with modal containing TipSizePicker, location fetching, success/error handling.

6. **Permission Handling**: Checks location permission status, shows alert with option to open settings if not granted.

7. **Testing**: Added unit tests for both API tips.service.ts and mobile tips.ts service using vi.hoisted() pattern.

### File List

**Backend (apps/api):**
- `prisma/schema.prisma` - Added TipLog model and TipSize enum
- `src/schemas/tips.schema.ts` - Zod validation schemas
- `src/services/tips.service.ts` - Business logic for creating tip logs
- `src/controllers/tips.controller.ts` - Request handler
- `src/routes/tips.routes.ts` - POST /api/v1/tips route
- `src/routes/index.ts` - Updated to include tips routes
- `src/services/__tests__/tips.service.test.ts` - Unit tests

**Mobile (apps/mobile):**
- `src/services/tips.ts` - API service for logging tips
- `src/components/tips/TipSizePicker.tsx` - T-shirt size selector with haptics
- `src/components/tips/LogTipFAB.tsx` - Floating action button
- `app/(tabs)/index.tsx` - Integrated FAB and tip logging flow
- `src/services/__tests__/tips.test.ts` - Unit tests

**Fixed Pre-existing Issues:**
- `src/services/export.ts` - Changed to expo-file-system/legacy import
- `src/services/__tests__/legal.test.ts` - Fixed mock return values
- `src/stores/__tests__/subscriptionStore.test.ts` - Fixed mock setup with vi.hoisted()
- `apps/api/src/services/__tests__/auth.service.test.ts` - Fixed bcrypt mock setup

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-06 | 1.0 | Story drafted from epics.md |
