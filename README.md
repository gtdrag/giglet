# Giglet

**Stop guessing. Start earning.**

Giglet is a mobile application for food delivery drivers that provides real-time location intelligence, automatic earnings tracking, and mileage logging for tax deductions.

## Features

- **Focus Zones** - Real-time map showing the best areas to earn based on restaurant density, weather, events, and more
- **Earnings Dashboard** - Unified view of earnings across DoorDash and Uber Eats
- **Mileage Tracking** - Automatic GPS-based mileage tracking for tax deductions
- **Tax Export** - Export mileage logs and earnings summaries for tax purposes (Pro)

## Prerequisites

- **Node.js** 22.x or later
- **npm** 10.x or later
- **iOS Simulator** (for iOS development, macOS only)
- **Android Emulator** or physical device (for Android development)
- **Expo CLI** (installed globally or via npx)

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/giglet.git
cd giglet
npm install
```

### 2. Set Up Environment Variables

```bash
# API
cp apps/api/.env.example apps/api/.env

# Mobile (optional - defaults work for local dev)
cp apps/mobile/.env.example apps/mobile/.env
```

Edit the `.env` files with your configuration.

### 3. Start Development Servers

**Start the API:**
```bash
npm run dev:api
```

**Start the mobile app:**
```bash
npm run dev:mobile
```

Then press `i` for iOS Simulator or `a` for Android Emulator.

## Project Structure

```
giglet/
├── apps/
│   ├── mobile/          # Expo/React Native mobile app
│   │   ├── app/         # Expo Router screens
│   │   ├── src/         # Source code
│   │   └── assets/      # Images, fonts
│   └── api/             # Express backend API
│       ├── src/         # Source code
│       └── prisma/      # Database schema
├── packages/            # Shared code (future)
├── docs/                # Documentation
└── package.json         # Monorepo root
```

## Available Scripts

### Root Level

| Script | Description |
|--------|-------------|
| `npm run dev:api` | Start API in development mode |
| `npm run dev:mobile` | Start mobile app (Expo) |
| `npm run lint` | Run ESLint on all apps |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run typecheck` | Run TypeScript checks |

### Mobile App (`apps/mobile`)

| Script | Description |
|--------|-------------|
| `npm run start` | Start Expo dev server |
| `npm run ios` | Start on iOS Simulator |
| `npm run android` | Start on Android Emulator |

### API (`apps/api`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production build |

## Technology Stack

### Mobile
- Expo SDK 54 / React Native
- TypeScript
- Expo Router (file-based routing)
- Zustand (state management)

### Backend
- Node.js 22 LTS
- Express
- TypeScript
- Prisma (ORM)
- PostgreSQL + PostGIS

### Infrastructure
- Railway (API hosting)
- EAS Build (mobile builds)

## Documentation

- [Architecture](docs/architecture.md) - Technical architecture and patterns
- [PRD](docs/PRD.md) - Product requirements document
- [Epics](docs/epics.md) - Epic and story breakdown
- [UX Design](docs/ux-design-specification.md) - Design system and UX patterns

## Contributing

This is a private project. Please contact the maintainer for contribution guidelines.

## License

UNLICENSED - Private project
