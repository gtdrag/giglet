# Epic Technical Specification: Settings & Profile

Date: 2026-01-05
Author: George
Epic ID: 9
Status: Draft

---

## Overview

Epic 9 provides user controls for preferences, account management, and legal compliance. This epic delivers the Settings & Profile functionality that enables users to view and edit their profile, manage notification preferences, access legal documents (Privacy Policy and Terms of Service), delete their account for GDPR/CCPA compliance, and log out securely.

This epic is a standard settings feature set that most mobile apps require. It builds on the authentication infrastructure from Epic 2 and leverages existing Zustand stores and API patterns established throughout the project.

## Objectives and Scope

### In Scope
- **Story 9.1**: Profile View and Edit - View user profile, edit name
- **Story 9.2**: Notification Preferences - Toggle push notifications, zone alerts, sync error alerts
- **Story 9.3**: Privacy Policy and Terms of Service - Access legal documents
- **Story 9.4**: Account Deletion - GDPR/CCPA compliant account deletion with 30-day grace period
- **Story 9.5**: Logout - Clear session and return to login screen

### Out of Scope
- Profile photo upload (future enhancement)
- Email change functionality (email is account identifier)
- In-app chat support (future enhancement - US-8.6 in PRD)
- Dark mode toggle (already exists in UserPreferences, can be exposed later)
- Mileage tracking sensitivity settings (already exists, can be exposed later)

## System Architecture Alignment

This epic aligns with the established architecture:

**Mobile App Components:**
- `app/(tabs)/settings.tsx` - Main settings screen (exists as placeholder)
- New screens: `app/profile.tsx`, `app/notifications.tsx`, `app/legal.tsx`
- Existing stores: `authStore.ts` for auth state
- New store: `settingsStore.ts` for user preferences

**Backend API:**
- Existing: `PUT /api/v1/auth/profile` for profile updates
- Existing: `DELETE /api/v1/auth/account` for account deletion (architecture.md:491)
- New: `GET/PUT /api/v1/users/preferences` for notification preferences
- Existing: `POST /api/v1/auth/logout` for logout

**Database:**
- Uses existing `User` model for profile data
- Uses existing `UserPreferences` model for notification settings (architecture.md:326-334)

## Detailed Design

### Services and Modules

| Module | Responsibility | Location |
|--------|---------------|----------|
| SettingsScreen | Main settings menu with navigation to sub-screens | `app/(tabs)/settings.tsx` |
| ProfileScreen | View and edit user profile (name, email display) | `app/profile.tsx` |
| NotificationsScreen | Manage notification preference toggles | `app/notifications.tsx` |
| LegalScreen | Display Privacy Policy and Terms of Service links | `app/legal.tsx` |
| settingsStore | Zustand store for user preferences state | `src/stores/settingsStore.ts` |
| settingsService | API calls for preferences | `src/services/settings.ts` |
| UserService (API) | Backend profile and preferences logic | `apps/api/src/services/user.service.ts` |
| UserRoutes (API) | Backend user endpoints | `apps/api/src/routes/user.routes.ts` |

### Data Models and Contracts

**Existing Models (from architecture.md):**

```prisma
// User model (existing)
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String?
  authProvider  AuthProvider @default(EMAIL)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  preferences   UserPreferences?
  // ... other relations
}

// UserPreferences model (existing)
model UserPreferences {
  id                    String  @id @default(cuid())
  userId                String  @unique
  user                  User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  notificationsEnabled  Boolean @default(true)
  zoneAlertsEnabled     Boolean @default(true)
  autoMileageTracking   Boolean @default(true)
  darkModeEnabled       Boolean @default(true)
}
```

**TypeScript Interfaces:**

```typescript
// Mobile types
interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  authProvider: 'EMAIL' | 'APPLE' | 'GOOGLE';
  createdAt: string;
}

interface UserPreferences {
  notificationsEnabled: boolean;
  zoneAlertsEnabled: boolean;
  syncErrorAlertsEnabled: boolean; // Maps to autoMileageTracking or new field
}

interface UpdateProfileRequest {
  name: string;
}

interface UpdatePreferencesRequest {
  notificationsEnabled?: boolean;
  zoneAlertsEnabled?: boolean;
  syncErrorAlertsEnabled?: boolean;
}
```

### APIs and Interfaces

**Profile Endpoints:**

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| GET | `/api/v1/users/me` | - | `{ user: UserProfile }` | Get current user profile |
| PUT | `/api/v1/users/me` | `UpdateProfileRequest` | `{ user: UserProfile }` | Update profile (name only) |
| DELETE | `/api/v1/auth/account` | - | `{ success: true }` | Schedule account deletion |

**Preferences Endpoints:**

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| GET | `/api/v1/users/preferences` | - | `{ preferences: UserPreferences }` | Get user preferences |
| PUT | `/api/v1/users/preferences` | `UpdatePreferencesRequest` | `{ preferences: UserPreferences }` | Update preferences |

**Auth Endpoints (existing):**

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/api/v1/auth/logout` | - | `{ success: true }` | Revoke refresh token |

### Workflows and Sequencing

**Profile Edit Flow:**
```
1. User navigates to Settings → Profile
2. App fetches /users/me (or uses cached auth state)
3. User edits name field
4. User taps "Save"
5. App calls PUT /users/me with new name
6. Backend validates (non-empty, max 100 chars)
7. Backend updates User record
8. App updates authStore with new profile
9. Success toast shown
```

**Notification Preferences Flow:**
```
1. User navigates to Settings → Notifications
2. App fetches /users/preferences (or uses cached settingsStore)
3. User toggles preference switches
4. On each toggle, app calls PUT /users/preferences
5. Backend updates UserPreferences record
6. App updates settingsStore
7. Changes take effect immediately for push notification filtering
```

**Account Deletion Flow:**
```
1. User navigates to Settings → Profile → Delete Account
2. App shows warning modal explaining:
   - All data will be permanently deleted
   - 30-day grace period before hard delete
   - Can recover by logging back in within 30 days
3. User confirms by typing "DELETE"
4. App calls DELETE /auth/account
5. Backend:
   - Sets user.deletionScheduledAt = now + 30 days
   - Marks account as pending deletion
   - Sends confirmation email
6. App clears local session
7. App navigates to login screen with "Account deletion scheduled" message
```

**Logout Flow:**
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

## Non-Functional Requirements

### Performance

| Metric | Target | Source |
|--------|--------|--------|
| Profile load time | < 200ms | Use cached authStore, lazy fetch |
| Preferences load time | < 200ms | Cached in settingsStore |
| Preference toggle response | < 500ms | Optimistic UI update |
| Logout time | < 1 second | Clear local state immediately |

### Security

- **Authentication**: All endpoints require valid JWT
- **Authorization**: Users can only access/modify their own data
- **Data Protection**: No sensitive data exposed (password hash never returned)
- **Session Management**: Logout properly revokes refresh tokens
- **Account Deletion**: Follows GDPR/CCPA requirements with 30-day retention

### Reliability/Availability

- **Offline Support**: Profile viewed from cached authStore
- **Error Handling**: Show clear error messages for failed operations
- **Retry Logic**: Automatic retry with exponential backoff for network failures
- **Graceful Degradation**: If preferences API fails, use local defaults

### Observability

- **Logging**: Log profile updates and account deletions (without PII)
- **Analytics Events**:
  - `settings_profile_viewed`
  - `settings_profile_updated`
  - `settings_notifications_changed`
  - `settings_logout_clicked`
  - `settings_delete_account_initiated`
- **Error Tracking**: Sentry integration for failed API calls

## Dependencies and Integrations

### Mobile Dependencies (Existing)

| Package | Version | Purpose |
|---------|---------|---------|
| expo-secure-store | ~15.0.8 | Clear tokens on logout |
| expo-linking | ^8.0.11 | Open legal docs in browser |
| zustand | ^5.0.9 | State management |
| axios | ^1.13.2 | API calls |
| expo-location | ~19.0.8 | Stop tracking on logout |

### Backend Dependencies (Existing)

| Package | Version | Purpose |
|---------|---------|---------|
| @prisma/client | ^6.19.1 | Database operations |
| jsonwebtoken | - | Token revocation |
| zod | - | Request validation |

### External Integrations

| Service | Purpose | Notes |
|---------|---------|-------|
| Web Hosting | Host Privacy Policy and ToS | Static HTML on giglet.app domain |
| expo-linking | Open legal URLs | Native browser integration |

## Acceptance Criteria (Authoritative)

### Story 9.1: Profile View and Edit

**AC 9.1.1**: Given I am on the Profile/Settings screen, When I view my profile, Then I see my name and email, And I can edit my name, And email is displayed but not editable.

**AC 9.1.2**: Given I edit my name, When I save changes, Then my profile updates, And I see confirmation.

**AC 9.1.3**: Given I enter an empty name, When I try to save, Then I see validation error "Name cannot be empty".

### Story 9.2: Notification Preferences

**AC 9.2.1**: Given I am in Settings > Notifications, When I view notification options, Then I see toggles for: Push notifications, Focus Zone alerts, Sync error alerts, And I can turn each on/off independently, And changes save automatically.

**AC 9.2.2**: Given I disable Focus Zone alerts, When a zone heats up, Then I do not receive a push notification.

### Story 9.3: Privacy Policy and Terms of Service

**AC 9.3.1**: Given I am in Settings, When I tap "Privacy Policy", Then I see the full privacy policy (in-app or web), And I can scroll through the entire document.

**AC 9.3.2**: Given I tap "Terms of Service", When the document opens, Then I see the full terms of service.

### Story 9.4: Account Deletion

**AC 9.4.1**: Given I want to delete my account, When I tap "Delete Account", Then I see warning about permanent deletion, And I must confirm (type "DELETE" or similar), And on confirmation, deletion process starts.

**AC 9.4.2**: Given I confirm deletion, When deletion processes, Then my account is scheduled for deletion, And I am logged out, And within 30 days, all my data is permanently removed.

**AC 9.4.3**: Given I deleted my account, When I log back in within 30 days, Then my account is recovered and deletion is cancelled.

### Story 9.5: Logout

**AC 9.5.1**: Given I am logged in, When I tap "Log Out", Then I see confirmation prompt, And if confirmed, I am logged out, And I am returned to the login screen, And my local session data is cleared.

**AC 9.5.2**: Given I have mileage tracking enabled, When I log out, Then background tracking stops.

## Traceability Mapping

| AC | Spec Section | Component/API | Test Idea |
|----|--------------|---------------|-----------|
| AC 9.1.1 | Data Models | ProfileScreen, GET /users/me | Render test: displays name and email |
| AC 9.1.2 | Workflows | ProfileScreen, PUT /users/me | Integration: save updates profile |
| AC 9.1.3 | APIs | ProfileScreen validation | Unit: empty name shows error |
| AC 9.2.1 | Data Models | NotificationsScreen, PUT /users/preferences | Render: shows all toggles |
| AC 9.2.2 | Workflows | Push notification filtering | Integration: disabled alert not sent |
| AC 9.3.1 | Dependencies | LegalScreen, expo-linking | Manual: opens Privacy Policy |
| AC 9.3.2 | Dependencies | LegalScreen, expo-linking | Manual: opens Terms of Service |
| AC 9.4.1 | Workflows | ProfileScreen, DELETE /auth/account | Integration: confirmation required |
| AC 9.4.2 | Data Models | UserService | Unit: deletion scheduled correctly |
| AC 9.4.3 | Workflows | AuthService | Integration: login recovers account |
| AC 9.5.1 | Workflows | SettingsScreen, authStore | Integration: logout clears state |
| AC 9.5.2 | Workflows | mileageStore, expo-location | Unit: stopTracking called on logout |

## Risks, Assumptions, Open Questions

### Risks

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | Legal documents not ready | Medium | Low | Use placeholder URLs, update before release |
| R2 | Account deletion within grace period re-login | Low | Medium | Test thoroughly, clear documentation |
| R3 | Push notification toggles not reflected immediately | Low | Low | Implement proper preference checking in push service |

### Assumptions

- A1: Legal documents (Privacy Policy, ToS) will be hosted on giglet.app as static HTML
- A2: Account deletion grace period of 30 days is acceptable per legal requirements
- A3: Users understand "Delete Account" is different from "Log Out"
- A4: Email is immutable (changing email requires support ticket)

### Open Questions

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| Q1 | Should we add "dark mode" toggle to settings? | Product | Deferred to future |
| Q2 | Should account recovery send email confirmation? | Product | Yes - include in implementation |
| Q3 | What are the exact legal document URLs? | Legal | TBD - use placeholders |

## Test Strategy Summary

### Unit Tests
- settingsStore: Test preference state management
- settingsService: Test API call formatting
- ProfileScreen: Test validation logic (empty name)
- NotificationsScreen: Test toggle state management

### Integration Tests
- Profile update flow: End-to-end save and reload
- Logout flow: Verify all stores cleared, navigation correct
- Preferences persistence: Verify changes survive app restart

### Manual Tests
- Legal document links open correctly on iOS and Android
- Account deletion confirmation flow
- Logout stops background location tracking
- Push notification preferences affect actual notifications

### Test Coverage Target
- 80% coverage for new code
- All acceptance criteria have at least one test

---

*This specification is derived from the PRD and Architecture documents. Implementation should follow established patterns from previous epics.*
