# Story 6.1: Location Permission and Tracking Enable

Status: done

## Story

**As a** user,
**I want** to enable automatic mileage tracking,
**So that** my miles are logged without manual entry.

## Acceptance Criteria

1. **Given** I am setting up mileage tracking, **When** I tap "Enable Automatic Tracking", **Then** I see clear explanation of why location is needed **And** I am prompted for location permission ("Always Allow") **And** if granted, tracking is enabled and indicator shown

2. **Given** I deny location permission, **When** I try to use mileage tracking, **Then** I see explanation of limitations **And** I can enable manual-only mode **And** I have option to open settings to grant permission

## Prerequisites

- Story 1.4 (Core Navigation and App Shell) - Complete

## Tasks / Subtasks

- [x] Task 1: Create Mileage Tab Screen Shell (AC: 1, 2)
  - [x] Create `apps/mobile/app/(tabs)/mileage.tsx` basic screen
  - [x] Add mileage tab to bottom navigation with appropriate icon
  - [x] Create initial "Enable Tracking" card UI for first-time users
  - [x] Apply dark theme styling consistent with zones tab

- [x] Task 2: Create Permission Explanation Modal (AC: 1)
  - [x] Create modal component (inline in mileage.tsx)
  - [x] Display clear explanation of why "Always Allow" is needed for background tracking
  - [x] Include icon/illustration showing tracking in action
  - [x] Add "Enable Tracking" and "Not Now" buttons
  - [x] Explain the tax deduction benefit

- [x] Task 3: Implement Location Permission Request (AC: 1)
  - [x] expo-location already installed
  - [x] Install `expo-task-manager` for background task registration
  - [x] Request `Location.requestBackgroundPermissionsAsync()`
  - [x] Handle iOS "Always Allow" vs "While Using" distinction
  - [x] Handle Android `ACCESS_BACKGROUND_LOCATION` permission
  - [x] Request foreground permission first, then background

- [x] Task 4: Create Tracking Indicator (AC: 1)
  - [x] Show small indicator (green dot) when tracking is active
  - [x] Display in segmented control next to "Mileage" label
  - [x] Style: green dot matching design system

- [x] Task 5: Implement Permission Denied Flow (AC: 2)
  - [x] Create Manual Mode Card (inline in mileage.tsx)
  - [x] Show explanation of what manual mode means (limited features)
  - [x] Add "Open Settings" button using `Linking.openSettings()`
  - [x] Show "Use Manual Mode" option
  - [x] Explain limitations (no automatic tracking, manual entry only)

- [x] Task 6: Create Mileage Store (Zustand) (AC: 1, 2)
  - [x] Create `apps/mobile/src/stores/mileageStore.ts`
  - [x] Store `trackingEnabled: boolean` state
  - [x] Store `permissionStatus: 'granted' | 'denied' | 'undetermined'`
  - [x] Persist tracking preference to AsyncStorage
  - [x] Add actions: `enableTracking()`, `disableTracking()`, `checkPermission()`

- [x] Task 7: Wire Up Full Permission Flow (AC: 1, 2)
  - [x] On tap "Enable Tracking": show explanation modal
  - [x] On modal confirm: request permission
  - [x] If granted: update store, show indicator (background task deferred to 6.2)
  - [x] If denied: show manual mode card
  - [x] Re-check permission on tab focus (user may have changed in settings)

## Dev Notes

### Technical Approach

- Use `expo-location` for permission requests (`requestBackgroundPermissionsAsync`)
- Use `expo-task-manager` for future background task registration (placeholder in this story)
- Store tracking state in Zustand with AsyncStorage persistence
- Background task implementation deferred to Story 6.2

### iOS Permission Flow

iOS has a two-step permission flow for background location:
1. First request shows "While Using" / "Don't Allow"
2. If user selects "While Using", app can later request upgrade to "Always"
3. Need to handle both scenarios gracefully

### Android Permission Flow

Android API 29+ requires explicit `ACCESS_BACKGROUND_LOCATION` permission:
1. First request foreground permission
2. Then request background permission separately
3. Android 10+ shows additional system dialog explaining background access

### Project Structure Notes

- New tab screen: `apps/mobile/app/(tabs)/mileage.tsx`
- New store: `apps/mobile/src/stores/mileageStore.ts`
- Updated layout: `apps/mobile/app/(tabs)/_layout.tsx`
- Follows existing patterns from zones tab implementation

### References

- [Source: docs/epics.md#Story-6.1] - Acceptance criteria and technical notes
- [Source: .bmad-ephemeral/stories/tech-spec-epic-6.md#Story-6.1] - Technical specification
- [Source: docs/architecture.md#Background-Location-Tracking] - Permission patterns

### Learnings from Previous Story

**From Story 5-8-zone-score-refresh-and-real-time-updates (Status: done)**

- **AppState Pattern**: Use `AppState` from react-native to detect foreground/background - useful for battery-efficient tracking
- **formatRelativeTime Utility**: Available in index.tsx for relative time display - consider extracting to shared utils
- **ActivityIndicator Pattern**: Show loading state during async operations
- **Zustand Store Pattern**: Follow existing store patterns (authStore, zonesStore if any)

[Source: docs/stories/5-8-zone-score-refresh-and-real-time-updates.md#Dev-Agent-Record]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Installed expo-task-manager for background task registration
- TypeScript compilation passed with no errors

### Completion Notes List

- Created Mileage tab as third segment in bottom navigation bar
- Permission explanation modal explains "Always Allow" requirement with 3 benefit cards
- Store handles foreground + background permission flow sequentially
- Green dot indicator shows in tab bar when tracking is enabled
- Manual mode card shows when permission denied with "Open Settings" button
- Permission re-checked when Mileage tab is focused (handles user changing settings)
- Background task registration placeholder in place (will be implemented in Story 6.2)
- All UI follows dark theme design system (#09090B, #18181B, #27272A colors)

### File List

- apps/mobile/app/(tabs)/mileage.tsx (NEW)
- apps/mobile/app/(tabs)/_layout.tsx (MODIFIED)
- apps/mobile/src/stores/mileageStore.ts (NEW)
- apps/mobile/package.json (MODIFIED - added expo-task-manager)

---

## Senior Developer Review

**Reviewer:** Claude Opus 4.5
**Date:** 2026-01-03
**Verdict:** ✅ APPROVED

### Acceptance Criteria Verification

#### AC1: Enable Tracking Flow ✅
| Requirement | Evidence |
|-------------|----------|
| Tap "Enable Automatic Tracking" shows explanation | `mileage.tsx:120-129` - button triggers `handleEnableTracking` which shows modal |
| Clear explanation of why location needed | `mileage.tsx:189-193` - "To automatically track your mileage while you deliver, Giglet needs 'Always Allow' location permission" |
| Prompted for location permission | `mileageStore.ts:113,125` - sequential foreground then background permission requests |
| If granted, tracking enabled | `mileageStore.ts:137-144` - sets `trackingEnabled: true` and persists to AsyncStorage |
| Indicator shown | `_layout.tsx:74,126-131` - green dot (#22C55E) next to "Mileage" label |

#### AC2: Permission Denied Flow ✅
| Requirement | Evidence |
|-------------|----------|
| Explanation of limitations | `mileage.tsx:140-143` - "Location permission was not granted. You can still log trips manually, but automatic tracking won't work." |
| Manual-only mode option | `mileage.tsx:149-152` - "Add Trip Manually" button in denied card |
| Option to open settings | `mileage.tsx:37-39,145-148` - `Linking.openSettings()` via "Open Settings" button |

### Task Verification

| Task | Status | Evidence |
|------|--------|----------|
| Task 1: Mileage Tab Screen Shell | ✅ | `mileage.tsx` (639 lines), `_layout.tsx:66-76` tab segment |
| Task 2: Permission Explanation Modal | ✅ | `mileage.tsx:178-227` modal with 3 benefit cards |
| Task 3: Location Permission Request | ✅ | `mileageStore.ts:108-158` with foreground→background flow |
| Task 4: Tracking Indicator | ✅ | `_layout.tsx:74` green dot, `_layout.tsx:126-131` styles |
| Task 5: Permission Denied Flow | ✅ | `mileage.tsx:134-155` manual mode card, `mileage.tsx:229-262` info modal |
| Task 6: Mileage Store (Zustand) | ✅ | `mileageStore.ts` (181 lines) with all required state/actions |
| Task 7: Full Permission Flow | ✅ | `_layout.tsx:21-25` re-check on tab focus, `mileage.tsx:28-35` flow wiring |

**Subtasks:** 26/26 verified ✅
**Falsely Marked:** 0

### Code Quality Notes

**Strengths:**
- Clean separation: UI in mileage.tsx, state management in mileageStore.ts
- Proper sequential permission flow (foreground first, then background)
- Permission re-checked on tab focus handles user changing settings externally
- AsyncStorage persistence ensures tracking state survives app restarts
- Graceful degradation to manual mode when permission denied
- Consistent dark theme styling (#09090B, #18181B, #27272A)

**Minor Observations:**
- Background task registration correctly deferred to Story 6.2 (placeholder comment at `mileageStore.ts:146-147`)
- expo-task-manager installed but not yet used (appropriate for this story's scope)

### Recommendation

Story is **ready for DONE status**. All acceptance criteria met with proper evidence. Implementation follows existing patterns and is well-structured for the subsequent background tracking story.
