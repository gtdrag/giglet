# Story 2.6: Onboarding Flow

**Epic:** 2 - User Authentication
**Story ID:** 2.6
**Status:** done
**Priority:** P0
**Created:** 2026-01-01

---

## User Story

**As a** new user,
**I want** a brief introduction to Giglet's features,
**So that** I understand the app's value before diving in.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | 3-4 screen onboarding walkthrough shown after registration | Screens display in sequence |
| AC2 | Each screen highlights a key feature | Focus Zones, Earnings, Mileage screens |
| AC3 | Skip button available on each screen | Tapping Skip goes to main app |
| AC4 | Final screen has CTA to connect accounts | "Get Started" button visible |
| AC5 | Onboarding not shown on subsequent logins | Flag stored in user profile |
| AC6 | Horizontal swipe navigation works | Pager/carousel behavior |

---

## Tasks

### Task 1: Add onboardingCompleted flag to User
- [x] Add field to Prisma schema (or use local storage)
- [x] Update user service to track onboarding status

### Task 2: Create Onboarding Screen Components
- [x] Create OnboardingScreen component with horizontal pager
- [x] Create 3 slides: Focus Zones, Earnings, Mileage
- [x] Add pagination dots indicator
- [x] Add Skip button on each slide
- [x] Add Get Started button on final slide

### Task 3: Integrate Onboarding into Navigation
- [x] Show onboarding after registration if not completed
- [x] Skip onboarding on subsequent logins
- [x] Navigate to main app after completion/skip

### Task 4: Style and Polish
- [x] Add illustrations or icons for each feature
- [x] Ensure smooth swipe transitions
- [x] Match app theme (dark mode)

---

## Technical Notes

### Onboarding Slides
1. **Focus Zones** - "Find the hottest delivery zones"
2. **Earnings** - "Track all your earnings in one place"
3. **Mileage** - "Automatic mileage tracking for taxes"

### Implementation Approach
- Use react-native-pager-view or similar for swipe behavior
- Store onboarding_completed in AsyncStorage (simpler than backend)
- Check flag on app launch and after registration

---

## Dependencies

### Prerequisites
- Story 2.1: Email/Password Registration (completed)
- Story 2.2: Email/Password Login (completed)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-01 | Claude | Story created |
| 2026-01-01 | Claude | Implementation complete |
