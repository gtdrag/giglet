# Story 2.3: Apple Sign In (iOS)

**Epic:** 2 - User Authentication
**Story ID:** 2.3
**Status:** done
**Priority:** P0
**Created:** 2026-01-02

---

## User Story

**As an** iOS user,
**I want** to sign in with my Apple ID,
**So that** registration is quick and I don't need another password.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Apple Sign In button appears on iOS login screen | Button visible on iOS, hidden on Android |
| AC2 | Tapping button shows native Apple Sign In sheet | Native iOS authentication sheet appears |
| AC3 | New users are automatically registered | Account created with Apple ID |
| AC4 | Returning users are logged in to existing account | Matched by Apple user identifier |
| AC5 | Private relay emails are handled | Works with @privaterelay.appleid.com emails |
| AC6 | Backend verifies Apple identity token | Token validated before account creation |
| AC7 | Tokens returned on successful auth | JWT access + refresh tokens returned |

---

## Tasks

### Task 1: Install expo-apple-authentication
- [x] Install expo-apple-authentication package
- [x] Rebuild native iOS app

### Task 2: Add Apple Sign In Button to Login Screen
- [x] Add Apple Sign In button (iOS only)
- [x] Style per Apple HIG requirements
- [x] Handle button press to start auth flow

### Task 3: Create Apple Auth Backend Endpoint
- [x] Add POST /api/v1/auth/apple endpoint
- [x] Verify Apple identity token with Apple's servers
- [x] Create or find user by Apple ID
- [x] Return tokens

### Task 4: Handle Apple Auth Flow in Mobile
- [x] Call Apple authentication
- [x] Send identity token to backend
- [x] Store returned tokens
- [x] Navigate to app on success

### Task 5: Test Flow
- [x] Test new user registration
- [x] Test returning user login
- [x] Test with private relay email

---

## Technical Notes

### Apple Sign In Flow
1. User taps "Sign in with Apple" button
2. iOS shows native Apple Sign In sheet
3. User authenticates with Face ID / Touch ID / password
4. Apple returns identity token + user info (first time only)
5. App sends identity token to backend
6. Backend verifies token with Apple's public keys
7. Backend creates/finds user, returns JWT tokens
8. App stores tokens and navigates to main app

### Important Considerations
- Apple only provides user info (email, name) on FIRST sign-in
- Must store Apple user identifier (sub claim) for future lookups
- Email may be @privaterelay.appleid.com (user chose to hide email)
- Button must follow Apple HIG (specific styling requirements)

---

## Dependencies

### Prerequisites
- Story 2.1: Email/Password Registration (completed)
- Story 2.2: Email/Password Login (completed)

### Enables
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
- **AC1** ✅ Apple Sign In button appears on iOS (Platform.OS check + isAvailableAsync)
- **AC2** ✅ Native Apple Sign In sheet via expo-apple-authentication
- **AC3** ✅ New users auto-registered with Apple ID
- **AC4** ✅ Returning users matched by appleId field
- **AC5** ✅ Private relay emails handled (email from token or input)
- **AC6** ✅ Backend verifies token with Apple's JWKS using jose library
- **AC7** ✅ JWT access + refresh tokens returned on success

### File List

**Backend (apps/api/src):**
- `config/index.ts` - MODIFIED: Added appleBundleId
- `schemas/auth.schema.ts` - MODIFIED: Added AppleAuthSchema
- `services/auth.service.ts` - MODIFIED: Added appleAuth method with jose verification
- `controllers/auth.controller.ts` - MODIFIED: Added appleAuth handler
- `routes/auth.routes.ts` - MODIFIED: Added /apple route

**Mobile (apps/mobile):**
- `app.json` - MODIFIED: Added expo-apple-authentication plugin
- `src/services/auth.ts` - MODIFIED: Added AppleAuthInput and appleAuth function
- `src/stores/authStore.ts` - MODIFIED: Added appleAuth action
- `app/(auth)/login.tsx` - MODIFIED: Added Apple Sign In button (iOS only)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-02 | Claude | Story created |
| 2026-01-02 | Claude | Story implemented |
