# Story 2.5: Password Reset Flow

**Epic:** 2 - User Authentication
**Story ID:** 2.5
**Status:** done
**Priority:** P0
**Created:** 2026-01-02

---

## User Story

**As a** user who forgot my password,
**I want** to reset it via email,
**So that** I can regain access to my account.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Forgot password link on login screen | Tapping shows email input |
| AC2 | Valid email triggers reset email | POST /api/v1/auth/forgot-password sends email |
| AC3 | Reset link contains secure token | 32-byte URL-safe token |
| AC4 | Token expires after 1 hour | Expired tokens rejected |
| AC5 | New password can be set | POST /api/v1/auth/reset-password works |
| AC6 | Token invalidated after use | Cannot reuse token |
| AC7 | Success redirects to login | User can log in with new password |

---

## Tasks

### Task 1: Add Password Reset Schema
- [x] Add ForgotPasswordSchema (email)
- [x] Add ResetPasswordSchema (token, newPassword)

### Task 2: Create Forgot Password Endpoint
- [x] Add POST /api/v1/auth/forgot-password
- [x] Generate secure reset token (32 bytes)
- [x] Store token with 1hr expiry in database
- [x] Send reset email (or log token for dev)

### Task 3: Create Reset Password Endpoint
- [x] Add POST /api/v1/auth/reset-password
- [x] Validate token exists and not expired
- [x] Hash new password and update user
- [x] Delete used token

### Task 4: Add Forgot Password UI
- [x] Add "Forgot Password?" link on login screen
- [x] Create forgot password modal/screen
- [x] Handle success/error states

### Task 5: Test Flow
- [x] Test forgot password request
- [x] Test reset with valid token
- [x] Test expired token rejection

---

## Technical Notes

### Password Reset Flow
1. User taps "Forgot Password?" on login screen
2. User enters email address
3. Backend generates secure token, stores with expiry
4. Email sent with reset link (or token logged in dev)
5. User clicks link / enters token
6. User enters new password
7. Password updated, token deleted
8. User redirected to login

### Token Requirements
- 32 bytes, URL-safe base64 encoded
- 1 hour expiry
- Single use (deleted after successful reset)
- Stored hashed in database (like passwords)

---

## Dependencies

### Prerequisites
- Story 2.1: Email/Password Registration (completed)
- Story 2.2: Email/Password Login (completed)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-02 | Claude | Story created |
| 2026-01-01 | Claude | Implementation complete |
