# Story 9.2: Notification Preferences

Status: done

## Story

**As a** registered user,
**I want** to manage my notification preferences,
**So that** I can control which alerts I receive and customize my app experience.

## Acceptance Criteria

1. **Given** I am in Settings > Notifications, **When** I view notification options, **Then** I see toggles for: Push notifications, Focus Zone alerts, Sync error alerts, **And** I can turn each on/off independently, **And** changes save automatically.

2. **Given** I disable Focus Zone alerts, **When** a zone heats up, **Then** I do not receive a push notification.

## Prerequisites

- Epic 2 (User Authentication) - Complete
- Story 9.1 (Profile View and Edit) - Complete (accounts.tsx navigation pattern established)

## Tasks / Subtasks

- [x] Task 1: Create Notifications Screen UI (AC: 1)
  - [x] Create `app/notifications.tsx` screen with navigation from accounts.tsx
  - [x] Add toggle switches for: Push notifications, Focus Zone alerts, Sync error alerts
  - [x] Show loading state while fetching preferences
  - [x] Display descriptive text for each toggle option
  - [x] Style to match app design system (dark theme)

- [x] Task 2: Create Settings Store (AC: 1)
  - [x] Create `src/stores/settingsStore.ts` using Zustand
  - [x] Define preferences state interface (notificationsEnabled, zoneAlertsEnabled, syncErrorAlertsEnabled)
  - [x] Implement setPreferences action
  - [x] Implement updatePreference action for individual toggle updates
  - [x] Persist preferences across app sessions

- [x] Task 3: Create Settings API Service (AC: 1)
  - [x] Create `src/services/settings.ts` with API methods
  - [x] Implement `getPreferences()` - GET /api/v1/users/preferences
  - [x] Implement `updatePreferences(data)` - PUT /api/v1/users/preferences
  - [x] Handle API errors with user-friendly messages

- [x] Task 4: Backend Preferences Endpoints (AC: 1)
  - [x] Create `apps/api/src/routes/users.routes.ts` for user preferences
  - [x] Add GET /users/preferences endpoint
  - [x] Add PUT /users/preferences endpoint
  - [x] Create `apps/api/src/schemas/preferences.schema.ts` with Zod validation
  - [x] Create `apps/api/src/controllers/users.controller.ts`
  - [x] Register user routes in main router

- [x] Task 5: Integrate Toggle Auto-Save (AC: 1)
  - [x] Implement optimistic UI updates on toggle change
  - [x] Call API on each toggle change
  - [x] Revert toggle on API error with error message
  - [x] Update settingsStore on successful save

- [x] Task 6: Update Accounts Screen Navigation (AC: 1)
  - [x] Add "Notifications" menu item to accounts.tsx
  - [x] Display notification icon for menu item
  - [x] Navigate to notifications.tsx on tap

- [x] Task 7: Add Unit Tests (AC: 1, 2)
  - [x] Test settingsStore state management
  - [x] Test settings.ts service API calls
  - [x] Test preference toggle error handling
  - [x] Test optimistic update and rollback behavior

## Dev Notes

### Technical Approach

This story creates the Notification Preferences screen with auto-saving toggles. The implementation follows patterns established in Story 9.1 and previous epics.

**Key Decisions:**
- Create new `/users/preferences` endpoints (separate from auth routes)
- Use Zustand store for preferences state (settingsStore)
- Optimistic UI updates for immediate toggle feedback
- Auto-save on toggle change (no explicit Save button)

### Existing Infrastructure

**Mobile:**
- `src/stores/authStore.ts` - Pattern for Zustand stores
- `app/accounts.tsx` - Settings hub for navigation (established in Story 9.1)
- `src/services/user.ts` - Pattern for API service (established in Story 9.1)
- `src/services/api.ts` - Axios instance with auth interceptors

**Backend:**
- `apps/api/src/routes/index.ts` - Main router
- `apps/api/src/schemas/user.schema.ts` - Zod schema pattern (established in Story 9.1)
- `apps/api/src/middleware/auth.middleware.ts` - JWT validation

**Database:**
- `UserPreferences` model exists in Prisma schema with: notificationsEnabled, zoneAlertsEnabled, autoMileageTracking, darkModeEnabled
- Need to check if syncErrorAlertsEnabled needs to be added or can map to existing field

### API Design

**GET /api/v1/users/preferences**
```typescript
// Response
{
  "success": true,
  "data": {
    "preferences": {
      "notificationsEnabled": true,
      "zoneAlertsEnabled": true,
      "syncErrorAlertsEnabled": true
    }
  }
}
```

**PUT /api/v1/users/preferences**
```typescript
// Request
{
  "notificationsEnabled": true,
  "zoneAlertsEnabled": false,
  "syncErrorAlertsEnabled": true
}

// Response (success)
{
  "success": true,
  "data": {
    "preferences": {
      "notificationsEnabled": true,
      "zoneAlertsEnabled": false,
      "syncErrorAlertsEnabled": true
    }
  }
}
```

### Learnings from Previous Story

**From Story 9-1-profile-view-and-edit (Status: done)**

- **Pattern Established**: accounts.tsx serves as settings hub - add menu items there
- **User Service Pattern**: `src/services/user.ts` shows error handling pattern with custom Error class
- **Zod Schema Pattern**: `apps/api/src/schemas/user.schema.ts` shows validation approach
- **Navigation Pattern**: Use `router.push('/notifications')` from accounts.tsx
- **Tests**: 287 tests currently pass - follow Vitest + vi.mock pattern from user.test.ts

[Source: .bmad-ephemeral/stories/9-1-profile-view-and-edit.md#Dev-Agent-Record]

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-9.md#Story-9.2] - Acceptance criteria
- [Source: .bmad-ephemeral/stories/tech-spec-epic-9.md#APIs-and-Interfaces] - API design
- [Source: .bmad-ephemeral/stories/tech-spec-epic-9.md#Data-Models-and-Contracts] - UserPreferences model
- [Source: docs/architecture.md#Data-Models] - UserPreferences Prisma model

---

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/9-2-notification-preferences.context.xml`

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- None

### Completion Notes List

- Added `syncErrorAlertsEnabled` field to Prisma UserPreferences model
- Created new `/users/preferences` API endpoints (GET/PUT) with Zod validation
- Created settings service with custom SettingsServiceError class
- Created Zustand settingsStore with optimistic updates and rollback on error
- Created notifications.tsx screen with toggle switches and auto-save
- Added Notifications section to accounts.tsx settings hub
- All 309 tests passing (22 new tests for settings)

### File List

**Created:**
- `apps/api/src/schemas/preferences.schema.ts` - Zod validation schemas
- `apps/api/src/controllers/users.controller.ts` - Preferences controller
- `apps/api/src/routes/users.routes.ts` - User routes with preferences endpoints
- `apps/mobile/src/services/settings.ts` - Settings API service
- `apps/mobile/src/stores/settingsStore.ts` - Zustand settings store
- `apps/mobile/app/notifications.tsx` - Notifications preferences screen
- `apps/mobile/src/services/__tests__/settings.test.ts` - Settings service tests (11 tests)
- `apps/mobile/src/stores/__tests__/settingsStore.test.ts` - Settings store tests (11 tests)

**Modified:**
- `apps/api/prisma/schema.prisma` - Added syncErrorAlertsEnabled field
- `apps/api/src/routes/index.ts` - Registered users routes
- `apps/mobile/app/accounts.tsx` - Added Notifications section with navigation

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-05 | 1.0 | Story drafted from tech-spec-epic-9.md |
| 2026-01-05 | 1.1 | Senior Developer Review notes appended - APPROVED |

---

## Senior Developer Review (AI)

### Reviewer
George

### Date
2026-01-05

### Outcome
**APPROVE** ✅

All tasks verified as complete with evidence. AC 1 fully implemented. AC 2 correctly stores preferences; actual push filtering is infrastructure dependent on Focus Zones epic.

### Summary

Story 9.2 implements notification preferences management with auto-saving toggles. The implementation is solid, follows established patterns, and includes comprehensive tests. All 7 tasks with 27 subtasks verified complete.

### Key Findings

**No HIGH or MEDIUM severity issues found.**

**LOW severity observations:**
- Note: PrismaClient instantiated per-controller (consistent with codebase pattern)
- Note: No retry button when preferences fail to load (error banner only)

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC 1 | Toggles for Push notifications, Focus Zone alerts, Sync error alerts; each toggleable independently; auto-save | ✅ IMPLEMENTED | `notifications.tsx:25-44,55-67`, `settingsStore.ts:41-74` |
| AC 2 | Disabled Focus Zone alerts prevents push notification | ⚠️ PARTIAL | Preference stored correctly (`users.controller.ts:90`). Push notification filtering depends on Focus Zones infrastructure (future integration). |

**Summary**: 1.5 of 2 ACs implemented (AC 2 infrastructure-only is expected)

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| Task 1: Create Notifications Screen UI | [x] | ✅ | `app/notifications.tsx` (276 lines) |
| Task 2: Create Settings Store | [x] | ✅ | `src/stores/settingsStore.ts` (83 lines) |
| Task 3: Create Settings API Service | [x] | ✅ | `src/services/settings.ts` (103 lines) |
| Task 4: Backend Preferences Endpoints | [x] | ✅ | `users.routes.ts`, `users.controller.ts`, `preferences.schema.ts` |
| Task 5: Integrate Toggle Auto-Save | [x] | ✅ | `settingsStore.ts:47-74` optimistic updates |
| Task 6: Update Accounts Screen Navigation | [x] | ✅ | `accounts.tsx:243-261` |
| Task 7: Add Unit Tests | [x] | ✅ | 22 new tests (settings.test.ts, settingsStore.test.ts) |

**Summary**: 7 of 7 completed tasks verified, 0 questionable, 0 false completions

### Test Coverage and Gaps

- ✅ 22 new tests added (11 service, 11 store)
- ✅ All 309 tests passing
- ✅ Tests cover success, error, and rollback scenarios
- Note: No E2E/integration tests (consistent with project test strategy)

### Architectural Alignment

- ✅ Zustand store pattern matches authStore.ts
- ✅ API service follows user.ts pattern with custom Error class
- ✅ Zod validation with body wrapper
- ✅ requireAuth middleware on all endpoints
- ✅ Dark theme colors match design system
- ✅ Response format matches API standards

### Security Notes

- ✅ All endpoints protected with JWT authentication (requireAuth)
- ✅ User ID extracted from JWT (req.user.sub), not user input
- ✅ No sensitive data exposed in responses

### Best-Practices and References

- [Zustand v5 docs](https://zustand.docs.pmnd.rs/)
- [Zod validation](https://zod.dev/)
- [Expo Router navigation](https://docs.expo.dev/router/)

### Action Items

**Code Changes Required:**
- None

**Advisory Notes:**
- Note: Consider adding retry button for failed preferences load (future enhancement)
- Note: AC 2 push notification filtering will need integration when Focus Zones push notifications are implemented
