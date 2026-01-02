# Story 2.4: Google Sign In

**Epic:** 2 - User Authentication
**Story ID:** 2.4
**Status:** done
**Priority:** P0
**Created:** 2026-01-02

---

## User Story

**As a** user on iOS or Android,
**I want** to sign in with my Google account,
**So that** registration is quick and I don't need another password.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Google Sign In button appears on login screen | Button visible on both iOS and Android |
| AC2 | Tapping button initiates Google OAuth flow | Google sign-in UI appears |
| AC3 | New users are automatically registered | Account created with Google ID |
| AC4 | Returning users are logged in to existing account | Matched by Google user identifier |
| AC5 | Backend verifies Google ID token | Token validated before account creation |
| AC6 | Tokens returned on successful auth | JWT access + refresh tokens returned |

---

## Tasks

### Task 1: Install Google Sign In packages
- [x] Install @react-native-google-signin/google-signin
- [x] Configure Expo plugin
- [x] Rebuild native apps

### Task 2: Add Google Sign In Button to Login Screen
- [x] Add Google Sign In button
- [x] Style consistently with app design
- [x] Handle button press to start auth flow

### Task 3: Create Google Auth Backend Endpoint
- [x] Add POST /api/v1/auth/google endpoint
- [x] Verify Google ID token with Google's servers
- [x] Create or find user by Google ID
- [x] Return tokens

### Task 4: Handle Google Auth Flow in Mobile
- [x] Configure Google Sign In
- [x] Call Google authentication
- [x] Send ID token to backend
- [x] Store returned tokens
- [x] Navigate to app on success

### Task 5: Test Flow
- [x] Test new user registration
- [x] Test returning user login

---

## Technical Notes

### Google Sign In Flow
1. User taps "Sign in with Google" button
2. Google Sign In SDK shows account picker
3. User selects/authenticates with Google account
4. Google returns ID token
5. App sends ID token to backend
6. Backend verifies token with Google's public keys
7. Backend creates/finds user, returns JWT tokens
8. App stores tokens and navigates to main app

### Configuration Required
- Google Cloud Console project with OAuth 2.0 credentials
- iOS client ID for iOS app
- Web client ID for token verification
- Android client ID (uses web client ID for verification)

---

## Dependencies

### Prerequisites
- Story 2.1: Email/Password Registration (completed)
- Story 2.2: Email/Password Login (completed)
- Story 2.3: Apple Sign In (completed)

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
- **AC1** ✅ Google Sign In button appears on login screen (iOS and Android)
- **AC2** ✅ Native Google Sign In flow via @react-native-google-signin
- **AC3** ✅ New users auto-registered with Google ID
- **AC4** ✅ Returning users matched by googleId field
- **AC5** ✅ Backend verifies token with google-auth-library
- **AC6** ✅ JWT access + refresh tokens returned on success

### File List

**Backend (apps/api/src):**
- `config/index.ts` - MODIFIED: Added googleClientId
- `schemas/auth.schema.ts` - MODIFIED: Added GoogleAuthSchema
- `services/auth.service.ts` - MODIFIED: Added googleAuth method with OAuth2Client verification
- `controllers/auth.controller.ts` - MODIFIED: Added googleAuth handler
- `routes/auth.routes.ts` - MODIFIED: Added /google route

**Mobile (apps/mobile):**
- `app.json` - MODIFIED: Added @react-native-google-signin/google-signin plugin
- `src/services/auth.ts` - MODIFIED: Added GoogleAuthInput and googleAuth function
- `src/stores/authStore.ts` - MODIFIED: Added googleAuth action
- `app/(auth)/login.tsx` - MODIFIED: Added Google Sign In button

### Environment Variables Required
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - Web client ID from Google Cloud Console
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - iOS client ID from Google Cloud Console
- `GOOGLE_CLIENT_ID` - Backend client ID for token verification

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-02 | Claude | Story created |
| 2026-01-02 | Claude | Story implemented |
