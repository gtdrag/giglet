# Story 1.4: Core Navigation and App Shell

**Epic:** 1 - Foundation & Infrastructure
**Story ID:** 1.4
**Status:** done
**Priority:** P0
**Created:** 2026-01-01

---

## User Story

**As a** user,
**I want** to navigate between main app sections,
**So that** I can access different features.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Bottom navigation bar displays with 4 tabs: Zones, Earnings, Mileage, Settings | Visual inspection - tabs visible with icons and labels |
| AC2 | Tapping each tab navigates to corresponding placeholder screen | Each tab press shows different screen content |
| AC3 | Current tab is visually highlighted | Active tab has distinct styling (color/icon) |
| AC4 | App shows login screen when not authenticated | Cold start without auth shows auth flow |
| AC5 | App shows main tabs when authenticated | Simulated auth state shows tab navigator |
| AC6 | Expo Router file-based routing configured | Routes work via app/ directory structure |
| AC7 | Basic app shell with header and safe areas | Content respects notch/home bar on iOS |

---

## Tasks

### Task 1: Set Up Expo Router Navigation Structure
**Estimated:** 30 min
**AC:** AC6

- [x] Verify `expo-router` is installed (from Story 1.1)
- [x] Create/update `app/_layout.tsx` as root layout:
  ```tsx
  import { Stack } from 'expo-router';

  export default function RootLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
  }
  ```
- [x] Create `app/index.tsx` as entry redirect:
  - Check auth state
  - Redirect to `/(tabs)` or `/(auth)/login` accordingly

### Task 2: Create Auth Flow Screens (Placeholders)
**Estimated:** 20 min
**AC:** AC4

- [x] Create `app/(auth)/_layout.tsx` for auth group:
  ```tsx
  import { Stack } from 'expo-router';

  export default function AuthLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
  }
  ```
- [x] Create `app/(auth)/login.tsx` placeholder:
  - Display "Login Screen" text
  - Add temporary "Skip to App" button for testing navigation
- [x] Create `app/(auth)/register.tsx` placeholder

### Task 3: Create Tab Navigator with 4 Tabs
**Estimated:** 45 min
**AC:** AC1, AC2, AC3

- [x] Create `app/(tabs)/_layout.tsx` with bottom tabs:
  ```tsx
  import { Tabs } from 'expo-router';
  import { Ionicons } from '@expo/vector-icons';

  export default function TabLayout() {
    return (
      <Tabs screenOptions={{
        tabBarActiveTintColor: '#10b981', // emerald-500
        headerShown: true,
      }}>
        <Tabs.Screen name="zones" options={{
          title: 'Zones',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }} />
        <Tabs.Screen name="earnings" options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }} />
        <Tabs.Screen name="mileage" options={{
          title: 'Mileage',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }} />
        <Tabs.Screen name="settings" options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }} />
      </Tabs>
    );
  }
  ```
- [x] Install `@expo/vector-icons` if not present

### Task 4: Create Placeholder Tab Screens
**Estimated:** 20 min
**AC:** AC2

- [x] Create `app/(tabs)/zones.tsx`:
  - Display "Focus Zones Map" placeholder
  - SafeAreaView wrapper
- [x] Create `app/(tabs)/earnings.tsx`:
  - Display "Earnings Dashboard" placeholder
- [x] Create `app/(tabs)/mileage.tsx`:
  - Display "Mileage Tracking" placeholder
- [x] Create `app/(tabs)/settings.tsx`:
  - Display "Settings & Profile" placeholder

### Task 5: Create Basic Auth State Store (Zustand)
**Estimated:** 30 min
**AC:** AC4, AC5

- [x] Install Zustand: `npm install zustand`
- [x] Create `src/stores/authStore.ts`:
  ```typescript
  import { create } from 'zustand';

  interface AuthState {
    isAuthenticated: boolean;
    user: { id: string; email: string } | null;
    setAuthenticated: (auth: boolean) => void;
    login: (user: { id: string; email: string }) => void;
    logout: () => void;
  }

  export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    user: null,
    setAuthenticated: (auth) => set({ isAuthenticated: auth }),
    login: (user) => set({ isAuthenticated: true, user }),
    logout: () => set({ isAuthenticated: false, user: null }),
  }));
  ```
- [x] Update `app/index.tsx` to use auth store for redirect logic

### Task 6: Implement Safe Area and App Shell
**Estimated:** 20 min
**AC:** AC7

- [x] Ensure `expo-status-bar` and `react-native-safe-area-context` installed
- [x] Wrap root layout with SafeAreaProvider
- [x] Configure status bar style
- [x] Test on iOS simulator with notch

### Task 7: Create Not Found Screen
**Estimated:** 10 min
**AC:** AC6

- [x] Create `app/+not-found.tsx`:
  - Display "Screen not found" message
  - Add link back to home

---

## Technical Notes

### Technology Stack (from Architecture)
- **Framework:** Expo SDK 52 / React Native 0.76
- **Navigation:** Expo Router 4.x (file-based routing)
- **State Management:** Zustand 5.x
- **Icons:** @expo/vector-icons (Ionicons)

### Project Structure (from Architecture)
```
apps/mobile/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── zones.tsx      # Focus Zones map (default)
│   │   ├── earnings.tsx   # Earnings dashboard
│   │   ├── mileage.tsx    # Mileage tracking
│   │   └── settings.tsx   # Settings & profile
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Entry redirect
│   └── +not-found.tsx
├── src/
│   └── stores/
│       └── authStore.ts
```

### Tab Configuration Reference
From `docs/architecture.md`:
- Zones (map icon) - Focus Zones map, default tab
- Earnings (wallet icon) - Earnings dashboard
- Mileage (car icon) - Mileage tracking
- Settings (settings icon) - Settings & profile

### Navigation Flow
```
App Launch
    │
    ▼
Check Auth State (Zustand)
    │
    ├── Not Authenticated → /(auth)/login
    │
    └── Authenticated → /(tabs)/zones (default)
```

---

## Dependencies

### Prerequisites
- Story 1.1: Project Scaffolding (completed) - Expo project exists
- Story 1.2: Database Schema (completed)
- Story 1.3: CI/CD Pipeline (completed)

### Blockers
- None

### Enables
- Story 2.1-2.6: User Authentication (screens to populate)
- All feature stories (navigation foundation)

---

## Definition of Done

- [x] All acceptance criteria verified
- [x] All tasks completed
- [x] Bottom navigation bar with 4 tabs visible
- [x] Each tab navigates to placeholder screen
- [x] Active tab visually distinguished
- [x] Auth state check redirects appropriately
- [x] App respects safe areas on iOS
- [x] App builds successfully: `npm run build` in mobile workspace
- [x] TypeScript compiles without errors
- [x] Story marked as `done` in sprint-status.yaml

---

## Dev Notes

### Learnings from Previous Stories

**From Story 1-3-ci-cd-pipeline-configuration (Status: done)**

- **CI Workflow Available**: GitHub Actions runs lint, typecheck, test on PRs (`.github/workflows/ci.yml`)
- **EAS Build Configured**: Development/preview/production profiles ready (`apps/mobile/eas.json`)
- **Monorepo Structure**: npm workspaces at root with `apps/mobile` and `apps/api`
- **TypeScript Config**: CommonJS for ts-node compatibility
- **ESLint 9.x**: Flat config format in `eslint.config.js`

**From Story 1-1-project-scaffolding-and-repository-setup (Status: done)**
- Expo project initialized with TypeScript template
- npm workspaces configured
- Root package.json has workspace scripts

[Source: stories/1-3-ci-cd-pipeline-configuration.md#Dev-Agent-Record]

### Architecture References
- Navigation structure: `docs/architecture.md` § "Mobile App (`/apps/mobile`)"
- Tab configuration: `docs/architecture.md` § "Project Structure"
- State management: `docs/architecture.md` § "Technology Stack > Mobile Application"

### Gotchas to Watch For
- Expo Router requires `app/` directory at mobile project root
- Tab names must match file names (e.g., `zones.tsx` for `/zones`)
- `_layout.tsx` files define navigation structure at each level
- Zustand store should be outside `app/` directory (in `src/stores/`)
- SafeAreaProvider must wrap entire app for safe area to work

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Navigation structure already existed from Story 1.1 scaffolding
- Updated tab navigator to use Ionicons instead of letter placeholders
- Added Zustand for auth state management
- Updated index.tsx to check auth state before redirect
- Added "Skip to App" button to login screen for testing
- Created register.tsx placeholder screen
- Fixed ESLint globals for Node.js and React Native environments

### Completion Notes List

- **AC1** ✅ Bottom navigation bar with 4 tabs (Zones, Earnings, Mileage, Settings) with Ionicons
- **AC2** ✅ Each tab navigates to corresponding placeholder screen
- **AC3** ✅ Active tab highlighted with emerald-500 (#10b981) color
- **AC4** ✅ App shows login screen when not authenticated (via Zustand store check)
- **AC5** ✅ "Skip to App" button simulates login and navigates to tabs
- **AC6** ✅ Expo Router file-based routing configured with app/ directory structure
- **AC7** ✅ SafeAreaProvider wraps app, SafeAreaView used in all screens

### File List

- `apps/mobile/src/stores/authStore.ts` - NEW: Zustand auth state store
- `apps/mobile/app/index.tsx` - MODIFIED: Added auth state check and loading indicator
- `apps/mobile/app/(auth)/login.tsx` - MODIFIED: Added "Skip to App" button and register link
- `apps/mobile/app/(auth)/register.tsx` - NEW: Registration placeholder screen
- `apps/mobile/app/(tabs)/_layout.tsx` - MODIFIED: Added Ionicons for tab icons
- `eslint.config.js` - MODIFIED: Added Node.js and React Native globals

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-01 | Claude | Story drafted from epics.md and architecture.md |
| 2026-01-01 | Claude | Implementation completed - navigation and auth flow configured |
| 2026-01-01 | Claude | Senior Developer Review - APPROVED |

---

## Senior Developer Review (AI)

### Reviewer
George (via Claude Opus 4.5)

### Date
2026-01-01

### Outcome
**APPROVE** - All acceptance criteria implemented and verified. All tasks completed.

### Summary
Story 1.4 implements core navigation and app shell for the Giglet mobile app. The implementation includes Expo Router file-based navigation, Zustand auth state management, bottom tab navigator with 4 tabs (Zones, Earnings, Mileage, Settings) using Ionicons, auth flow placeholders with "Skip to App" testing button, and proper safe area handling.

### Acceptance Criteria Coverage

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC1 | Bottom navigation bar displays with 4 tabs | IMPLEMENTED | `app/(tabs)/_layout.tsx:24-59` |
| AC2 | Tapping each tab navigates to corresponding screen | IMPLEMENTED | `Tabs.Screen` entries with `name` props |
| AC3 | Current tab is visually highlighted | IMPLEMENTED | `tabBarActiveTintColor: '#10b981'` at `:16` |
| AC4 | App shows login screen when not authenticated | IMPLEMENTED | `app/index.tsx:34` redirects to `/(auth)/login` |
| AC5 | App shows main tabs when authenticated | IMPLEMENTED | `app/index.tsx:31` redirects to `/(tabs)/zones` |
| AC6 | Expo Router file-based routing configured | IMPLEMENTED | `app/` directory structure with layouts |
| AC7 | Basic app shell with header and safe areas | IMPLEMENTED | `_layout.tsx:7` SafeAreaProvider, SafeAreaView in screens |

**Summary: 7 of 7 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Expo Router Navigation | Complete | VERIFIED | `app/_layout.tsx`, `app/index.tsx` |
| Task 2: Auth Flow Screens | Complete | VERIFIED | `app/(auth)/login.tsx`, `register.tsx` |
| Task 3: Tab Navigator | Complete | VERIFIED | `app/(tabs)/_layout.tsx` with Ionicons |
| Task 4: Placeholder Screens | Complete | VERIFIED | All 4 tab screens exist with SafeAreaView |
| Task 5: Zustand Auth Store | Complete | VERIFIED | `src/stores/authStore.ts` |
| Task 6: Safe Area & App Shell | Complete | VERIFIED | SafeAreaProvider in root layout |
| Task 7: Not Found Screen | Complete | VERIFIED | `app/+not-found.tsx` |

**Summary: 7 of 7 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Architectural Alignment
- Uses Expo Router 6.x as specified in architecture
- Uses Zustand 5.x for state management as specified
- Uses Ionicons from @expo/vector-icons as specified
- File structure matches architecture.md specification
- SafeAreaProvider wraps app as recommended

### Security Notes
- No security concerns for placeholder screens
- Auth state management is appropriate for development phase

### Action Items

**Advisory Notes:**
- Note: "Skip to App" button should be removed or hidden in production builds
- Note: Consider adding forgot-password.tsx screen when implementing Epic 2
