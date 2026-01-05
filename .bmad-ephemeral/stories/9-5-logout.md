# Story 9.5: Logout

Status: done

## Story

**As a** user,
**I want** to log out of my account,
**So that** I can secure my session or switch accounts.

## Acceptance Criteria

1. **Given** I am logged in, **When** I tap "Log Out", **Then** I see confirmation prompt, **And** if confirmed, I am logged out, **And** I am returned to the login screen, **And** my local session data is cleared.

2. **Given** I have mileage tracking enabled, **When** I log out, **Then** background tracking stops.

## Prerequisites

- Epic 2 (User Authentication) - Complete
- Story 9.1, 9.2, 9.3, 9.4 - Complete (accounts.tsx patterns established)

## Tasks / Subtasks

- [x] Task 1: Verify Existing Logout UI (AC: 1)
  - [x] Confirm Sign Out button exists in accounts.tsx
  - [x] Verify confirmation Alert dialog shows "Sign Out" with Cancel/Sign Out options
  - [x] Verify handleSignOut function triggers logout() on confirmation

- [x] Task 2: Enhance Backend Logout (AC: 1)
  - [x] Verify POST /api/v1/auth/logout endpoint exists
  - [x] Update mobile logout flow to call POST /auth/logout with refreshToken before clearing
  - [x] Backend: Ensure refresh token is deleted from database on logout call

- [x] Task 3: Stop Background Location Tracking on Logout (AC: 2)
  - [x] Import mileageStore or location tracking service into authStore
  - [x] Call stopTracking() in logout action before clearing auth state
  - [x] Verify background location updates stop after logout

- [x] Task 4: Clear All Application State (AC: 1)
  - [x] Clear authStore state (already done)
  - [x] Clear subscription store state on logout
  - [x] Clear any cached earnings/dashboard data
  - [x] Ensure user preferences (theme) are NOT cleared (per tech notes)

- [x] Task 5: Verify Navigation Flow (AC: 1)
  - [x] Confirm router.replace('/(auth)/login') navigates correctly
  - [x] Verify auth guard prevents access to tabs after logout
  - [x] Test deep link behavior after logout (should redirect to login)

- [x] Task 6: Add Unit Tests (AC: 1, 2)
  - [x] Test logout clears secure storage tokens
  - [x] Test logout revokes refresh token on server
  - [x] Test logout clears auth state
  - [x] Test logout stops background tracking
  - [x] Test navigation to login after logout

## Dev Notes

### Technical Approach

Story 9.5 completes the Epic 9 Settings & Profile implementation by ensuring the logout flow is fully compliant with the tech spec. Most of the UI and basic logout functionality is already implemented from previous work. This story focuses on:

1. **Server-side token revocation**: Ensure the backend invalidates the refresh token
2. **Background tracking cleanup**: Stop location tracking to prevent unnecessary battery drain
3. **Complete state cleanup**: Clear all user-specific stores while preserving app preferences

### Logout Flow (from Tech Spec)

```
1. User taps "Log Out" in Settings
2. App shows confirmation prompt
3. User confirms
4. App calls POST /auth/logout (revokes refresh token)
5. App clears secure storage (access + refresh tokens)
6. App clears all Zustand stores
7. App stops background location tracking
8. App navigates to login screen
```

### Existing Implementation Analysis

**Already Implemented:**
- `accounts.tsx:356-372` - Sign Out button UI
- `accounts.tsx:141-160` - handleSignOut with Alert confirmation
- `authStore.ts:45-49` - logout() action (clears tokens, RevenueCat, state)
- `auth.ts:158-160` - logout() service (calls clearTokens)
- `auth.routes.ts:49` - POST /auth/logout route exists

**Needs Enhancement:**
- Mobile logout should send refreshToken to server before clearing
- Stop background location tracking
- Clear subscription store and other user-specific stores
- Ensure POST /auth/logout is actually called (current flow may skip it)

### Data That Should Be Cleared

| Store/Storage | Clear on Logout | Notes |
|--------------|-----------------|-------|
| accessToken (SecureStore) | Yes | via clearTokens() |
| refreshToken (SecureStore) | Yes | via clearTokens() |
| authStore | Yes | user, isAuthenticated |
| subscriptionStore | Yes | tier, isProUser cache |
| earningsStore (if exists) | Yes | User earnings data |
| mileageStore (if exists) | Yes | User trip data |
| settingsStore | **No** | User preferences persist |
| Location tracking | Stop | Background GPS |
| RevenueCat | Yes | logoutUser() |

### API Contract

**POST /api/v1/auth/logout**
- Request: `{ refreshToken: string }`
- Response: `{ success: true, message: "Logged out successfully" }`
- Effect: Deletes refresh token from database

### Existing Infrastructure

**Mobile:**
- `app/accounts.tsx` - Sign Out UI (lines 356-372, 141-160)
- `src/stores/authStore.ts` - logout action (lines 45-49)
- `src/services/auth.ts` - logout service (lines 158-160)
- `src/stores/mileageStore.ts` - May have stopTracking method

**Backend:**
- `apps/api/src/routes/auth.routes.ts:49` - POST /logout route
- `apps/api/src/controllers/auth.controller.ts:84-93` - logout controller
- `apps/api/src/services/auth.service.ts:167-174` - logout service (deletes refresh token)

### Learnings from Previous Story

**From Story 9-4-account-deletion (Status: done)**

- **Pattern Established**: deleteAccount in authStore follows same pattern as logout:
  - Call API first (if needed)
  - Clear logoutService() (tokens)
  - Clear logoutUser() (RevenueCat)
  - Reset Zustand state
  - Show Alert if needed
  - Navigate with router.replace('/(auth)/login')
- **Navigation Pattern**: Use `router.replace()` for auth state changes to prevent back navigation
- **Alert Pattern**: Alert.alert() for confirmations with Cancel/Action buttons
- **Error Handling**: Try/catch with user-friendly Alert on failure
- **RevenueCat Integration**: Call logoutUser() from subscriptions service

[Source: .bmad-ephemeral/stories/9-4-account-deletion.md#Dev-Agent-Record]

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-9.md#Story-9.5] - AC 9.5.1, AC 9.5.2
- [Source: .bmad-ephemeral/stories/tech-spec-epic-9.md#Logout-Flow] - Detailed workflow
- [Source: docs/epics.md#Story-9.5] - Original story definition
- [Source: docs/architecture.md] - Auth endpoint patterns

---

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/9-5-logout.context.xml` (generated 2026-01-05)

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Enhanced `auth.ts` logout() to call POST /auth/logout with refresh token before clearing local tokens
- Implemented graceful degradation - local cleanup proceeds even if server call fails
- Added mileageStore integration to stop background tracking on logout (AC 9.5.2)
- Added subscriptionStore integration to reset tier to FREE on logout
- Updated deleteAccount() to follow same pattern for consistency
- Created comprehensive unit tests using vi.hoisted() pattern for proper mock hoisting
- All 331 mobile tests + 127 API tests pass

### File List

- `apps/mobile/src/services/auth.ts` - Enhanced logout with server token revocation
- `apps/mobile/src/stores/authStore.ts` - Added tracking cleanup and subscription reset
- `apps/mobile/src/services/__tests__/auth.test.ts` - New: 6 logout service tests
- `apps/mobile/src/stores/__tests__/authStore.test.ts` - New: 8 authStore logout tests

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-05 | 1.0 | Story drafted from tech-spec-epic-9.md |
| 2026-01-05 | 1.1 | Implementation complete - all tasks done, tests passing |
| 2026-01-05 | 1.2 | Senior Developer Review notes appended - APPROVED |

---

## Senior Developer Review (AI)

### Reviewer
George

### Date
2026-01-05

### Outcome
✅ **APPROVE**

All acceptance criteria implemented with evidence. All tasks verified complete. Code follows established patterns. Comprehensive test coverage.

### Summary

Story 9.5 successfully completes the logout functionality for Epic 9 (Settings & Profile). The implementation:
- Revokes refresh token server-side before clearing local storage
- Stops background location tracking on logout
- Clears subscription state while preserving user preferences
- Provides comprehensive test coverage (14 tests)

### Key Findings

**No HIGH or MEDIUM severity issues found.**

| Severity | Finding | Location |
|----------|---------|----------|
| LOW | Console.warn in production code | `auth.ts:172` |

### Acceptance Criteria Coverage

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC 9.5.1 | Log out with confirmation, clear session, navigate to login | ✅ IMPLEMENTED | `accounts.tsx:141-160`, `authStore.ts:47-65`, `auth.ts:160-179` |
| AC 9.5.2 | Stop background tracking on logout | ✅ IMPLEMENTED | `authStore.ts:48-52` |

**Summary: 2 of 2 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Status | Evidence |
|------|--------|----------|
| Task 1: Verify Existing Logout UI | ✅ VERIFIED | `accounts.tsx:141-160`, `accounts.tsx:356-372` |
| Task 2: Enhance Backend Logout | ✅ VERIFIED | `auth.ts:160-179`, `auth.routes.ts:49` |
| Task 3: Stop Background Tracking | ✅ VERIFIED | `authStore.ts:48-52` |
| Task 4: Clear All Application State | ✅ VERIFIED | `authStore.ts:47-65` |
| Task 5: Verify Navigation Flow | ✅ VERIFIED | `accounts.tsx:151`, `_layout.tsx:43-46` |
| Task 6: Add Unit Tests | ✅ VERIFIED | 14 tests pass |

**Summary: 6 of 6 tasks verified, 0 questionable, 0 false completions**

### Test Coverage and Gaps

- ✅ `auth.test.ts`: 6 tests for logout service (token retrieval, server call, graceful degradation)
- ✅ `authStore.test.ts`: 8 tests for authStore logout (state reset, tracking stop, order of operations)
- All 14 logout-specific tests pass
- Tests use `vi.hoisted()` pattern correctly for proper mock setup

### Architectural Alignment

- ✅ Follows tech-spec logout flow (8 steps)
- ✅ JWT strategy - refresh token revoked server-side
- ✅ Secure storage cleared via expo-secure-store
- ✅ Graceful degradation - logout completes even if server fails
- ✅ Consistent with Story 9.4 (Account Deletion) patterns

### Security Notes

- ✅ Refresh token revoked server-side before local clear
- ✅ Tokens cleared from SecureStore
- ✅ No sensitive data exposed in logs
- ✅ Best-effort server revocation prevents token reuse

### Best-Practices and References

- [Zustand Store Patterns](https://docs.pmnd.rs/zustand) - Cross-store communication via getState()
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) - Secure token storage
- [Vitest vi.hoisted()](https://vitest.dev/api/vi.html#vi-hoisted) - Proper mock hoisting

### Action Items

**Advisory Notes:**
- Note: Consider abstracting console.warn to a logger for production builds (LOW priority, no action required)
