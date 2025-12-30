# Giglet - Architecture Document

**Author:** George
**Date:** 2024-12-30
**Version:** 1.0

---

## Overview

This document defines the technical architecture for Giglet, a mobile application for food delivery drivers. It serves as the single source of truth for implementation decisions, ensuring consistency across AI agents and development sessions.

**Primary Goals:**
- Cross-platform mobile app (iOS + Android) from single codebase
- Battery-efficient background location tracking
- Real-time geospatial scoring algorithm (Focus Zones)
- Secure platform account linking (DoorDash, Uber Eats)
- Subscription-based monetization

---

## Technology Stack

### Mobile Application

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Framework | Expo (React Native) | SDK 52 / RN 0.76 | Managed workflow, OTA updates, excellent location APIs |
| Language | TypeScript | 5.x | Type safety, better tooling |
| Navigation | Expo Router | 4.x | File-based routing, deep linking built-in |
| State Management | Zustand | 5.x | Simple, minimal boilerplate, DevTools support |
| Maps | Mapbox GL | react-native-mapbox-gl | Better styling than Google Maps, offline support |
| HTTP Client | Axios | 1.x | Interceptors for auth, consistent error handling |
| Forms | React Hook Form | 7.x | Performant, minimal re-renders |
| Storage | expo-secure-store | SDK 52 | Keychain/EncryptedSharedPrefs for credentials |
| Subscriptions | RevenueCat | react-native-purchases | Cross-platform IAP abstraction |

### Backend API

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Runtime | Node.js | 22 LTS | Long-term support, performance improvements |
| Framework | Express | 4.x | Mature, well-documented, flexible |
| Language | TypeScript | 5.x | End-to-end type safety with mobile |
| ORM | Prisma | 6.x | Type-safe queries, excellent DX, migrations |
| Database | PostgreSQL | 17 | ACID, JSON support, mature ecosystem |
| Geospatial | PostGIS | 3.5 | Industry-standard spatial queries |
| Hex Grid | H3 | h3-js | Uber's hierarchical geospatial indexing |
| Queue | BullMQ | 5.x | Redis-backed, reliable job processing |
| Cache | Redis | 7.x | Caching, sessions, job queue backend |
| Auth | JWT | jsonwebtoken | Stateless authentication |
| Validation | Zod | 3.x | Runtime validation with TypeScript inference |

### Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| Hosting | Railway | Backend API + PostgreSQL + Redis |
| Mobile CI/CD | EAS Build + Submit | App builds and store submission |
| Push Notifications | Expo Push | Unified iOS/Android notifications |
| Error Tracking | Sentry | Mobile + backend error monitoring |
| Analytics | Amplitude | User behavior, feature usage |

### External APIs

| Service | API | Purpose | Rate Limits |
|---------|-----|---------|-------------|
| Google Places | Places API (New) | Restaurant density, ratings | 5,000/day (free tier) |
| OpenWeather | One Call 3.0 | Weather data for zones | 1,000/day (free tier) |
| Ticketmaster | Discovery API | Local events | 5,000/day |
| Mapbox | Maps SDK | Map rendering, tiles | 50,000 loads/month (free) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBILE APP                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Mapbox    │  │   Zustand   │  │  RevenueCat │              │
│  │   Focus     │  │   State     │  │  Paywall    │              │
│  │   Zones     │  │   Store     │  │             │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │              API Service Layer                 │              │
│  │         (Axios + Auth Interceptors)            │              │
│  └──────────────────────┬────────────────────────┘              │
│                         │                                        │
│  ┌──────────────────────┴────────────────────────┐              │
│  │         expo-location (Background GPS)         │              │
│  └────────────────────────────────────────────────┘              │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       RAILWAY CLUSTER                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    EXPRESS API                           │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐            │    │
│  │  │   Auth    │  │  Zones    │  │  Earnings │            │    │
│  │  │  Routes   │  │  Routes   │  │  Routes   │            │    │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘            │    │
│  │        │              │              │                   │    │
│  │  ┌─────┴──────────────┴──────────────┴─────┐            │    │
│  │  │           Service Layer                  │            │    │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │            │    │
│  │  │  │  Focus   │ │ Platform │ │  Mileage │ │            │    │
│  │  │  │  Zone    │ │   Sync   │ │ Service  │ │            │    │
│  │  │  │ Algorithm│ │ Service  │ │          │ │            │    │
│  │  │  └──────────┘ └──────────┘ └──────────┘ │            │    │
│  │  └──────────────────────────────────────────┘            │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            │                                     │
│  ┌────────────┐  ┌─────────┴─────────┐  ┌────────────────┐      │
│  │   Redis    │  │    PostgreSQL     │  │    BullMQ      │      │
│  │   Cache    │  │    + PostGIS      │  │    Workers     │      │
│  └────────────┘  └───────────────────┘  └────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │  Google   │  │ OpenWeather│  │Ticketmaster│  │  Expo    │    │
│  │  Places   │  │            │  │            │  │  Push    │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

### Mobile App (`/apps/mobile`)

```
apps/mobile/
├── app/                          # Expo Router file-based routes
│   ├── (auth)/                   # Auth group (not authenticated)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── zones.tsx             # Focus Zones map (default)
│   │   ├── earnings.tsx          # Earnings dashboard
│   │   ├── mileage.tsx           # Mileage tracking
│   │   └── settings.tsx          # Settings & profile
│   ├── _layout.tsx               # Root layout
│   ├── index.tsx                 # Entry redirect
│   └── +not-found.tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── index.ts
│   │   ├── zones/                # Focus Zones components
│   │   │   ├── ZoneMap.tsx
│   │   │   ├── ZoneScoreCard.tsx
│   │   │   └── RecommendationBanner.tsx
│   │   ├── earnings/             # Earnings components
│   │   │   ├── EarningsSummary.tsx
│   │   │   ├── PeriodSelector.tsx
│   │   │   └── DeliveryList.tsx
│   │   └── mileage/              # Mileage components
│   │       ├── TrackingIndicator.tsx
│   │       ├── TripList.tsx
│   │       └── MileageSummary.tsx
│   ├── services/
│   │   ├── api.ts                # Axios instance + interceptors
│   │   ├── auth.ts               # Auth API calls
│   │   ├── zones.ts              # Zones API calls
│   │   ├── earnings.ts           # Earnings API calls
│   │   └── mileage.ts            # Mileage API calls
│   ├── stores/
│   │   ├── authStore.ts          # Auth state (Zustand)
│   │   ├── zonesStore.ts         # Zones state
│   │   ├── earningsStore.ts      # Earnings state
│   │   └── mileageStore.ts       # Mileage state
│   ├── hooks/
│   │   ├── useLocation.ts        # Background location hook
│   │   ├── useAuth.ts            # Auth convenience hook
│   │   └── useSubscription.ts    # RevenueCat hook
│   ├── utils/
│   │   ├── format.ts             # Currency, date formatting
│   │   ├── geo.ts                # Geospatial utilities
│   │   └── storage.ts            # Secure storage wrapper
│   ├── constants/
│   │   ├── colors.ts             # Theme colors
│   │   ├── config.ts             # App configuration
│   │   └── routes.ts             # Route constants
│   └── types/
│       ├── api.ts                # API response types
│       ├── models.ts             # Domain models
│       └── navigation.ts         # Navigation types
├── assets/
│   ├── images/
│   └── fonts/
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── package.json
└── tsconfig.json
```

### Backend API (`/apps/api`)

```
apps/api/
├── src/
│   ├── routes/
│   │   ├── auth.routes.ts        # POST /auth/register, /auth/login, etc.
│   │   ├── zones.routes.ts       # GET /zones, GET /zones/:id
│   │   ├── earnings.routes.ts    # GET /earnings, POST /earnings/sync
│   │   ├── mileage.routes.ts     # GET /mileage, POST /mileage/trips
│   │   ├── platforms.routes.ts   # POST /platforms/connect, etc.
│   │   ├── subscriptions.routes.ts
│   │   └── index.ts              # Route aggregator
│   ├── services/
│   │   ├── auth.service.ts       # Auth business logic
│   │   ├── zones.service.ts      # Focus Zones algorithm
│   │   ├── earnings.service.ts   # Earnings aggregation
│   │   ├── mileage.service.ts    # Mileage calculations
│   │   ├── platform/
│   │   │   ├── doordash.service.ts
│   │   │   ├── ubereats.service.ts
│   │   │   └── sync.service.ts   # Orchestrates platform syncs
│   │   └── external/
│   │       ├── places.service.ts  # Google Places wrapper
│   │       ├── weather.service.ts # OpenWeather wrapper
│   │       └── events.service.ts  # Ticketmaster wrapper
│   ├── jobs/
│   │   ├── sync.job.ts           # Platform sync worker
│   │   ├── zones.job.ts          # Zone score refresh worker
│   │   └── queue.ts              # BullMQ queue setup
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT validation
│   │   ├── error.middleware.ts   # Global error handler
│   │   ├── validate.middleware.ts # Zod validation
│   │   └── rateLimit.middleware.ts
│   ├── utils/
│   │   ├── jwt.ts                # Token generation/validation
│   │   ├── crypto.ts             # Encryption utilities
│   │   ├── h3.ts                 # H3 hex grid utilities
│   │   └── logger.ts             # Structured logging
│   ├── types/
│   │   ├── express.d.ts          # Express type extensions
│   │   └── models.ts             # Shared type definitions
│   ├── config/
│   │   └── index.ts              # Environment configuration
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # Server entry point
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── migrations/
│   └── seed.ts                   # Seed data
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## Data Models

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

// ============ USERS ============

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String?
  name              String?
  authProvider      AuthProvider @default(EMAIL)
  appleId           String?   @unique
  googleId          String?   @unique
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  refreshTokens     RefreshToken[]
  platformAccounts  PlatformAccount[]
  deliveries        Delivery[]
  trips             Trip[]
  subscription      Subscription?
  preferences       UserPreferences?
}

enum AuthProvider {
  EMAIL
  APPLE
  GOOGLE
}

model RefreshToken {
  id          String   @id @default(cuid())
  token       String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}

model UserPreferences {
  id                    String  @id @default(cuid())
  userId                String  @unique
  user                  User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  notificationsEnabled  Boolean @default(true)
  zoneAlertsEnabled     Boolean @default(true)
  autoMileageTracking   Boolean @default(true)
  darkModeEnabled       Boolean @default(true)
}

// ============ PLATFORM ACCOUNTS ============

model PlatformAccount {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform          Platform
  encryptedCreds    String    // AES-256 encrypted
  status            PlatformStatus @default(CONNECTED)
  lastSyncAt        DateTime?
  lastSyncError     String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  deliveries        Delivery[]

  @@unique([userId, platform])
  @@index([userId])
}

enum Platform {
  DOORDASH
  UBEREATS
}

enum PlatformStatus {
  CONNECTED
  SYNCING
  ERROR
  DISCONNECTED
}

// ============ EARNINGS ============

model Delivery {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  platformAccountId String
  platformAccount   PlatformAccount @relation(fields: [platformAccountId], references: [id], onDelete: Cascade)

  externalId        String    // Platform's delivery ID
  platform          Platform

  earnings          Decimal   @db.Decimal(10, 2)
  tip               Decimal   @db.Decimal(10, 2)
  basePay           Decimal   @db.Decimal(10, 2)

  restaurantName    String?
  deliveredAt       DateTime

  createdAt         DateTime  @default(now())

  @@unique([platform, externalId])
  @@index([userId, deliveredAt])
  @@index([platformAccountId])
}

// ============ MILEAGE ============

model Trip {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  startedAt       DateTime
  endedAt         DateTime?
  miles           Decimal   @db.Decimal(10, 2)

  startLat        Float
  startLng        Float
  endLat          Float?
  endLng          Float?

  isManual        Boolean   @default(false)
  purpose         String    @default("Business - Delivery")

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId, startedAt])
}

// ============ SUBSCRIPTIONS ============

model Subscription {
  id                    String    @id @default(cuid())
  userId                String    @unique
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  revenuecatId          String    @unique
  tier                  SubscriptionTier @default(FREE)
  status                SubscriptionStatus @default(ACTIVE)

  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

enum SubscriptionTier {
  FREE
  PRO_MONTHLY
  PRO_ANNUAL
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELED
  GRACE_PERIOD
}

// ============ ZONES ============

model Zone {
  id              String    @id @default(cuid())
  h3Index         String    @unique  // H3 resolution 7 hex index
  name            String?            // Human-readable name

  // Cached score components (refreshed every 15 min)
  restaurantDensity   Float   @default(0)
  restaurantRating    Float   @default(0)

  // Current score (computed)
  currentScore        Float   @default(0)

  // PostGIS geometry for spatial queries
  geometry        Unsupported("geometry(Polygon, 4326)")?

  lastCalculatedAt    DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([h3Index])
  @@index([currentScore])
}
```

---

## API Design

### Authentication

```
POST   /api/v1/auth/register        # Email/password registration
POST   /api/v1/auth/login           # Email/password login
POST   /api/v1/auth/apple           # Apple Sign In
POST   /api/v1/auth/google          # Google Sign In
POST   /api/v1/auth/refresh         # Refresh access token
POST   /api/v1/auth/logout          # Revoke refresh token
POST   /api/v1/auth/forgot-password # Request password reset
POST   /api/v1/auth/reset-password  # Complete password reset
DELETE /api/v1/auth/account         # Delete account (GDPR)
```

### Platform Accounts

```
GET    /api/v1/platforms            # List connected platforms
POST   /api/v1/platforms/connect    # Connect platform account
DELETE /api/v1/platforms/:platform  # Disconnect platform
POST   /api/v1/platforms/:platform/sync # Manual sync trigger
```

### Earnings

```
GET    /api/v1/earnings             # Get earnings summary
       ?period=day|week|month|year|custom
       &start=2024-01-01
       &end=2024-01-31
       &platform=doordash|ubereats
GET    /api/v1/earnings/deliveries  # List individual deliveries
       ?page=1&limit=20
       &platform=doordash|ubereats
```

### Focus Zones

```
GET    /api/v1/zones                # Get zones near location
       ?lat=40.7128
       &lng=-74.0060
       &radius=10           # km
GET    /api/v1/zones/:h3Index       # Get single zone details
GET    /api/v1/zones/recommendation # Get top zone recommendation
       ?lat=40.7128
       &lng=-74.0060
```

### Mileage

```
GET    /api/v1/mileage              # Get mileage summary
       ?period=day|week|month|year
GET    /api/v1/mileage/trips        # List trips
       ?page=1&limit=20
POST   /api/v1/mileage/trips        # Record trip (from mobile)
PUT    /api/v1/mileage/trips/:id    # Update trip
DELETE /api/v1/mileage/trips/:id    # Delete trip
POST   /api/v1/mileage/export       # Export tax documents (Pro)
       { format: "csv" | "pdf", startDate, endDate }
```

### Subscriptions

```
GET    /api/v1/subscriptions        # Get current subscription
POST   /api/v1/subscriptions/webhook # RevenueCat webhook
```

### Response Format

All responses follow this structure:

```typescript
// Success response
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { ... }  // Optional
  }
}

// Paginated response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions (e.g., Pro feature) |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `PLATFORM_ERROR` | 502 | Platform sync failed |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Focus Zones Algorithm

### Overview

The Focus Zones algorithm calculates a score (0-100) for each geographic zone based on factors that predict delivery demand.

### H3 Hexagon Grid

Zones use Uber's H3 hierarchical hexagonal grid at resolution 7:
- Hex area: ~5.16 km² (approximately 2 sq miles)
- Provides consistent zone sizes for fair comparison
- Enables efficient spatial queries and neighbor calculations

### Score Calculation

```typescript
// services/zones.service.ts

interface ZoneFactors {
  restaurantDensity: number;  // 0-100: normalized restaurant count
  restaurantRating: number;   // 0-100: avg rating * 20
  mealTimeBoost: number;      // 0-100: time-based multiplier
  weatherBoost: number;       // 0-100: weather impact
  eventBoost: number;         // 0-100: nearby events
  trafficPenalty: number;     // 0-100: traffic congestion penalty
}

function calculateGigletScore(factors: ZoneFactors): number {
  const weights = {
    restaurantDensity: 0.25,
    restaurantRating: 0.10,
    mealTimeBoost: 0.20,
    weatherBoost: 0.20,
    eventBoost: 0.15,
    trafficPenalty: -0.10,  // Negative weight
  };

  const score =
    (factors.restaurantDensity * weights.restaurantDensity) +
    (factors.restaurantRating * weights.restaurantRating) +
    (factors.mealTimeBoost * weights.mealTimeBoost) +
    (factors.weatherBoost * weights.weatherBoost) +
    (factors.eventBoost * weights.eventBoost) +
    (factors.trafficPenalty * weights.trafficPenalty);

  return Math.round(Math.max(0, Math.min(100, score)));
}
```

### Factor Calculations

**Restaurant Density (0-100)**
- Query Google Places API for restaurants within hex boundary
- Normalize: `min(100, restaurantCount * 2)`
- Cache for 24 hours

**Restaurant Rating (0-100)**
- Average rating of restaurants in zone
- Convert: `avgRating * 20` (5-star → 100)
- Cache for 24 hours

**Meal Time Boost (0-100)**
- Based on local time in user's timezone
- Breakfast (7-10 AM): 40
- Lunch (11 AM - 2 PM): 80
- Dinner (5-9 PM): 100
- Late night (9 PM - 12 AM): 50
- Off-peak: 20

**Weather Boost (0-100)**
- Rain/snow: +30 (people order in)
- Extreme cold (<32°F): +20
- Extreme heat (>95°F): +20
- Clear/mild: 0

**Event Boost (0-100)**
- Major event (stadium, arena): +40
- Concert/show: +30
- Festival: +50
- No events: 0
- Decay: -10 per mile from event

**Traffic Penalty (0-100)**
- Heavy traffic: 50 (penalizes zone)
- Moderate: 25
- Light: 0

### Refresh Strategy

- Zone scores refresh every 15 minutes via BullMQ cron job
- Restaurant data cached 24 hours
- Weather/events fetched fresh each refresh
- Mobile app polls `/zones` endpoint (or WebSocket future)

---

## Authentication Flow

### JWT Strategy

```typescript
// Access Token (15 min expiry)
{
  "sub": "user_cuid",
  "email": "user@example.com",
  "tier": "PRO_MONTHLY",
  "iat": 1234567890,
  "exp": 1234568790
}

// Refresh Token (30 days expiry)
// Stored in database, opaque to client
```

### Token Refresh Flow

```
1. Mobile detects 401 response
2. Axios interceptor catches error
3. Call POST /auth/refresh with refresh token
4. Server validates refresh token in database
5. If valid: issue new access + refresh tokens
6. If invalid: redirect to login
7. Retry original request with new access token
```

### Secure Storage

```typescript
// Mobile: expo-secure-store
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('accessToken', token);
await SecureStore.setItemAsync('refreshToken', refreshToken);

// Backend: AES-256-GCM for platform credentials
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

---

## Platform Integration

### Account Linking Strategy

Since DoorDash and Uber Eats don't provide public APIs, we use session-based account linking:

1. User enters platform credentials in app
2. Credentials encrypted and stored server-side
3. Backend initiates authenticated session with platform
4. Scrapes earnings data via platform's web dashboard
5. Parses and normalizes data to common format

### Implementation Pattern

```typescript
// services/platform/doordash.service.ts

interface PlatformService {
  login(credentials: EncryptedCreds): Promise<Session>;
  fetchEarnings(session: Session, dateRange: DateRange): Promise<Delivery[]>;
  checkSession(session: Session): Promise<boolean>;
}

class DoorDashService implements PlatformService {
  async login(credentials: EncryptedCreds): Promise<Session> {
    const decrypted = decrypt(credentials);
    // Use puppeteer/playwright for headless browser login
    // Store session cookies
  }

  async fetchEarnings(session: Session, dateRange: DateRange): Promise<Delivery[]> {
    // Navigate to earnings page
    // Parse HTML/JSON response
    // Map to normalized Delivery format
  }
}
```

### Sync Job

```typescript
// jobs/sync.job.ts

const syncQueue = new Queue('platform-sync', { connection: redis });

// Scheduled every 4 hours for each connected platform
syncQueue.add('sync-user-platforms', { userId }, {
  repeat: { every: 4 * 60 * 60 * 1000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 60000 },
});
```

---

## Background Location Tracking

### Mobile Implementation

```typescript
// hooks/useLocation.ts

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK = 'giglet-location-tracking';

TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  // Process location updates
  // Detect trip start/end
  // Calculate distance
  // Queue for sync
});

export async function startLocationTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60000,        // Every minute
    distanceInterval: 100,       // Or every 100 meters
    deferredUpdatesInterval: 300000,  // Batch every 5 min
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Giglet',
      notificationBody: 'Tracking mileage...',
    },
  });
}
```

### Trip Detection Logic

```typescript
// State machine for trip detection
enum TripState {
  IDLE,
  MOVING,
  PAUSED,
}

// IDLE → MOVING: Speed > 5 mph for 30 seconds
// MOVING → PAUSED: Stationary for 2 minutes
// PAUSED → IDLE: Stationary for 5 minutes (trip ends)
// PAUSED → MOVING: Speed > 5 mph (trip continues)
```

### Battery Optimization

- Use `Accuracy.Balanced` (not `Accuracy.High`)
- Batch updates with `deferredUpdatesInterval`
- Use activity recognition to pause tracking when walking
- Allow user to disable auto-tracking in settings
- Target: <5% daily battery impact

---

## Cross-Cutting Concerns

### Error Handling

```typescript
// middleware/error.middleware.ts

class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

// Usage
throw new AppError('VALIDATION_ERROR', 'Invalid email', 400);

// Global handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Log unexpected errors
  logger.error('Unhandled error', { error: err, path: req.path });

  return res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});
```

### Logging

```typescript
// utils/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Usage
logger.info({ userId, action: 'login' }, 'User logged in');
logger.error({ error, userId }, 'Platform sync failed');
```

### Date/Time Handling

```typescript
// All dates stored in UTC
// User timezone stored in preferences
// Display converted to local time on mobile

import { formatInTimeZone } from 'date-fns-tz';

// Backend: always work in UTC
const now = new Date();  // UTC

// Mobile: display in local
const localTime = formatInTimeZone(
  utcDate,
  userTimezone,
  'MMM d, yyyy h:mm a'
);
```

### Rate Limiting

```typescript
// middleware/rateLimit.middleware.ts

import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests' },
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 login attempts per hour
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts' },
  },
});
```

### Validation

```typescript
// Using Zod for runtime validation

import { z } from 'zod';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

// Middleware
export function validate<T>(schema: z.Schema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid request', 400, {
        errors: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}
```

---

## Testing Strategy

### Mobile Testing

```typescript
// Jest + React Native Testing Library

// Component test
describe('ZoneScoreCard', () => {
  it('displays score with correct color', () => {
    render(<ZoneScoreCard score={85} />);
    expect(screen.getByText('85')).toBeTruthy();
    expect(screen.getByTestId('score-badge')).toHaveStyle({
      backgroundColor: '#22c55e' // Green for high score
    });
  });
});

// Integration test with MSW for API mocking
```

### Backend Testing

```typescript
// Jest + Supertest

describe('POST /api/v1/auth/register', () => {
  it('creates user with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  it('rejects invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'invalid', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### E2E Testing

```typescript
// Detox for mobile E2E

describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login with valid credentials', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    await expect(element(by.id('zones-map'))).toBeVisible();
  });
});
```

---

## Environment Variables

### Backend (`apps/api/.env`)

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/giglet?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# Encryption
ENCRYPTION_KEY=64-char-hex-string

# External APIs
GOOGLE_PLACES_API_KEY=xxx
OPENWEATHER_API_KEY=xxx
TICKETMASTER_API_KEY=xxx

# Expo Push
EXPO_ACCESS_TOKEN=xxx
```

### Mobile (`apps/mobile/.env`)

```bash
EXPO_PUBLIC_API_URL=https://api.giglet.app
EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxx
EXPO_PUBLIC_REVENUECAT_IOS_KEY=xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=xxx
EXPO_PUBLIC_AMPLITUDE_KEY=xxx
EXPO_PUBLIC_SENTRY_DSN=xxx
```

---

## Deployment

### Railway Configuration

```yaml
# railway.toml

[build]
builder = "dockerfile"

[deploy]
startCommand = "npm run start:prod"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3

[variables]
NODE_ENV = "production"
```

### EAS Build Configuration

```json
// eas.json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id",
        "ascAppId": "123456789"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json"
      }
    }
  }
}
```

---

## Implementation Patterns for AI Agents

### File Naming Conventions

```
- Components: PascalCase.tsx (ZoneMap.tsx, EarningsSummary.tsx)
- Utilities: camelCase.ts (formatCurrency.ts, calculateDistance.ts)
- Types: camelCase.ts or models.ts
- Routes: kebab-case.routes.ts (auth.routes.ts)
- Services: kebab-case.service.ts (zones.service.ts)
- Tests: *.test.ts or *.spec.ts
```

### Import Order

```typescript
// 1. React/React Native
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

// 3. Internal aliases (@/)
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/format';

// 4. Relative imports
import { ZoneScoreCard } from './ZoneScoreCard';
```

### Component Structure

```typescript
// Standard functional component pattern

interface ZoneMapProps {
  initialLocation?: { lat: number; lng: number };
  onZoneSelect?: (h3Index: string) => void;
}

export function ZoneMap({ initialLocation, onZoneSelect }: ZoneMapProps) {
  // Hooks first
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const { zones, isLoading } = useZones(initialLocation);

  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependency]);

  // Handlers
  const handleZonePress = (h3Index: string) => {
    setSelectedZone(h3Index);
    onZoneSelect?.(h3Index);
  };

  // Early returns
  if (isLoading) return <LoadingSpinner />;

  // Render
  return (
    <View>
      {/* Component JSX */}
    </View>
  );
}
```

### Service Pattern

```typescript
// services/zones.service.ts

import { prisma } from '@/lib/prisma';
import { AppError } from '@/utils/errors';

export class ZonesService {
  async getZonesNearLocation(lat: number, lng: number, radiusKm: number) {
    // Validate inputs
    if (!lat || !lng) {
      throw new AppError('VALIDATION_ERROR', 'Location required', 400);
    }

    // Query with PostGIS
    const zones = await prisma.$queryRaw`
      SELECT id, h3_index, current_score, name
      FROM zones
      WHERE ST_DWithin(
        geometry,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusKm * 1000}
      )
      ORDER BY current_score DESC
    `;

    return zones;
  }
}

// Export singleton
export const zonesService = new ZonesService();
```

### Route Pattern

```typescript
// routes/zones.routes.ts

import { Router } from 'express';
import { zonesService } from '@/services/zones.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { GetZonesSchema } from '@/schemas/zones.schema';

const router = Router();

router.get(
  '/',
  authMiddleware,
  validate(GetZonesSchema),
  async (req, res, next) => {
    try {
      const { lat, lng, radius } = req.query;
      const zones = await zonesService.getZonesNearLocation(
        Number(lat),
        Number(lng),
        Number(radius)
      );
      res.json({ success: true, data: zones });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

---

## Security Checklist

- [ ] All API endpoints require authentication (except auth routes)
- [ ] Platform credentials encrypted with AES-256-GCM
- [ ] JWT secrets are 256-bit minimum
- [ ] Refresh tokens stored in database, revocable
- [ ] Rate limiting on auth endpoints (10/hour)
- [ ] Rate limiting on API (100/15min)
- [ ] Input validation on all endpoints (Zod)
- [ ] SQL injection prevented (Prisma parameterized queries)
- [ ] HTTPS enforced in production
- [ ] Sensitive data excluded from logs
- [ ] CORS configured for mobile app origins only
- [ ] Account deletion fully removes all user data

---

## Next Steps

1. **Run:** `workflow create-epics-and-stories` (if not done) → Already complete
2. **Run:** `workflow create-ux-design` → Design Focus Zones map, Earnings dashboard
3. **Begin Epic 1:** Foundation & Infrastructure
   - Set up monorepo structure
   - Initialize Expo project
   - Initialize Express API
   - Configure Prisma + PostgreSQL
   - Set up CI/CD pipelines

---

*This architecture document ensures consistency across AI agents working on different parts of Giglet. When in doubt, refer to this document for patterns and conventions.*

*Created through collaborative architecture facilitation between George and AI.*
