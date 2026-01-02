# Story 2.2: Email/Password Login

**Epic:** 2 - User Authentication
**Story ID:** 2.2
**Status:** done
**Priority:** P0
**Created:** 2026-01-02

---

## User Story

**As a** registered user,
**I want** to log in with my email and password,
**So that** I can access my account.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Login with correct credentials returns tokens | POST /api/v1/auth/login returns 200 with tokens |
| AC2 | Invalid credentials return 401 error | Returns 401 with "Invalid email or password" |
| AC3 | Session persists across app restarts | Reopening app keeps user logged in |
| AC4 | Token refresh works on 401 response | Automatic retry with new tokens |
| AC5 | Refresh token endpoint works | POST /api/v1/auth/refresh returns new tokens |
| AC6 | Logout clears tokens | Tokens removed from secure storage |
| AC7 | Mobile login screen with form | UI allows email/password entry |

---

## Tasks

### Task 1: Add Login Method to Auth Service
- [x] Add login method to auth.service.ts
- [x] Verify password with bcrypt.compare
- [x] Return tokens on success, throw on failure

### Task 2: Add Login Controller and Route
- [x] Add login handler to auth.controller.ts
- [x] Add POST /login route to auth.routes.ts
- [x] Apply LoginSchema validation

### Task 3: Add Token Refresh Endpoint
- [x] Add refresh method to auth.service.ts
- [x] Validate refresh token exists in database
- [x] Generate new access + refresh tokens
- [x] Delete old refresh token (rotation)
- [x] Add POST /refresh route

### Task 4: Add Logout Endpoint
- [x] Add logout method to auth.service.ts
- [x] Delete refresh token from database
- [x] Add POST /logout route

### Task 5: Implement Mobile Login Screen
- [x] Update app/(auth)/login.tsx with form
- [x] Add login action to auth store
- [x] Handle errors with field messages

### Task 6: Add Session Persistence
- [x] Check tokens on app startup
- [x] Auto-login if valid tokens exist
- [x] Redirect appropriately

### Task 7: Test Flow
- [x] Test login with valid credentials
- [x] Test invalid credentials
- [x] Test token refresh
- [x] Test session persistence
- [x] Test logout

---

## API Endpoints

```
POST /api/v1/auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "data": {
    "user": { "id": "cuid", "email": "user@example.com", "name": "John" },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "random-token"
  }
}

Error (401):
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Invalid email or password" }
}
```

```
POST /api/v1/auth/refresh
Content-Type: application/json

Request:
{ "refreshToken": "old-refresh-token" }

Response (200):
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

```
POST /api/v1/auth/logout
Content-Type: application/json

Request:
{ "refreshToken": "token-to-revoke" }

Response (200):
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

## Dependencies

### Prerequisites
- Story 2.1: Email/Password Registration (completed)

### Enables
- Story 2.3: Apple Sign In
- Story 2.4: Google Sign In

---

## Definition of Done

- [x] All acceptance criteria verified
- [x] All tasks completed
- [x] TypeScript compiles without errors

---

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes
- **AC1** ✅ Login returns 200 with user and tokens
- **AC2** ✅ Invalid credentials return 401 "Invalid email or password"
- **AC3** ✅ Session persists via expo-secure-store + checkAuthStatus
- **AC4** ✅ Token refresh implemented in api.ts interceptor
- **AC5** ✅ POST /api/v1/auth/refresh returns new tokens
- **AC6** ✅ POST /api/v1/auth/logout clears tokens
- **AC7** ✅ Login screen with email/password form

### File List

**Backend (apps/api/src):**
- `services/auth.service.ts` - MODIFIED: Added login, refresh, logout methods
- `controllers/auth.controller.ts` - MODIFIED: Added handlers
- `routes/auth.routes.ts` - MODIFIED: Added routes

**Mobile (apps/mobile):**
- `src/services/auth.ts` - MODIFIED: Added login function
- `src/stores/authStore.ts` - MODIFIED: Added login action
- `app/(auth)/login.tsx` - MODIFIED: Full login form
- `app/index.tsx` - MODIFIED: Session persistence check

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-02 | Claude | Story created and implemented |
