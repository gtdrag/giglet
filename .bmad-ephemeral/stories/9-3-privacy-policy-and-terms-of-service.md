# Story 9.3: Privacy Policy and Terms of Service

Status: done

## Story

**As a** registered user,
**I want** to access the Privacy Policy and Terms of Service,
**So that** I can understand how my data is used and the terms governing my use of the app.

## Acceptance Criteria

1. **Given** I am in Settings, **When** I tap "Privacy Policy", **Then** I see the full privacy policy (in-app or web), **And** I can scroll through the entire document.

2. **Given** I tap "Terms of Service", **When** the document opens, **Then** I see the full terms of service.

## Prerequisites

- Epic 2 (User Authentication) - Complete
- Story 9.1, 9.2 - Complete (accounts.tsx navigation pattern established)

## Tasks / Subtasks

- [x] Task 1: Create Legal Screen UI (AC: 1, 2)
  - [x] Create `app/legal.tsx` screen with navigation from accounts.tsx
  - [x] Add "Privacy Policy" menu item with icon and chevron
  - [x] Add "Terms of Service" menu item with icon and chevron
  - [x] Style to match app design system (dark theme, cards)
  - [x] Add descriptive text explaining legal documents

- [x] Task 2: Implement Document Opening (AC: 1, 2)
  - [x] Import and configure `expo-linking` for URL handling
  - [x] Implement `openPrivacyPolicy()` function to open URL in browser
  - [x] Implement `openTermsOfService()` function to open URL in browser
  - [x] Handle opening errors gracefully (show Alert if browser fails)
  - [x] Use placeholder URLs (https://giglet.app/privacy, https://giglet.app/terms)

- [x] Task 3: Update Accounts Screen Navigation (AC: 1, 2)
  - [x] Add "Legal" section to accounts.tsx
  - [x] Add menu card with document-text icon
  - [x] Navigate to legal.tsx on tap
  - [x] Position below Preferences section, above Sign Out

- [x] Task 4: Add Unit Tests (AC: 1, 2)
  - [x] Test legal screen renders correctly with both menu items
  - [x] Test expo-linking openURL is called with correct URLs
  - [x] Test error handling when URL opening fails

## Dev Notes

### Technical Approach

This story creates a simple Legal screen that opens Privacy Policy and Terms of Service URLs in the device's native browser. This is a straightforward UI-only story with no backend changes.

**Key Decisions:**
- Open documents in external browser (not in-app WebView) for simplicity
- Use `expo-linking` which is already a dependency
- Placeholder URLs until legal team provides final documents
- No authentication required for legal documents (public URLs)

### Implementation Pattern

```typescript
// app/legal.tsx
import * as Linking from 'expo-linking';

const PRIVACY_POLICY_URL = 'https://giglet.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://giglet.app/terms';

const openPrivacyPolicy = async () => {
  try {
    await Linking.openURL(PRIVACY_POLICY_URL);
  } catch (error) {
    Alert.alert('Error', 'Could not open Privacy Policy');
  }
};
```

### Existing Infrastructure

**Mobile:**
- `expo-linking` - Already installed (^8.0.11)
- `app/accounts.tsx` - Settings hub for navigation (add Legal section)
- `app/notifications.tsx` - Pattern for menu cards and styling

### URL Configuration

**Placeholder URLs (to be updated before release):**
- Privacy Policy: `https://giglet.app/privacy`
- Terms of Service: `https://giglet.app/terms`

**Risk Note**: Legal documents may not be ready (Risk R1 in tech spec). Placeholder URLs will work for development/testing. URLs should be configurable for easy updates.

### Learnings from Previous Story

**From Story 9-2-notification-preferences (Status: done)**

- **Navigation Pattern**: Use `router.push('/legal')` from accounts.tsx
- **Styling Pattern**: Dark theme cards with icons, chevrons for navigation
- **Menu Structure**: accounts.tsx has sections (Account, Preferences, Subscription) - add Legal section
- **Test Pattern**: Vitest + vi.mock for service mocking

[Source: .bmad-ephemeral/stories/9-2-notification-preferences.md#Dev-Agent-Record]

### References

- [Source: .bmad-ephemeral/stories/tech-spec-epic-9.md#Story-9.3] - Acceptance criteria
- [Source: .bmad-ephemeral/stories/tech-spec-epic-9.md#Dependencies-and-Integrations] - expo-linking dependency
- [Source: .bmad-ephemeral/stories/tech-spec-epic-9.md#Risks] - R1: Legal documents may not be ready

---

## Dev Agent Record

### Context Reference

- `.bmad-ephemeral/stories/9-3-privacy-policy-and-terms-of-service.context.xml`

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- None

### Completion Notes List

- Created legal.tsx screen with Privacy Policy and Terms of Service menu items
- Uses expo-linking to open placeholder URLs in native browser
- Added Legal section to accounts.tsx with navigation to legal.tsx
- Error handling shows Alert if URL fails to open
- 8 new tests covering URL opening and error handling
- All 317 tests passing

### File List

**Created:**
- `apps/mobile/app/legal.tsx` - Legal documents screen with Privacy Policy and ToS links
- `apps/mobile/src/services/__tests__/legal.test.ts` - Unit tests for URL opening logic (8 tests)

**Modified:**
- `apps/mobile/app/accounts.tsx` - Added Legal section with navigation card and styles
- `apps/mobile/vitest.config.ts` - Updated to include .tsx test files

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-05 | 1.0 | Story drafted from tech-spec-epic-9.md |
| 2026-01-05 | 1.1 | Implementation complete - all tasks done, 8 tests added |
| 2026-01-05 | 1.2 | Senior Developer Review - APPROVED |

---

## Senior Developer Review (AI)

### Review Metadata

- **Reviewer**: George
- **Date**: 2026-01-05
- **Outcome**: **APPROVED**

### Summary

All acceptance criteria have been implemented and verified with evidence. All 17 tasks/subtasks marked as complete have been verified against the codebase. Code follows project patterns, styling matches the dark theme design system, and test coverage is appropriate. Implementation uses a clean, unified approach with a single `openDocument` function handling both legal documents.

### Key Findings

**No HIGH or MEDIUM severity issues found.**

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| 1 | Privacy Policy opens in browser when tapped from Settings | IMPLEMENTED | `legal.tsx:8,37-43,64-81` |
| 2 | Terms of Service opens in browser when tapped | IMPLEMENTED | `legal.tsx:9,27-33,37-43` |

**Summary: 2 of 2 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Create Legal Screen UI | Complete | VERIFIED | `legal.tsx:1-191` |
| - Create app/legal.tsx | Complete | VERIFIED | File exists |
| - Privacy Policy menu item | Complete | VERIFIED | `legal.tsx:19-26` |
| - ToS menu item | Complete | VERIFIED | `legal.tsx:27-33` |
| - Dark theme styling | Complete | VERIFIED | `legal.tsx:98-145` |
| - Descriptive text | Complete | VERIFIED | `legal.tsx:58-60,87-90` |
| Task 2: Document Opening | Complete | VERIFIED | `legal.tsx:37-43` |
| - Import expo-linking | Complete | VERIFIED | `legal.tsx:5` |
| - openURL functions | Complete | VERIFIED | `legal.tsx:37-43` (unified) |
| - Error handling | Complete | VERIFIED | `legal.tsx:41` |
| - Placeholder URLs | Complete | VERIFIED | `legal.tsx:8-9` |
| Task 3: Accounts Navigation | Complete | VERIFIED | `accounts.tsx:296-314` |
| - Legal section | Complete | VERIFIED | `accounts.tsx:297-298` |
| - document-text icon | Complete | VERIFIED | `accounts.tsx:305` |
| - Navigate to legal.tsx | Complete | VERIFIED | `accounts.tsx:301` |
| - Position below Preferences | Complete | VERIFIED | Section order verified |
| Task 4: Unit Tests | Complete | VERIFIED | `legal.test.ts` (8 tests) |

**Summary: 17 of 17 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

- **8 tests** in `legal.test.ts` covering:
  - URL constant correctness
  - Privacy Policy URL opening
  - Terms of Service URL opening
  - Error handling for both documents
- All **317 tests passing**
- No gaps identified

### Architectural Alignment

- Uses `expo-linking` as specified in tech-spec
- Follows Expo Router file-based navigation pattern
- Dark theme colors match architecture document (#09090B, #18181B, #27272A)
- Consistent with accounts.tsx menu card pattern

### Security Notes

- No security concerns - URLs are hardcoded public placeholders
- No sensitive data handling in this feature

### Best-Practices and References

- Implementation follows React Native best practices for external links
- Proper error handling with user-friendly Alert messages
- TypeScript interfaces for type safety

### Action Items

**Advisory Notes:**
- Note: Update placeholder URLs (https://giglet.app/privacy, https://giglet.app/terms) before production release
- Note: Consider extracting URL constants to a config file for centralized management
