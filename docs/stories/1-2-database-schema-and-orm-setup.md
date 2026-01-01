# Story 1.2: Database Schema and ORM Setup

**Epic:** 1 - Foundation & Infrastructure
**Story ID:** 1.2
**Status:** done
**Priority:** P0
**Created:** 2025-01-01

---

## User Story

**As a** developer,
**I want** the database schema defined and ORM configured,
**So that** I can persist and query application data.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | PostgreSQL database is created with initial schema | Run `npx prisma migrate dev` successfully |
| AC2 | PostGIS extension is enabled for geospatial queries | Query `SELECT PostGIS_Version()` returns version |
| AC3 | ORM models exist for User, RefreshToken, UserPreferences | Prisma Client generates types for these models |
| AC4 | ORM models exist for PlatformAccount, Delivery | Prisma Client generates types for these models |
| AC5 | ORM models exist for Trip (mileage tracking) | Prisma Client generates types for this model |
| AC6 | ORM models exist for Zone (with PostGIS geometry) | Prisma Client generates types with Unsupported field |
| AC7 | ORM models exist for Subscription | Prisma Client generates types for this model |
| AC8 | Can run a simple query from the backend | Health endpoint queries database successfully |
| AC9 | Indexes exist for common queries (user_id, timestamps) | Schema includes `@@index` directives |
| AC10 | Migration system is functional | Migrations folder contains initial migration |

---

## Tasks

### Task 1: Install and Configure Prisma
**Estimated:** 20 min
**AC:** AC3-AC7

- [ ] Install Prisma dependencies:
  ```bash
  cd apps/api
  npm install prisma @prisma/client
  npm install -D prisma
  ```
- [ ] Initialize Prisma (if not already):
  ```bash
  npx prisma init
  ```
- [ ] Configure `prisma/schema.prisma` with PostgreSQL provider
- [ ] Add PostGIS extension support via `previewFeatures`
- [ ] Configure database URL in `.env`:
  ```
  DATABASE_URL="postgresql://user:password@localhost:5432/giglet?schema=public"
  ```

### Task 2: Set Up Local PostgreSQL with PostGIS
**Estimated:** 15 min
**AC:** AC1, AC2

- [ ] Option A: Docker (recommended):
  ```bash
  docker run --name giglet-db -e POSTGRES_USER=giglet -e POSTGRES_PASSWORD=giglet -e POSTGRES_DB=giglet -p 5432:5432 -d postgis/postgis:17-3.5
  ```
- [ ] Option B: Local PostgreSQL with PostGIS extension
- [ ] Verify PostGIS is available:
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  SELECT PostGIS_Version();
  ```
- [ ] Document local setup in README or separate DEVELOPMENT.md

### Task 3: Implement User-Related Models
**Estimated:** 30 min
**AC:** AC3

- [ ] Add `User` model with fields:
  - id (cuid)
  - email (unique)
  - passwordHash (optional for social auth)
  - name (optional)
  - authProvider enum (EMAIL, APPLE, GOOGLE)
  - appleId, googleId (unique, optional)
  - timestamps
- [ ] Add `AuthProvider` enum
- [ ] Add `RefreshToken` model:
  - id, token (unique), userId, expiresAt, createdAt
  - Relation to User with cascade delete
  - Indexes on userId and expiresAt
- [ ] Add `UserPreferences` model:
  - id, userId (unique)
  - Boolean preferences (notifications, zoneAlerts, autoMileage, darkMode)
  - Relation to User with cascade delete

### Task 4: Implement Platform Account Models
**Estimated:** 25 min
**AC:** AC4

- [ ] Add `PlatformAccount` model:
  - id, userId
  - platform enum (DOORDASH, UBEREATS)
  - encryptedCreds (String for AES-256 encrypted credentials)
  - status enum (CONNECTED, SYNCING, ERROR, DISCONNECTED)
  - lastSyncAt, lastSyncError (optional)
  - timestamps
  - Unique constraint on [userId, platform]
- [ ] Add `Platform` enum
- [ ] Add `PlatformStatus` enum
- [ ] Add `Delivery` model:
  - id, userId, platformAccountId
  - externalId, platform
  - earnings, tip, basePay (Decimal)
  - restaurantName (optional)
  - deliveredAt timestamp
  - Unique constraint on [platform, externalId]
  - Indexes on [userId, deliveredAt] and platformAccountId

### Task 5: Implement Mileage Tracking Model
**Estimated:** 15 min
**AC:** AC5

- [ ] Add `Trip` model:
  - id, userId
  - startedAt, endedAt (optional)
  - miles (Decimal)
  - startLat, startLng, endLat, endLng (Float)
  - isManual (Boolean, default false)
  - purpose (String, default "Business - Delivery")
  - timestamps
  - Index on [userId, startedAt]

### Task 6: Implement Zone Model with PostGIS
**Estimated:** 30 min
**AC:** AC6

- [ ] Add `Zone` model:
  - id, h3Index (unique)
  - name (optional, human-readable)
  - restaurantDensity, restaurantRating (Float, defaults)
  - currentScore (Float)
  - geometry (Unsupported PostGIS type)
  - lastCalculatedAt (optional)
  - timestamps
  - Indexes on h3Index and currentScore
- [ ] Use `Unsupported("geometry(Polygon, 4326)")` for PostGIS geometry
- [ ] Note: Geometry operations will use raw SQL queries

### Task 7: Implement Subscription Model
**Estimated:** 15 min
**AC:** AC7

- [ ] Add `Subscription` model:
  - id, userId (unique)
  - revenuecatId (unique)
  - tier enum (FREE, PRO_MONTHLY, PRO_ANNUAL)
  - status enum (ACTIVE, EXPIRED, CANCELED, GRACE_PERIOD)
  - currentPeriodStart, currentPeriodEnd (optional)
  - timestamps
- [ ] Add `SubscriptionTier` enum
- [ ] Add `SubscriptionStatus` enum

### Task 8: Run Initial Migration
**Estimated:** 15 min
**AC:** AC1, AC10

- [ ] Generate Prisma Client:
  ```bash
  npx prisma generate
  ```
- [ ] Create initial migration:
  ```bash
  npx prisma migrate dev --name init
  ```
- [ ] Verify migration files created in `prisma/migrations/`
- [ ] Verify database tables created:
  ```bash
  npx prisma db pull
  ```
- [ ] Test connection with `npx prisma studio`

### Task 9: Integrate with Health Endpoint
**Estimated:** 20 min
**AC:** AC8

- [ ] Create Prisma client singleton at `src/lib/prisma.ts`:
  ```typescript
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();
  export default prisma;
  ```
- [ ] Update health endpoint to query database:
  ```typescript
  app.get('/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      res.status(500).json({ status: 'error', database: 'disconnected' });
    }
  });
  ```
- [ ] Add graceful shutdown for Prisma connection
- [ ] Test health endpoint returns database status

### Task 10: Create Seed Script (Optional)
**Estimated:** 15 min
**AC:** N/A (nice to have)

- [ ] Create `prisma/seed.ts` with sample data
- [ ] Add seed script to package.json:
  ```json
  "prisma": { "seed": "ts-node prisma/seed.ts" }
  ```
- [ ] Add development user and sample zones

---

## Technical Notes

### Technology Stack (from Architecture)
- **ORM:** Prisma 6.x with `postgresqlExtensions` preview feature
- **Database:** PostgreSQL 17 + PostGIS 3.5
- **Geospatial:** H3 hexagon grid (h3-js) for zones

### Prisma Schema Reference
The full schema is defined in `docs/architecture.md` § "Data Models" (lines 273-473).

Key patterns:
- All IDs use `@id @default(cuid())`
- Timestamps via `@default(now())` and `@updatedAt`
- Decimal fields use `@db.Decimal(10, 2)` for currency
- Enums defined at top of model group
- Cascade deletes on child relations

### PostGIS Geometry Handling
Since Prisma doesn't natively support PostGIS geometry types:
```prisma
geometry  Unsupported("geometry(Polygon, 4326)")?
```

Geometry operations require raw SQL:
```typescript
const zones = await prisma.$queryRaw`
  SELECT * FROM zones
  WHERE ST_DWithin(
    geometry,
    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
    ${radiusMeters}
  )
`;
```

### Environment Variables Required
```bash
# apps/api/.env
DATABASE_URL="postgresql://giglet:giglet@localhost:5432/giglet?schema=public"
```

---

## Dependencies

### Prerequisites
- Story 1.1: Project Scaffolding (completed)
- Docker (for local PostgreSQL) or local PostgreSQL + PostGIS installation

### Blockers
- None

### Enables
- Story 1.5: API Foundation and Health Endpoints
- Story 2.1: Email/Password Registration (User model)
- Story 3.1: DoorDash Account Connection (PlatformAccount model)
- Story 5.2: Zone Scoring Algorithm (Zone model)
- Story 6.3: Trip Detection and Logging (Trip model)

---

## Definition of Done

- [x] All acceptance criteria verified
- [x] All tasks completed
- [x] Prisma migration runs successfully
- [x] Database contains all expected tables
- [x] PostGIS extension enabled and functional
- [x] Health endpoint confirms database connectivity
- [x] No TypeScript errors in generated Prisma client
- [x] Story marked as `done` in sprint-status.yaml

---

## Dev Notes

### Learnings from Previous Story

**From Story 1-1-project-scaffolding-and-repository-setup (Status: done)**

- **Folder Structure**: API structure at `apps/api/src/` with routes/, services/, middleware/, utils/, config/
- **TypeScript Config**: Using CommonJS module resolution (not NodeNext) for ts-node compatibility
- **Placeholder Created**: `apps/api/prisma/schema.prisma` exists as placeholder - will replace with full schema
- **Express Setup**: Basic Express app at `apps/api/src/app.ts` with health endpoint at `GET /health`
- **Debug Solution**: ts-node works with CommonJS, avoid `.js` extensions in imports

[Source: docs/stories/1-1-project-scaffolding-and-repository-setup.md#Dev-Agent-Record]

### Architecture References
- Data models: `docs/architecture.md` § "Data Models" (Prisma schema)
- Database config: `docs/architecture.md` § "Environment Variables"
- PostGIS usage: `docs/architecture.md` § "Focus Zones Algorithm"

### Gotchas to Watch For
- PostGIS geometry type requires `Unsupported()` in Prisma - raw SQL needed for spatial queries
- Decimal fields in Prisma need explicit `@db.Decimal(10, 2)` annotation
- cuid() generates shorter IDs than uuid() - preferred for this project
- Prisma Client must be regenerated after schema changes (`npx prisma generate`)

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Prisma 7.x installed by default; downgraded to 6.x for architecture compatibility
- PostGIS 17-3.5 image not available for ARM; used 16-3.4 instead (emulated)

### Completion Notes List

- **AC1** ✅ PostgreSQL database created with initial schema via `prisma migrate dev --name init`
- **AC2** ✅ PostGIS 3.4 enabled and functional (`SELECT PostGIS_Version()` returns `3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1`)
- **AC3** ✅ User, RefreshToken, UserPreferences models implemented with all relations
- **AC4** ✅ PlatformAccount, Delivery models with cascade deletes and indexes
- **AC5** ✅ Trip model with location fields and indexes
- **AC6** ✅ Zone model with `Unsupported("geometry(Polygon, 4326)")` for PostGIS geometry
- **AC7** ✅ Subscription model with tier/status enums and RevenueCat integration field
- **AC8** ✅ Health endpoint returns `{"status":"ok","database":"connected"}`
- **AC9** ✅ All `@@index` directives in place for common queries
- **AC10** ✅ Migration at `prisma/migrations/20260101212030_init/migration.sql`

### File List

- `apps/api/prisma/schema.prisma` - Full Prisma schema with all 8 models
- `apps/api/prisma/migrations/20260101212030_init/migration.sql` - Initial migration
- `apps/api/src/lib/prisma.ts` - Prisma client singleton with hot-reload protection
- `apps/api/src/app.ts` - Updated with database health check
- `apps/api/src/server.ts` - Added graceful shutdown for Prisma
- `apps/api/.env` - Database connection string and env variables

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-01-01 | Claude | Story drafted from epics.md and architecture.md |
