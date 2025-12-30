# Story 1.1: Project Scaffolding and Repository Setup

**Epic:** 1 - Foundation & Infrastructure
**Story ID:** 1.1
**Status:** done
**Priority:** P0
**Created:** 2025-12-30

---

## User Story

**As a** developer,
**I want** a properly structured mobile app and backend repository,
**So that** I can begin building features on a solid foundation.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Mobile app builds successfully for iOS simulator | `cd apps/mobile && npm run ios` succeeds |
| AC2 | Mobile app builds successfully for Android emulator | `cd apps/mobile && npm run android` succeeds |
| AC3 | Backend API starts locally | `cd apps/api && npm run dev` starts server on port 3000 |
| AC4 | ESLint configured and passing | `npm run lint` passes with no errors |
| AC5 | Prettier configured for consistent formatting | `npm run format:check` passes |
| AC6 | TypeScript configured for both projects | `npm run typecheck` passes |
| AC7 | README contains setup instructions | README.md exists with clear setup steps |
| AC8 | Git repository initialized with proper .gitignore | `.gitignore` excludes node_modules, .env, build artifacts |
| AC9 | Monorepo structure matches architecture spec | Folder structure matches `docs/architecture.md` |

---

## Tasks

### Task 1: Initialize Monorepo Structure
**Estimated:** 30 min

- [x] Create root `package.json` with workspaces configuration
- [x] Create folder structure:
  ```
  giglet/
  ├── apps/
  │   ├── mobile/
  │   └── api/
  ├── packages/          # Shared code (future)
  ├── docs/
  ├── .gitignore
  ├── package.json
  ├── tsconfig.base.json
  └── README.md
  ```
- [x] Configure npm/yarn workspaces
- [x] Create root `.gitignore` with comprehensive exclusions

### Task 2: Initialize Expo Mobile App
**Estimated:** 45 min

- [x] Run `npx create-expo-app@latest apps/mobile --template expo-template-blank-typescript`
- [x] Update to Expo SDK 54 (latest)
- [x] Configure `app.json` with Giglet branding:
  - Name: "Giglet"
  - Slug: "giglet"
  - iOS bundleIdentifier: "app.giglet.driver"
  - Android package: "app.giglet.driver"
- [x] Set up Expo Router file-based routing:
  - Install `expo-router`
  - Create `app/` directory structure per architecture
  - Configure `app/_layout.tsx` root layout
  - Configure `app/index.tsx` entry redirect
- [x] Create placeholder screens:
  - `app/(auth)/login.tsx`
  - `app/(tabs)/_layout.tsx`
  - `app/(tabs)/zones.tsx`
  - `app/(tabs)/earnings.tsx`
  - `app/(tabs)/mileage.tsx`
  - `app/(tabs)/settings.tsx`
- [x] Configure `tsconfig.json` with path aliases (`@/` → `src/`)
- [x] Verify iOS build: `npx expo run:ios`
- [x] Verify Android build: `npx expo run:android`

### Task 3: Initialize Express Backend API
**Estimated:** 45 min

- [x] Create `apps/api/` directory
- [x] Initialize with `npm init -y`
- [x] Install dependencies:
  ```bash
  npm install express cors helmet dotenv
  npm install -D typescript @types/node @types/express ts-node nodemon
  ```
- [x] Create `tsconfig.json` for API (CommonJS module for ts-node compatibility)
- [x] Create folder structure per architecture:
  ```
  apps/api/
  ├── src/
  │   ├── routes/
  │   │   └── index.ts
  │   ├── middleware/
  │   │   └── error.middleware.ts
  │   ├── services/
  │   ├── utils/
  │   │   └── logger.ts
  │   ├── config/
  │   │   └── index.ts
  │   ├── app.ts
  │   └── server.ts
  ├── prisma/
  │   └── schema.prisma (placeholder)
  ├── package.json
  └── tsconfig.json
  ```
- [x] Create `src/app.ts` with Express setup:
  - CORS middleware
  - Helmet security headers
  - JSON body parser
  - Health endpoint: `GET /health`
- [x] Create `src/server.ts` entry point
- [x] Add npm scripts: `dev`, `build`, `start`
- [x] Verify API starts: `npm run dev`

### Task 4: Configure ESLint
**Estimated:** 20 min

- [x] Install ESLint at root:
  ```bash
  npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
  ```
- [x] Create root `eslint.config.js` (ESLint 9 flat config format)
- [x] Add mobile-specific ESLint extends for React Native
- [x] Add Node.js globals for API files
- [x] Add root script: `"lint": "eslint apps --ext .ts,.tsx"`
- [x] Fix any lint errors in generated code
- [x] Verify: `npm run lint` passes

### Task 5: Configure Prettier
**Estimated:** 15 min

- [x] Install Prettier at root:
  ```bash
  npm install -D prettier eslint-config-prettier
  ```
- [x] Create `.prettierrc`
- [x] Create `.prettierignore`
- [x] Add root scripts: `"format"`, `"format:check"`
- [x] Format existing files: `npm run format`
- [x] Verify: `npm run format:check` passes

### Task 6: Create README with Setup Instructions
**Estimated:** 15 min

- [x] Create comprehensive `README.md`:
  - Project description
  - Prerequisites (Node 22, npm, Expo CLI, iOS Simulator/Android Emulator)
  - Quick start guide
  - Available scripts
  - Project structure overview
  - Link to architecture docs
- [x] Include environment setup instructions
- [x] Add badges (optional)

### Task 7: Create Environment Configuration
**Estimated:** 15 min

- [x] Create `apps/api/.env.example`
- [x] Create `apps/mobile/.env.example`
- [x] Add `.env` to `.gitignore`
- [x] Document env vars in README

### Task 8: Verify Complete Setup
**Estimated:** 15 min

- [x] Run `npm install` at root
- [x] Verify API starts with health endpoint responding
- [x] Verify lint passes
- [x] Verify format check passes
- [x] Verify TypeScript compiles

---

## Technical Notes

### Technology Stack (from Architecture)
- **Mobile:** Expo SDK 52, React Native 0.76, TypeScript 5.x, Expo Router 4.x
- **Backend:** Node.js 22 LTS, Express 4.x, TypeScript 5.x
- **ORM:** Prisma 6.x (schema placeholder only in this story)
- **Database:** PostgreSQL 17 + PostGIS (setup in Story 1.2)

### File Naming Conventions
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Routes: `kebab-case.routes.ts`
- Services: `kebab-case.service.ts`

### Import Order (enforce via ESLint)
1. React/React Native
2. Third-party libraries
3. Internal aliases (`@/`)
4. Relative imports

### Key Configuration Files
| File | Purpose |
|------|---------|
| `apps/mobile/app.json` | Expo configuration |
| `apps/mobile/tsconfig.json` | Mobile TypeScript config |
| `apps/api/tsconfig.json` | API TypeScript config |
| `.eslintrc.js` | Linting rules |
| `.prettierrc` | Formatting rules |

---

## Dependencies

### Prerequisites
- None (first story in project)

### Blockers
- None

### Enables
- Story 1.2: Database Schema and ORM Setup
- Story 1.3: CI/CD Pipeline Configuration
- Story 1.4: Core Navigation and App Shell
- Story 1.5: API Foundation and Health Endpoints

---

## Definition of Done

- [x] All acceptance criteria verified
- [x] All tasks completed
- [x] Code passes lint and format checks
- [x] Fresh clone builds successfully for mobile and API
- [x] README provides clear setup instructions
- [x] No hardcoded secrets or credentials
- [x] Story marked as `done` in sprint-status.yaml

---

## Dev Notes

### Learnings from Previous Story
First story in epic - no predecessor context.

### Architecture References
- Project structure: `docs/architecture.md` § "Project Structure"
- File naming: `docs/architecture.md` § "Implementation Patterns for AI Agents"
- Environment variables: `docs/architecture.md` § "Environment Variables"

### Gotchas to Watch For
- Expo SDK 52 requires Node 18+ (we use Node 22)
- Expo Router 4.x has different file conventions than 3.x
- Path aliases need both `tsconfig.json` and bundler config (metro.config.js)
- ESLint flat config vs legacy config - use legacy for broader compatibility

---

## Dev Agent Record

### Completion Notes
- [x] Monorepo with npm workspaces established
- [x] Expo SDK 54 with React Native 0.81 and Expo Router configured
- [x] Express 4.x with TypeScript and CommonJS module resolution
- [x] ESLint 9 flat config format used instead of legacy `.eslintrc.js`
- [x] All verification tests pass (lint, format, TypeScript, API health check)

### Debug Log
- [x] **Issue:** ts-node couldn't resolve modules with `.js` extensions
  **Solution:** Changed tsconfig from NodeNext to CommonJS module, removed `.js` extensions from imports
- [x] **Issue:** ESLint didn't recognize Node.js globals (process, console) in API
  **Solution:** Added explicit globals configuration in eslint.config.js for API files
- [x] **Issue:** Missing runtime dependencies (express, cors, helmet)
  **Solution:** Added dependencies to apps/api/package.json

### File List
| Action | File Path | Notes |
|--------|-----------|-------|
| NEW | package.json | Root monorepo config with workspaces |
| NEW | tsconfig.base.json | Shared TypeScript config |
| NEW | .gitignore | Comprehensive exclusions |
| NEW | .prettierrc | Code formatting config |
| NEW | .prettierignore | Formatter exclusions |
| NEW | eslint.config.js | ESLint 9 flat config |
| NEW | README.md | Setup documentation |
| NEW | apps/mobile/ | Complete Expo app with router |
| NEW | apps/api/ | Complete Express API with health endpoint |

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-30 | George | Story drafted from epics.md |
| 2025-12-30 | Claude | Story implemented and verified |
