# Story 3.1: DoorDash Account Connection UI

**Epic:** 3 - Platform Account Linking
**Story ID:** 3.1
**Status:** done
**Priority:** P0
**Created:** 2026-01-01

---

## User Story

**As a** user,
**I want** to connect my DoorDash account,
**So that** my DoorDash earnings sync automatically.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Accounts screen shows "Connect DoorDash" option | Screen displays connect button |
| AC2 | Tapping Connect shows secure login form | Email/password form appears |
| AC3 | Trust messaging displayed | "Your credentials are encrypted" shown |
| AC4 | Valid credentials create connection | Account status shows "Connected" |
| AC5 | Invalid credentials show error | Error message displayed |
| AC6 | Credentials encrypted in transit (HTTPS) | TLS enforced |
| AC7 | Credentials encrypted at rest (AES-256) | Backend encrypts before storage |

---

## Tasks

### Task 1: Create Accounts Tab/Screen
- [ ] Add Accounts tab to bottom navigation (or Settings → Accounts)
- [ ] Create AccountsScreen component
- [ ] Show platform connection cards (DoorDash, Uber Eats)

### Task 2: Create Platform Connection API
- [ ] POST /api/v1/platforms/connect - Store encrypted credentials
- [ ] GET /api/v1/platforms - List user's connected platforms
- [ ] Add AES-256 encryption utility for credentials

### Task 3: Create DoorDash Connection Modal
- [ ] Show login form (email, password)
- [ ] Display trust messaging
- [ ] Handle loading/success/error states
- [ ] Call connect API on submit

### Task 4: Update Prisma Schema if needed
- [ ] Verify PlatformAccount model has all required fields
- [ ] Add encryption key to config

---

## Technical Notes

### Security Requirements
- NEVER log credentials
- Use HTTPS for all API calls
- Encrypt credentials with AES-256-GCM before database storage
- Store encryption key in environment variables, not code

### Trust Messaging
Display on connection form:
- "Your credentials are encrypted and stored securely"
- "We only use your login to sync your earnings"
- "You can disconnect at any time"

---

## Dependencies

### Prerequisites
- Story 2.2: Email/Password Login (completed)
- Story 1.5: API Foundation (completed)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-01 | Claude | Story created |
