# Story 2.1: Email/Password Registration

**Epic:** 2 - User Authentication
**Story ID:** 2.1
**Status:** done
**Priority:** P0
**Created:** 2026-01-01

---

## User Story

**As a** new user,
**I want** to create an account with my email and password,
**So that** I can access Giglet's features.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Registration with valid email and password (8+ chars, 1 number) creates account | POST /api/v1/auth/register returns 201 with tokens |
| AC2 | Invalid email format returns validation error | Returns 400 with "Please enter a valid email" |
| AC3 | Password less than 8 characters returns error | Returns 400 with password requirements message |
| AC4 | Duplicate email returns conflict error | Returns 409 with "An account with this email already exists" |
| AC5 | Password hashed with bcrypt before storage | Password not stored in plaintext |
| AC6 | JWT access token returned on success | Access token with 15min expiry |
| AC7 | Refresh token returned and stored in database | Refresh token with 30 day expiry in RefreshToken table |
| AC8 | Mobile registration screen with form validation | UI shows validation errors before submission |
| AC9 | Email stored lowercase and trimmed | "Test@Example.com " becomes "test@example.com" |

---

## Tasks

### Task 1: Install Required Dependencies
**Estimated:** 5 min
**AC:** AC5, AC6, AC7

- [x] Install bcryptjs for password hashing
- [x] Install jsonwebtoken for JWT generation
- [x] Install zod for validation
- [x] Add types: @types/bcryptjs, @types/jsonwebtoken

### Task 2: Create Auth Configuration
**Estimated:** 10 min
**AC:** AC6, AC7

- [x] Add JWT_SECRET to .env
- [x] Add JWT_EXPIRES_IN (15m) to .env
- [x] Add REFRESH_TOKEN_EXPIRES_IN (30d) to .env
- [x] Update config/index.ts with auth settings
- [x] Create src/utils/jwt.ts with token generation functions

### Task 3: Create Auth Validation Schemas
**Estimated:** 10 min
**AC:** AC1, AC2, AC3

- [x] Create src/schemas/auth.schema.ts
- [x] Define RegisterSchema with Zod:
  - email: valid email format
  - password: min 8 chars, at least 1 number
  - name: optional string

### Task 4: Create Auth Service
**Estimated:** 20 min
**AC:** AC1, AC4, AC5, AC6, AC7, AC9

- [x] Create src/services/auth.service.ts
- [x] Implement register method:
  - Normalize email (lowercase, trim)
  - Check for existing user
  - Hash password with bcrypt (cost 12)
  - Create user in database
  - Generate access and refresh tokens
  - Store refresh token in database
  - Return tokens and user info

### Task 5: Create Auth Controller
**Estimated:** 10 min
**AC:** AC1, AC2, AC3, AC4

- [x] Create src/controllers/auth.controller.ts
- [x] Implement register handler:
  - Call auth service
  - Return 201 with tokens
  - Handle errors with appropriate codes

### Task 6: Create Auth Routes
**Estimated:** 10 min
**AC:** AC1

- [x] Create src/routes/auth.routes.ts
- [x] Define POST /register route
- [x] Apply validation middleware
- [x] Mount at /api/v1/auth

### Task 7: Create Validation Middleware
**Estimated:** 10 min
**AC:** AC2, AC3

- [x] Create src/middleware/validate.middleware.ts
- [x] Implement generic Zod validation middleware
- [x] Return proper error format on validation failure

### Task 8: Mobile - Create Registration Screen
**Estimated:** 25 min
**AC:** AC8

- [x] Create app/(auth)/register.tsx
- [x] Add email input with validation
- [x] Add password input with show/hide toggle
- [x] Add optional name input
- [x] Add submit button
- [x] Show loading state during submission
- [x] Navigate to login or main app on success

### Task 9: Mobile - Create API Service
**Estimated:** 15 min
**AC:** AC1

- [x] Create src/services/api.ts with Axios instance
- [x] Create src/services/auth.ts with register function
- [x] Configure base URL from environment

### Task 10: Mobile - Update Auth Store
**Estimated:** 10 min
**AC:** AC6, AC7

- [x] Update src/stores/authStore.ts
- [x] Add register action
- [x] Store tokens securely with expo-secure-store
- [x] Update isAuthenticated state

### Task 11: Verify and Test
**Estimated:** 15 min
**AC:** All

- [x] Test registration with valid credentials
- [x] Test validation errors (invalid email, short password)
- [x] Test duplicate email handling
- [x] Verify tokens are returned
- [x] Verify password is hashed in database

---

## Technical Notes

### Technology Stack (from Architecture)
- **Backend:** Express.js, TypeScript, Prisma
- **Mobile:** React Native (Expo), TypeScript
- **Auth:** JWT (jsonwebtoken), bcryptjs
- **Validation:** Zod 4.x
- **Storage:** expo-secure-store

### API Endpoint
```
POST /api/v1/auth/register
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"  // optional
}

Response (201):
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "random-secure-token"
  }
}

Error Response (400):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "email": ["Please enter a valid email"],
      "password": ["Password must be at least 8 characters"]
    }
  }
}
```

### Password Requirements
- Minimum 8 characters
- At least 1 number
- Stored hashed with bcrypt cost factor 12

### JWT Token Structure
```typescript
// Access Token (15 min expiry)
{
  "sub": "user_cuid",
  "email": "user@example.com",
  "tier": "FREE",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Database Models (Already in Prisma Schema)
- User: id, email, passwordHash, name, authProvider, etc.
- RefreshToken: id, token, userId, expiresAt

---

## Dependencies

### Prerequisites
- Story 1.4: Core Navigation (completed) - provides auth screens
- Story 1.5: API Foundation (completed) - provides routes, error handling

### Blockers
- None

### Enables
- Story 2.2: Email/Password Login
- Story 2.3: Apple Sign In
- Story 2.4: Google Sign In
- Story 2.6: Onboarding Flow

---

## Definition of Done

- [x] All acceptance criteria verified
- [x] All tasks completed
- [x] User can register with valid email/password
- [x] Validation errors shown for invalid input
- [x] Tokens returned and stored securely
- [x] Password hashed in database
- [x] TypeScript compiles without errors
- [x] Story marked as `done` in sprint-status.yaml

---

## Dev Notes

### Learnings from Previous Stories

**From Story 1-5-api-foundation-and-health-endpoints (Status: done)**
- Controller/service pattern established
- API response types in src/types/api.types.ts
- Request ID middleware for tracing
- Error handling with AppError class

**From Story 1-4-core-navigation-and-app-shell (Status: done)**
- Auth screens exist at app/(auth)/*.tsx
- Zustand for state management
- Navigation structure in place

### Implementation Notes
- Zod 4.x uses `{ message: '...' }` instead of `{ required_error: '...' }` for custom messages
- JWT SignOptions requires explicit type casting for expiresIn with latest @types/jsonwebtoken
- expo-secure-store requires installation via `npx expo install`

---

## Dev Agent Record

### Context Reference
<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- API tested with curl: All validation scenarios pass
- Registration creates user with hashed password
- Tokens returned correctly

### Completion Notes List
- **AC1** ✅ Registration with valid credentials returns 201 with user and tokens
- **AC2** ✅ Invalid email returns 400 with "Please enter a valid email"
- **AC3** ✅ Short password returns 400 with "Password must be at least 8 characters"
- **AC4** ✅ Duplicate email returns 409 with "An account with this email already exists"
- **AC5** ✅ Password hashed with bcrypt cost 12 (`auth.service.ts:40`)
- **AC6** ✅ JWT access token with 15min expiry generated (`jwt.ts:17-20`)
- **AC7** ✅ Refresh token stored in database (`auth.service.ts:77-82`)
- **AC8** ✅ Mobile registration screen with form validation (`register.tsx`)
- **AC9** ✅ Email normalized in Zod schema (`auth.schema.ts:15`)

### File List

**Backend (apps/api/src):**
- `utils/jwt.ts` - NEW: JWT token generation and verification
- `middleware/validate.middleware.ts` - NEW: Zod validation middleware
- `schemas/auth.schema.ts` - NEW: Auth request schemas
- `services/auth.service.ts` - NEW: Auth business logic
- `controllers/auth.controller.ts` - NEW: Auth request handlers
- `routes/auth.routes.ts` - NEW: Auth route definitions
- `routes/index.ts` - MODIFIED: Added auth routes

**Mobile (apps/mobile/src):**
- `services/api.ts` - NEW: Axios instance with auth interceptors
- `services/auth.ts` - NEW: Auth API calls
- `stores/authStore.ts` - MODIFIED: Added register action

**Mobile (apps/mobile/app):**
- `(auth)/register.tsx` - MODIFIED: Full registration form

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-01 | Claude | Story drafted from epics.md and architecture.md |
| 2026-01-02 | Claude | Implementation completed - all ACs verified |
