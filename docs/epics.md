# Giglet - Epic Breakdown

**Author:** George
**Date:** 2024-12-30
**Project Level:** MVP
**Target Scale:** 100K users

---

## Overview

This document provides the complete epic and story breakdown for Giglet, decomposing the requirements from the [PRD](./PRD.md) into implementable stories sized for single dev agent sessions.

### Epic Summary

| Epic | Title | Goal | Stories | Priority |
|------|-------|------|---------|----------|
| 1 | Foundation & Infrastructure | Establish project foundation, CI/CD, core architecture | 5 | P0 |
| 2 | User Authentication | Enable users to create accounts and sign in | 6 | P0 |
| 3 | Platform Account Linking | Connect DoorDash and Uber Eats accounts | 7 | P0 |
| 4 | Earnings Dashboard | Display synced earnings with breakdowns | 6 | P0 |
| 5 | Giglet Focus Zones | Real-time location intelligence heatmap | 8 | P0 |
| 6 | Automatic Mileage Tracking | Background GPS mileage logging | 7 | P0 |
| 7 | Tax Export | Generate IRS-compliant reports | 5 | P1 |
| 8 | Subscription & Payments | Monetization via Pro tier | 6 | P0 |
| 9 | Settings & Profile | User preferences and account management | 5 | P1 |

**Total Stories:** 55
**Estimated Duration:** 14-16 weeks (single developer) or 8-10 weeks (2 developers)

### Sequencing Rationale

```
Epic 1 (Foundation) ──┬──► Epic 2 (Auth) ──► Epic 3 (Linking) ──► Epic 4 (Earnings)
                      │
                      └──► Epic 5 (Focus Zones) [parallel track possible]

Epic 4 + Epic 5 ──► Epic 6 (Mileage) ──► Epic 7 (Tax Export)

Epic 2 ──► Epic 8 (Subscriptions) ──► Epic 9 (Settings)
```

- **Epic 1** must complete first (establishes everything)
- **Epics 2-4** form the core earnings flow (sequential)
- **Epic 5** can partially parallel with Epic 3-4 (independent data source)
- **Epic 6-7** depend on earnings + location patterns
- **Epic 8** can start after auth, gates Pro features
- **Epic 9** is lowest priority, can be last

---

## Epic 1: Foundation & Infrastructure

**Goal:** Establish the project foundation including repository structure, build system, deployment pipeline, and core dependencies. This epic enables all subsequent development.

**Value:** Without foundation, nothing else can be built. This epic creates the skeleton that all features attach to.

**Exit Criteria:**
- Mobile app builds and runs on iOS simulator and Android emulator
- Backend API deploys to staging environment
- CI/CD pipeline runs tests on every PR
- Core navigation structure in place

---

### Story 1.1: Project Scaffolding and Repository Setup

**As a** developer,
**I want** a properly structured mobile app and backend repository,
**So that** I can begin building features on a solid foundation.

**Acceptance Criteria:**

**Given** I am starting development on Giglet
**When** I clone the repository and run setup commands
**Then** the mobile app builds successfully for iOS and Android
**And** the backend API starts locally
**And** all linting and formatting tools are configured
**And** the README contains setup instructions

**Prerequisites:** None (first story)

**Technical Notes:**
- Mobile: Initialize React Native or Flutter project
- Backend: Initialize Node.js/Express or Python/FastAPI project
- Configure ESLint/Prettier (JS) or equivalent
- Set up monorepo structure if desired (mobile + backend)
- Initialize git with .gitignore for both platforms
- Create initial folder structure per architecture decisions

---

### Story 1.2: Database Schema and ORM Setup

**As a** developer,
**I want** the database schema defined and ORM configured,
**So that** I can persist and query application data.

**Acceptance Criteria:**

**Given** the project is scaffolded
**When** I run database migrations
**Then** PostgreSQL database is created with initial schema
**And** PostGIS extension is enabled for geospatial queries
**And** ORM models exist for: User, LinkedAccount, Delivery, MileageTrip, Zone
**And** I can run a simple query from the backend

**Prerequisites:** Story 1.1

**Technical Notes:**
- PostgreSQL with PostGIS for zone geospatial queries
- Use Prisma (Node) or SQLAlchemy (Python) as ORM
- Create migration system from the start
- Schema based on PRD data model section
- Include indexes for common queries (user_id, timestamps)

---

### Story 1.3: CI/CD Pipeline Configuration

**As a** developer,
**I want** automated testing and deployment pipelines,
**So that** code quality is maintained and deployments are reliable.

**Acceptance Criteria:**

**Given** code is pushed to the repository
**When** a pull request is opened
**Then** linting runs automatically
**And** unit tests run automatically
**And** build verification runs for mobile (iOS + Android)
**And** PR cannot merge if checks fail

**Given** code is merged to main branch
**When** CI pipeline completes successfully
**Then** backend deploys to staging environment automatically
**And** deployment status is visible

**Prerequisites:** Story 1.1

**Technical Notes:**
- Use GitHub Actions (or similar)
- Mobile builds: Use EAS Build (Expo) or Fastlane
- Backend: Deploy to Railway, Render, or similar
- Set up staging environment separate from production
- Configure environment variables securely

---

### Story 1.4: Core Navigation and App Shell

**As a** user,
**I want** to navigate between main app sections,
**So that** I can access different features.

**Acceptance Criteria:**

**Given** I open the Giglet app
**When** I am logged in
**Then** I see a bottom navigation bar with: Map, Earnings, Mileage, Profile tabs
**And** tapping each tab navigates to a placeholder screen
**And** the current tab is visually highlighted

**Given** I am not logged in
**When** I open the app
**Then** I see the login/registration screen
**And** I cannot access main app tabs

**Prerequisites:** Story 1.1

**Technical Notes:**
- Use React Navigation (RN) or Navigator (Flutter)
- Implement auth state check on app launch
- Create placeholder screens for each tab
- Set up navigation types/routes file
- Implement deep linking structure for future use

---

### Story 1.5: API Foundation and Health Endpoints

**As a** developer,
**I want** the backend API structure established with health checks,
**So that** I can build feature endpoints on a solid foundation.

**Acceptance Criteria:**

**Given** the backend is running
**When** I call GET /health
**Then** I receive 200 OK with service status
**And** database connectivity is verified

**Given** the API structure is in place
**When** I need to add a new endpoint
**Then** I have a clear pattern to follow (routes, controllers, services)
**And** error handling middleware is configured
**And** request logging is enabled

**Prerequisites:** Story 1.2

**Technical Notes:**
- Establish route → controller → service → repository pattern
- Configure error handling middleware with proper HTTP status codes
- Set up request/response logging (not sensitive data)
- Implement rate limiting foundation
- Configure CORS for mobile app access
- Create API versioning strategy (/api/v1/)

---

## Epic 2: User Authentication

**Goal:** Enable users to create accounts, sign in, and maintain secure sessions across app launches.

**Value:** Users can identify themselves, enabling personalized features and data persistence across devices.

**Exit Criteria:**
- Users can register with email/password
- Users can sign in with Apple (iOS) and Google
- Sessions persist across app restarts
- Password reset flow works end-to-end

---

### Story 2.1: Email/Password Registration

**As a** new user,
**I want** to create an account with my email and password,
**So that** I can access Giglet's features.

**Acceptance Criteria:**

**Given** I am on the registration screen
**When** I enter a valid email and password (8+ chars, 1 number)
**Then** my account is created
**And** I receive a confirmation email
**And** I am navigated to the onboarding flow

**Given** I enter an invalid email format
**When** I tap Register
**Then** I see an error message "Please enter a valid email"
**And** registration does not proceed

**Given** I enter a password less than 8 characters
**When** I tap Register
**Then** I see an error message "Password must be at least 8 characters"

**Given** an account already exists with my email
**When** I try to register
**Then** I see "An account with this email already exists"

**Prerequisites:** Story 1.4, Story 1.5

**Technical Notes:**
- Hash passwords with bcrypt (cost factor 12)
- Store email as lowercase, trimmed
- Generate email verification token (24hr expiry)
- Use transactional email service (SendGrid, Postmark)
- Return JWT access token + refresh token on success

---

### Story 2.2: Email/Password Login

**As a** registered user,
**I want** to log in with my email and password,
**So that** I can access my account.

**Acceptance Criteria:**

**Given** I am on the login screen
**When** I enter correct email and password
**Then** I am logged in and navigated to the main app
**And** my session persists if I close and reopen the app

**Given** I enter incorrect credentials
**When** I tap Login
**Then** I see "Invalid email or password"
**And** I remain on the login screen

**Given** I have logged in previously
**When** I reopen the app
**Then** I am automatically logged in (session restored)

**Prerequisites:** Story 2.1

**Technical Notes:**
- JWT access token (15min expiry) + refresh token (30 day expiry)
- Store refresh token securely (Keychain iOS, EncryptedSharedPrefs Android)
- Implement token refresh logic on 401 responses
- Rate limit login attempts (5 per minute per IP)

---

### Story 2.3: Apple Sign In (iOS)

**As an** iOS user,
**I want** to sign in with my Apple ID,
**So that** registration is quick and I don't need another password.

**Acceptance Criteria:**

**Given** I am on the login screen on iOS
**When** I tap "Sign in with Apple"
**Then** the native Apple Sign In sheet appears
**And** after successful authentication, I am logged in or registered
**And** if new user, my account is created automatically

**Given** I previously signed in with Apple
**When** I tap "Sign in with Apple" again
**Then** I am logged into my existing account

**Prerequisites:** Story 2.1

**Technical Notes:**
- Use Apple's AuthenticationServices framework
- Handle both "Sign Up" and "Sign In" flows
- Apple may hide email - handle private relay emails
- Store Apple user identifier for future logins
- Verify identity token on backend

---

### Story 2.4: Google Sign In

**As a** user,
**I want** to sign in with my Google account,
**So that** registration is quick and secure.

**Acceptance Criteria:**

**Given** I am on the login screen
**When** I tap "Sign in with Google"
**Then** the Google authentication flow launches
**And** after successful authentication, I am logged in or registered
**And** if new user, my account is created with Google profile info

**Prerequisites:** Story 2.1

**Technical Notes:**
- Use @react-native-google-signin/google-signin (RN) or google_sign_in (Flutter)
- Configure OAuth consent screen in Google Cloud Console
- Verify ID token on backend
- Works on both iOS and Android

---

### Story 2.5: Password Reset Flow

**As a** user who forgot my password,
**I want** to reset it via email,
**So that** I can regain access to my account.

**Acceptance Criteria:**

**Given** I am on the login screen
**When** I tap "Forgot Password" and enter my email
**Then** I receive a password reset email with a secure link
**And** I see "Check your email for reset instructions"

**Given** I click the reset link in my email
**When** I enter a new password meeting requirements
**Then** my password is updated
**And** I am redirected to login with a success message

**Given** the reset link is older than 1 hour
**When** I try to use it
**Then** I see "This link has expired. Please request a new one."

**Prerequisites:** Story 2.2

**Technical Notes:**
- Generate secure random token (32 bytes, URL-safe base64)
- Token expires in 1 hour
- Invalidate token after use
- Deep link to app or web page for password entry

---

### Story 2.6: Onboarding Flow

**As a** new user,
**I want** a brief introduction to Giglet's features,
**So that** I understand the app's value before diving in.

**Acceptance Criteria:**

**Given** I have just registered
**When** I complete registration
**Then** I see a 3-4 screen onboarding walkthrough
**And** each screen highlights a key feature (Focus Zones, Earnings, Mileage)
**And** I can skip the onboarding at any time
**And** after completing or skipping, I reach the main app

**Given** I have completed onboarding before
**When** I log in again
**Then** I go directly to the main app (onboarding not shown)

**Prerequisites:** Story 2.1

**Technical Notes:**
- Store onboarding_completed flag in user profile
- Use horizontal pager/carousel for screens
- Include "Skip" button on each screen
- Final screen should have clear CTA to connect accounts

---

## Epic 3: Platform Account Linking

**Goal:** Enable users to connect their DoorDash and Uber Eats accounts for automatic earnings synchronization.

**Value:** This is the core automation promise - no more manual tracking. Users connect once and their data syncs automatically.

**Exit Criteria:**
- Users can connect DoorDash account and see earnings
- Users can connect Uber Eats account and see earnings
- Connection status is clearly visible
- Users can disconnect accounts
- Sync failures are handled gracefully

---

### Story 3.1: DoorDash Account Connection UI

**As a** user,
**I want** to connect my DoorDash account,
**So that** my DoorDash earnings sync automatically.

**Acceptance Criteria:**

**Given** I am on the Accounts screen
**When** I tap "Connect DoorDash"
**Then** I see a secure login form for DoorDash credentials
**And** my credentials are transmitted securely

**Given** I enter valid DoorDash credentials
**When** I tap Connect
**Then** I see a loading indicator
**And** on success, I see "DoorDash Connected" status
**And** initial sync begins automatically

**Given** I enter invalid credentials
**When** I tap Connect
**Then** I see "Invalid email or password. Please try again."

**Prerequisites:** Story 2.2, Story 1.5

**Technical Notes:**
- NEVER log credentials
- Encrypt credentials in transit (HTTPS) and at rest (AES-256)
- Display trust messaging ("Your credentials are encrypted...")
- Show what we will and won't do with their account
- Create LinkedAccount record with platform='doordash'

---

### Story 3.2: DoorDash Earnings Sync Backend

**As a** user with a connected DoorDash account,
**I want** my earnings to sync automatically,
**So that** I see my DoorDash deliveries in Giglet.

**Acceptance Criteria:**

**Given** my DoorDash account is connected
**When** the sync job runs
**Then** my recent deliveries are fetched from DoorDash
**And** each delivery is stored with: timestamp, base_pay, tip, restaurant
**And** sync status is updated to "success" with timestamp

**Given** DoorDash login session expires
**When** the sync job runs
**Then** sync status shows "Error: Please reconnect"
**And** user is notified to re-authenticate

**Prerequisites:** Story 3.1

**Technical Notes:**
- Implement session-based data retrieval from DoorDash
- Handle pagination for historical earnings
- Store session tokens encrypted
- Queue sync jobs (Bull/Celery) - don't block API
- Implement exponential backoff on failures
- Rate limit requests to avoid detection

---

### Story 3.3: Uber Eats Account Connection UI

**As a** user,
**I want** to connect my Uber Eats account,
**So that** my Uber Eats earnings sync automatically.

**Acceptance Criteria:**

**Given** I am on the Accounts screen
**When** I tap "Connect Uber Eats"
**Then** I see a secure login form for Uber credentials
**And** my credentials are transmitted securely

**Given** I enter valid Uber credentials
**When** I tap Connect
**Then** I see a loading indicator
**And** on success, I see "Uber Eats Connected" status
**And** initial sync begins automatically

**Prerequisites:** Story 3.1 (parallel implementation)

**Technical Notes:**
- Same security requirements as DoorDash
- Uber uses same login for Uber Rides and Uber Eats
- Ensure we only fetch Uber Eats (delivery) data, not rides
- Create LinkedAccount record with platform='uber_eats'

---

### Story 3.4: Uber Eats Earnings Sync Backend

**As a** user with a connected Uber Eats account,
**I want** my earnings to sync automatically,
**So that** I see my Uber Eats deliveries in Giglet.

**Acceptance Criteria:**

**Given** my Uber Eats account is connected
**When** the sync job runs
**Then** my recent deliveries are fetched from Uber Eats
**And** each delivery is stored with: timestamp, base_pay, tip, restaurant
**And** sync status is updated to "success" with timestamp

**Prerequisites:** Story 3.3

**Technical Notes:**
- Implement Uber session management
- Filter for Uber Eats deliveries only (not rides)
- Handle Uber's data format differences from DoorDash
- Same queuing and error handling as DoorDash

---

### Story 3.5: Account Connection Status Display

**As a** user,
**I want** to see the status of my connected accounts,
**So that** I know if my data is syncing correctly.

**Acceptance Criteria:**

**Given** I have connected accounts
**When** I view the Accounts screen
**Then** I see each platform with status: Connected/Syncing/Error
**And** I see the last successful sync timestamp
**And** for errors, I see a clear message and "Reconnect" button

**Given** no accounts are connected
**When** I view the Accounts screen
**Then** I see prompts to connect DoorDash and Uber Eats
**And** I understand the value of connecting ("See all earnings in one place")

**Prerequisites:** Story 3.2, Story 3.4

**Technical Notes:**
- Poll or use websockets for real-time status updates
- Status states: not_connected, connecting, connected, syncing, error
- Show human-readable timestamps ("Last synced 5 minutes ago")

---

### Story 3.6: Account Disconnection

**As a** user,
**I want** to disconnect a linked account,
**So that** I can remove access if needed.

**Acceptance Criteria:**

**Given** I have a connected account
**When** I tap "Disconnect" on that account
**Then** I see a confirmation dialog
**And** if confirmed, the connection is removed
**And** stored credentials are deleted
**And** historical earnings data is retained

**Given** I have disconnected an account
**When** I view my earnings history
**Then** I still see past earnings from that platform
**And** the platform is marked as "Disconnected" in history

**Prerequisites:** Story 3.5

**Technical Notes:**
- Securely delete credentials from database
- Keep Delivery records (orphaned but historical)
- Update LinkedAccount status, don't hard delete (audit trail)
- Stop any pending sync jobs for that account

---

### Story 3.7: Sync Failure Notifications

**As a** user,
**I want** to be notified when my account sync fails,
**So that** I can fix the issue and keep my data current.

**Acceptance Criteria:**

**Given** my account sync fails
**When** the failure is detected
**Then** I receive a push notification: "DoorDash sync failed. Tap to reconnect."
**And** I see an in-app alert on the Accounts screen
**And** tapping the notification opens the Accounts screen

**Given** sync has been failing for 24 hours
**When** I open the app
**Then** I see a prominent banner prompting reconnection

**Prerequisites:** Story 3.5

**Technical Notes:**
- Don't spam notifications - max 1 per 24 hours per platform
- Track failure count and duration
- Clear notifications when user reconnects successfully
- Use FCM (Android) and APNs (iOS)

---

## Epic 4: Earnings Dashboard

**Goal:** Display consolidated earnings from all connected platforms with useful breakdowns and insights.

**Value:** Users see their complete earnings picture in one place, answering "How much did I make?"

**Exit Criteria:**
- Today's total earnings displayed prominently
- Time period switching works (day/week/month/year)
- Platform breakdown shows DoorDash vs Uber Eats
- Individual delivery list is accessible

---

### Story 4.1: Today's Earnings Display

**As a** user,
**I want** to see my total earnings for today,
**So that** I know how much I've made.

**Acceptance Criteria:**

**Given** I have synced earnings
**When** I view the Earnings tab
**Then** I see today's total prominently displayed (large font)
**And** I see the breakdown by platform (DoorDash: $X, Uber Eats: $Y)
**And** the display updates after each sync

**Given** I have no earnings today
**When** I view the Earnings tab
**Then** I see $0.00 with encouraging message ("Start delivering to see earnings")

**Prerequisites:** Story 3.2, Story 3.4

**Technical Notes:**
- Query Delivery records for current day (user's timezone)
- Sum base_pay + tip for total
- Group by platform for breakdown
- Cache aggregations, invalidate on new sync

---

### Story 4.2: Time Period Switching

**As a** user,
**I want** to view earnings for different time periods,
**So that** I can track my income over time.

**Acceptance Criteria:**

**Given** I am on the Earnings tab
**When** I tap the time period selector
**Then** I can choose: Today, This Week, This Month, This Year
**And** selecting a period updates the displayed earnings
**And** the selected period is visually indicated

**Given** I select "This Week"
**When** the display updates
**Then** I see earnings from Monday to today (or Sunday to Saturday based on locale)
**And** I see the date range displayed ("Dec 23 - Dec 29")

**Prerequisites:** Story 4.1

**Technical Notes:**
- Week starts on Monday (ISO standard) or make configurable
- Month = calendar month
- Year = Jan 1 to today
- Consider adding custom date range in future (Story 4.6)

---

### Story 4.3: Platform Earnings Breakdown

**As a** user,
**I want** to see how much I earned from each platform,
**So that** I can compare DoorDash vs Uber Eats performance.

**Acceptance Criteria:**

**Given** I am on the Earnings tab
**When** I view the platform breakdown section
**Then** I see a visual representation (pie chart or bar chart)
**And** I see dollar amounts and percentages for each platform
**And** the breakdown reflects the selected time period

**Given** I only have earnings from one platform
**When** I view the breakdown
**Then** that platform shows 100%
**And** the other platform shows $0 (0%)

**Prerequisites:** Story 4.2

**Technical Notes:**
- Use charting library (Victory Native, FL Chart)
- Ensure accessible colors (not just red/green)
- Handle edge cases (no data, single platform)

---

### Story 4.4: Individual Delivery List

**As a** user,
**I want** to see a list of individual deliveries,
**So that** I can review specific orders and tips.

**Acceptance Criteria:**

**Given** I am on the Earnings tab
**When** I tap "View All Deliveries" or scroll to the list
**Then** I see a chronological list of deliveries
**And** each item shows: platform icon, time, total ($base + $tip), restaurant name
**And** the list is filtered by the selected time period

**Given** I tap on a delivery
**When** the detail view opens
**Then** I see full breakdown: base pay, tip, timestamp, restaurant, platform

**Prerequisites:** Story 4.2

**Technical Notes:**
- Paginate list (20-50 items per page)
- Lazy load for performance
- Show most recent first
- Platform icon for quick visual identification

---

### Story 4.5: Period Comparison

**As a** user,
**I want** to compare my earnings to the previous period,
**So that** I can see if I'm earning more or less.

**Acceptance Criteria:**

**Given** I am viewing "This Week"
**When** I see the comparison indicator
**Then** I see "vs last week: +$X (+Y%)" or "-$X (-Y%)"
**And** positive is green, negative is red
**And** the comparison is accurate

**Given** there's no data for the comparison period
**When** I view the comparison
**Then** I see "No data for last [period]" instead of comparison

**Prerequisites:** Story 4.2

**Technical Notes:**
- Compare equivalent periods (this week vs last week, etc.)
- Handle partial periods (if today is Wednesday, compare Mon-Wed vs last Mon-Wed)
- Calculate both absolute and percentage difference

---

### Story 4.6: Hourly Rate Calculation

**As a** user,
**I want** to see my effective hourly rate,
**So that** I understand my true earnings efficiency.

**Acceptance Criteria:**

**Given** I have mileage tracking data
**When** I view the hourly rate metric
**Then** I see "$/hour: $X.XX"
**And** this is calculated as: Total Earnings / Active Hours
**And** a tooltip explains how it's calculated

**Given** I don't have mileage tracking enabled
**When** I view this metric
**Then** I see "Enable mileage tracking to see hourly rate"

**Prerequisites:** Story 4.2, Story 6.1 (mileage tracking)

**Technical Notes:**
- Active hours = time between first and last delivery of shift
- Or derive from mileage trip data (more accurate)
- This is a Pro feature indicator - show locked state for free users

---

## Epic 5: Giglet Focus Zones

**Goal:** Provide real-time location intelligence showing the best areas for delivery drivers through the proprietary Focus Zones algorithm.

**Value:** This is the magic - "Stop guessing. Start earning." Users know where to position for maximum earnings.

**Exit Criteria:**
- Map displays with color-coded zones
- Giglet Score (0-100) shown for each zone
- Recommendation banner shows best zone
- Scores update periodically
- Users understand why zones are hot/cold

---

### Story 5.1: Focus Zones Map Display

**As a** user,
**I want** to see a map with Focus Zones,
**So that** I can visualize where delivery opportunities are.

**Acceptance Criteria:**

**Given** I am on the Map tab
**When** the map loads
**Then** I see a map centered on my current location
**And** zones are displayed as colored overlays (hot=red/orange, cold=blue)
**And** a legend explains the color scale
**And** my current location is marked

**Given** I pan/zoom the map
**When** I move to a new area
**Then** zones for that area load and display
**And** performance remains smooth

**Prerequisites:** Story 1.4

**Technical Notes:**
- Use Mapbox GL for cost efficiency
- Zones as H3 hexagons (resolution 8, ~0.5km)
- Render zones as GeoJSON polygons
- Cache zone data locally for performance
- Request location permission if not granted

---

### Story 5.2: Zone Scoring Algorithm Backend

**As a** system,
**I want** to calculate Giglet Scores for zones,
**So that** users see accurate opportunity assessments.

**Acceptance Criteria:**

**Given** zone scoring job runs
**When** it processes a zone
**Then** score is calculated using weighted factors:
- Restaurant density (0.25)
- Restaurant ratings (0.10)
- Meal time boost (0.20)
- Weather boost (0.20)
- Event boost (0.15)
- Traffic penalty (0.10)

**And** scores range from 0-100
**And** scores are stored with timestamp
**And** calculation completes within performance budget

**Prerequisites:** Story 1.2

**Technical Notes:**
- Fetch restaurant data from Google Places API
- Fetch weather from OpenWeather API
- Fetch events from Ticketmaster/Eventbrite APIs
- Cache API responses (1 hour for places, 15 min for weather)
- Run scoring job every 15 minutes
- Store in ZoneScore table with zone_id and timestamp

---

### Story 5.3: Meal Time Boost Logic

**As a** system,
**I want** to boost zone scores during meal times,
**So that** scores reflect typical demand patterns.

**Acceptance Criteria:**

**Given** it is 11:30 AM on a weekday
**When** zone scores are calculated
**Then** lunch boost is applied (factor: 1.3-1.5)

**Given** it is 6:30 PM on a weekend
**When** zone scores are calculated
**Then** dinner boost is applied (factor: 1.4-1.6)

**Given** it is 3:00 PM on a Tuesday
**When** zone scores are calculated
**Then** no meal time boost is applied (factor: 1.0)

**Prerequisites:** Story 5.2

**Technical Notes:**
- Define meal windows: Breakfast 7-10AM, Lunch 11AM-2PM, Dinner 5-9PM, Late 9PM-12AM
- Weekend dinner has higher boost than weekday
- Smooth transitions (don't jump from 1.0 to 1.5 instantly)
- Use user's timezone for calculations

---

### Story 5.4: Weather Impact Integration

**As a** system,
**I want** to boost zone scores during bad weather,
**So that** scores reflect increased delivery demand.

**Acceptance Criteria:**

**Given** it is raining in a zone
**When** zone scores are calculated
**Then** weather boost is applied (factor: 1.3-1.5)

**Given** it is snowing in a zone
**When** zone scores are calculated
**Then** weather boost is applied (factor: 1.5-1.8)

**Given** weather is clear and mild
**When** zone scores are calculated
**Then** no weather boost is applied (factor: 1.0)

**Prerequisites:** Story 5.2

**Technical Notes:**
- Use OpenWeather API current weather endpoint
- Conditions that boost: rain, snow, extreme cold, extreme heat
- Cache weather data per city (not per zone)
- Handle API failures gracefully (use last known or default)

---

### Story 5.5: Event Boost Integration

**As a** system,
**I want** to boost zone scores near events,
**So that** drivers know where demand will spike.

**Acceptance Criteria:**

**Given** a concert is happening at 8 PM in Zone X
**When** zone scores are calculated between 5 PM and 11 PM
**Then** Zone X and adjacent zones receive event boost (factor: 1.3-1.6)

**Given** a sports game is happening
**When** zone scores are calculated during game time
**Then** zones near the stadium receive event boost

**Given** no events are nearby
**When** zone scores are calculated
**Then** no event boost is applied

**Prerequisites:** Story 5.2

**Technical Notes:**
- Use Ticketmaster Discovery API and/or Eventbrite API
- Geocode event venues to zones
- Boost starts 2-3 hours before event, ends 2 hours after
- Scale boost by event size (stadium vs small venue)
- Cache event data daily

---

### Story 5.6: Zone Tap Detail View

**As a** user,
**I want** to tap a zone and see why it's hot or cold,
**So that** I understand the recommendation.

**Acceptance Criteria:**

**Given** I tap on a zone on the map
**When** the detail modal opens
**Then** I see the Giglet Score (0-100)
**And** I see contributing factors: "High restaurant density", "Rain expected", "Concert nearby"
**And** factors are listed with their impact (positive/negative icons)

**Given** a zone has score 85
**When** I view details
**Then** I understand this is a hot zone
**And** I see specific reasons (not just "score: 85")

**Prerequisites:** Story 5.2, Story 5.1

**Technical Notes:**
- Store factor breakdown with each score
- Display top 3-4 most impactful factors
- Use icons: restaurant icon, weather icon, event icon, traffic icon
- Show relative impact (high/medium/low)

---

### Story 5.7: Best Zone Recommendation Banner

**As a** user,
**I want** to see a recommendation of where to go,
**So that** I don't have to analyze the whole map.

**Acceptance Criteria:**

**Given** I am on the Map tab
**When** zones are loaded
**Then** I see a banner at the top: "Head to [Zone Name]. [Top Reason]."
**And** the banner updates when scores refresh
**And** tapping the banner centers the map on that zone

**Given** I am already in the highest-scoring zone
**When** I view the banner
**Then** I see "You're in a hot zone! [Score]"

**Prerequisites:** Story 5.6

**Technical Notes:**
- Find zone with highest score within reasonable distance
- Don't recommend zones 30+ minutes away
- Generate human-readable zone names (neighborhood names if possible)
- Update recommendation when scores refresh

---

### Story 5.8: Zone Score Refresh and Real-Time Updates

**As a** user,
**I want** zone scores to update regularly,
**So that** I have current information.

**Acceptance Criteria:**

**Given** I am viewing the map
**When** scores are recalculated (every 15 minutes)
**Then** the map updates to show new colors
**And** recommendation banner updates
**And** I see "Updated X minutes ago" indicator

**Given** I pull-to-refresh on the map
**When** refresh completes
**Then** I see the latest zone scores
**And** timestamp updates

**Prerequisites:** Story 5.2, Story 5.7

**Technical Notes:**
- Client polls for updates or uses websockets
- Smooth color transitions (don't flash)
- Show last update timestamp
- Manual refresh available for impatient users

---

## Epic 6: Automatic Mileage Tracking

**Goal:** Automatically track miles driven for tax deductions without requiring manual input from users.

**Value:** Eliminates the tedious task of mileage logging. Users just drive, and Giglet handles the rest.

**Exit Criteria:**
- Background mileage tracking works on iOS and Android
- Trips are detected automatically (start/stop)
- Mileage totals display with tax deduction estimate
- Battery usage is acceptable (<5% per day)

---

### Story 6.1: Location Permission and Tracking Enable

**As a** user,
**I want** to enable automatic mileage tracking,
**So that** my miles are logged without manual entry.

**Acceptance Criteria:**

**Given** I am setting up mileage tracking
**When** I tap "Enable Automatic Tracking"
**Then** I see clear explanation of why location is needed
**And** I am prompted for location permission ("Always Allow")
**And** if granted, tracking is enabled and indicator shown

**Given** I deny location permission
**When** I try to use mileage tracking
**Then** I see explanation of limitations
**And** I can enable manual-only mode
**And** I have option to open settings to grant permission

**Prerequisites:** Story 1.4

**Technical Notes:**
- iOS: Request "Always" authorization for background tracking
- Android: Request ACCESS_BACKGROUND_LOCATION
- Explain why "Always" is needed (not "While Using")
- Store tracking preference in user settings

---

### Story 6.2: Background Location Tracking

**As a** user with tracking enabled,
**I want** my location tracked in the background,
**So that** miles are logged even when I'm not looking at the app.

**Acceptance Criteria:**

**Given** tracking is enabled
**When** I am driving (moving >15 mph)
**Then** my location is recorded at reasonable intervals
**And** tracking continues even if app is backgrounded
**And** battery impact is minimal (<5% per day)

**Given** I am stationary for 5+ minutes
**When** tracking detects this
**Then** the current trip ends
**And** miles are calculated and saved

**Prerequisites:** Story 6.1

**Technical Notes:**
- iOS: Use Significant Location Changes API (battery efficient)
- Android: Use Fused Location Provider with ActivityRecognition
- Don't track continuously - use motion/activity triggers
- Store location points locally, batch upload
- Implement geofencing for known hot spots (optional optimization)

---

### Story 6.3: Trip Detection and Logging

**As a** user,
**I want** my trips automatically detected and logged,
**So that** I have accurate mileage records.

**Acceptance Criteria:**

**Given** I start driving
**When** motion is detected and speed >15 mph
**Then** a new trip begins recording

**Given** I am on a trip
**When** I stop moving for 5+ minutes
**Then** the trip ends
**And** trip is saved with: start time, end time, miles, route

**Given** I make a quick stop (<5 minutes)
**When** I continue driving
**Then** it's considered the same trip (not a new one)

**Prerequisites:** Story 6.2

**Technical Notes:**
- Calculate distance from location points (haversine formula)
- Store route as encoded polyline (space efficient)
- Handle GPS drift (filter out unrealistic jumps)
- Merge trips that are close together in time

---

### Story 6.4: Mileage Dashboard Display

**As a** user,
**I want** to see my tracked mileage and tax deduction estimate,
**So that** I understand my driving activity and tax benefit.

**Acceptance Criteria:**

**Given** I have tracked trips
**When** I view the Mileage tab
**Then** I see total miles: Today, This Week, This Month, This Year
**And** I see estimated tax deduction (miles × $0.67)
**And** the display uses large, readable numbers

**Given** tracking is not enabled
**When** I view the Mileage tab
**Then** I see prompt to enable tracking
**And** I see option for manual entry

**Prerequisites:** Story 6.3

**Technical Notes:**
- Use 2024 IRS mileage rate: $0.67/mile
- Update rate annually (make configurable)
- Time period selection similar to Earnings dashboard
- Show tracking status indicator

---

### Story 6.5: Trip History List

**As a** user,
**I want** to see a list of my tracked trips,
**So that** I can review my driving history.

**Acceptance Criteria:**

**Given** I have tracked trips
**When** I tap "View All Trips"
**Then** I see chronological list of trips
**And** each shows: date, start time, end time, miles
**And** I can tap a trip to see route on map (optional)

**Given** I tap on a trip
**When** the detail view opens
**Then** I see full trip info and (optionally) route visualization

**Prerequisites:** Story 6.4

**Technical Notes:**
- Paginate for performance
- Show most recent first
- Include platform icon if trip matched to delivery
- Route display is nice-to-have for MVP

---

### Story 6.6: Manual Trip Entry and Editing

**As a** user,
**I want** to manually add or edit trips,
**So that** I can fix errors or add trips when tracking wasn't enabled.

**Acceptance Criteria:**

**Given** I want to add a manual trip
**When** I tap "Add Trip"
**Then** I can enter: date, miles, start/end location (optional)
**And** manual trips are marked as "Manual" in list

**Given** I see an incorrect trip
**When** I tap Edit
**Then** I can modify the miles
**And** I can delete the trip
**And** changes are saved

**Prerequisites:** Story 6.5

**Technical Notes:**
- Manual trips should be distinguishable from automatic
- Allow deletion with confirmation
- Consider audit log for edited trips (tax compliance)
- This is a P2 feature - implement after core tracking works

---

### Story 6.7: Delivery-Trip Correlation

**As a** user,
**I want** my trips matched to my deliveries,
**So that** I have better documentation for taxes.

**Acceptance Criteria:**

**Given** I have synced earnings and tracked trips
**When** the correlation job runs
**Then** trips are matched to deliveries by timestamp proximity
**And** matched trips show "Delivery: [restaurant]" in detail view

**Given** a trip matches multiple deliveries
**When** viewing the trip
**Then** all matched deliveries are listed

**Prerequisites:** Story 6.3, Story 3.2

**Technical Notes:**
- Match by timestamp: delivery time within trip start/end
- Handle multi-drop trips (multiple deliveries per trip)
- Correlation improves tax documentation quality
- This is a P2 feature - nice to have for MVP

---

## Epic 7: Tax Export

**Goal:** Generate IRS-compliant reports for mileage and earnings that users can use for tax filing.

**Value:** Tax time goes from nightmare to one-tap export. Users save hours and reduce stress.

**Exit Criteria:**
- Mileage log exports in CSV and PDF format
- Earnings summary exports with platform breakdown
- Exports are IRS-compliant format
- Date range selection works

---

### Story 7.1: IRS Mileage Log Export

**As a** Pro user,
**I want** to export an IRS-compliant mileage log,
**So that** I can claim my mileage deduction at tax time.

**Acceptance Criteria:**

**Given** I am a Pro subscriber with tracked mileage
**When** I tap "Export Mileage Log"
**Then** I can select format: CSV or PDF
**And** the export includes: Date, Business Purpose, Start Location, End Location, Miles
**And** file downloads or opens share sheet

**Given** the export generates
**When** I open the file
**Then** it is properly formatted and complete
**And** it covers the selected date range

**Prerequisites:** Story 6.4, Story 8.2 (Pro subscription)

**Technical Notes:**
- CSV columns: Date, Purpose, From, To, Miles, Trip ID
- PDF should be print-ready with header and totals
- Business purpose defaults to "Delivery driving"
- Generate on device or via API (consider file size)

---

### Story 7.2: Earnings Summary Export

**As a** Pro user,
**I want** to export my earnings summary,
**So that** I have documentation of my income.

**Acceptance Criteria:**

**Given** I am a Pro subscriber with synced earnings
**When** I tap "Export Earnings Summary"
**Then** I can select format: CSV or PDF
**And** the export includes: Total earnings, breakdown by platform, breakdown by month
**And** file downloads or opens share sheet

**Prerequisites:** Story 4.2, Story 8.2

**Technical Notes:**
- CSV: One row per delivery or aggregated by month
- PDF: Summary report format with charts
- Include period covered prominently
- Platform logos in PDF if possible

---

### Story 7.3: Date Range Selection for Exports

**As a** user,
**I want** to select a custom date range for exports,
**So that** I can export exactly the data I need.

**Acceptance Criteria:**

**Given** I am exporting data
**When** I reach the date range step
**Then** I see presets: This Year, Last Year, Q1, Q2, Q3, Q4
**And** I can select custom start and end dates
**And** the export reflects my selection

**Given** I select "Last Year"
**When** export generates
**Then** it includes Jan 1 - Dec 31 of previous year only

**Prerequisites:** Story 7.1, Story 7.2

**Technical Notes:**
- Date picker component
- Presets for common tax scenarios
- Validate end date >= start date
- Show record count before export ("X trips, Y deliveries")

---

### Story 7.4: YTD Tax Deduction Display

**As a** user,
**I want** to see my year-to-date tax deduction estimate,
**So that** I know my current tax benefit.

**Acceptance Criteria:**

**Given** I have tracked mileage this year
**When** I view the Mileage tab or Tax Export screen
**Then** I see "YTD Mileage: X miles"
**And** I see "Estimated Deduction: $Y" (miles × $0.67)
**And** tooltip explains IRS mileage rate

**Given** it's a new year
**When** YTD resets
**Then** calculation starts from Jan 1 of current year

**Prerequisites:** Story 6.4

**Technical Notes:**
- Always show current year calculation
- Make IRS rate configurable (changes annually)
- This is informational - not tax advice (add disclaimer)

---

### Story 7.5: Export Share and Email

**As a** user,
**I want** to share or email my exports,
**So that** I can send them to my accountant.

**Acceptance Criteria:**

**Given** I have generated an export
**When** I tap Share
**Then** the native share sheet opens
**And** I can send via email, save to Files, AirDrop, etc.

**Given** I want to email directly
**When** I tap "Email to..."
**Then** I can enter an email address
**And** the export is sent as attachment

**Prerequisites:** Story 7.1, Story 7.2

**Technical Notes:**
- Use native share sheet (easiest)
- Direct email is nice-to-have
- Consider storing accountant email in settings
- This is P2 - share sheet covers most use cases

---

## Epic 8: Subscription & Payments

**Goal:** Implement the monetization layer with free tier limitations and Pro subscription via in-app purchase.

**Value:** Enables business sustainability while providing clear value differentiation between tiers.

**Exit Criteria:**
- Free tier has appropriate limitations
- Pro subscription purchasable (monthly and annual)
- Subscription status correctly gates features
- Users can restore purchases on new devices

---

### Story 8.1: Free Tier Feature Limitations

**As a** free user,
**I want** to understand what features require Pro,
**So that** I can decide whether to upgrade.

**Acceptance Criteria:**

**Given** I am a free user
**When** I try to access a Pro feature (auto sync, auto mileage, tax export)
**Then** I see the feature is locked
**And** I see clear explanation of what Pro unlocks
**And** I see "Upgrade to Pro" button

**Given** I am on the free tier
**When** I use the app
**Then** I can view Focus Zones map (free)
**And** I can manually enter mileage (limited)
**And** I see only 7 days of history

**Prerequisites:** Story 1.4

**Technical Notes:**
- Free tier: Focus Zones (view only), manual mileage, 7-day history
- Pro tier: Auto sync, auto mileage, unlimited history, tax export, alerts
- Store subscription status in user profile
- Check entitlements before feature access

---

### Story 8.2: Pro Monthly Subscription Purchase

**As a** user,
**I want** to subscribe to Pro monthly,
**So that** I can access all features.

**Acceptance Criteria:**

**Given** I am a free user
**When** I tap "Subscribe to Pro"
**Then** I see pricing: $4.99/month
**And** I can complete purchase via App Store / Play Store
**And** on success, Pro features unlock immediately
**And** I see confirmation of my subscription

**Given** purchase fails
**When** error occurs
**Then** I see user-friendly error message
**And** I can retry or contact support

**Prerequisites:** Story 8.1

**Technical Notes:**
- Use RevenueCat SDK for cross-platform consistency
- Configure products in App Store Connect and Google Play Console
- Verify receipt on backend
- Store subscription status server-side

---

### Story 8.3: Pro Annual Subscription Purchase

**As a** user,
**I want** to subscribe to Pro annually at a discount,
**So that** I save money on my subscription.

**Acceptance Criteria:**

**Given** I am on the upgrade screen
**When** I see subscription options
**Then** I see annual option: $34.99/year
**And** I see "Save 42%" compared to monthly
**And** purchasing works same as monthly

**Given** I am comparing options
**When** I view the upgrade screen
**Then** annual savings are clearly highlighted
**And** I understand the commitment

**Prerequisites:** Story 8.2

**Technical Notes:**
- Annual = $34.99 vs Monthly × 12 = $59.88 (42% savings)
- Same RevenueCat flow
- Consider offering annual as default/highlighted option

---

### Story 8.4: Subscription Status Display

**As a** Pro user,
**I want** to see my subscription status,
**So that** I know my plan and renewal date.

**Acceptance Criteria:**

**Given** I am a Pro subscriber
**When** I view Settings > Subscription
**Then** I see "Pro Monthly" or "Pro Annual"
**And** I see renewal date
**And** I see "Manage Subscription" link

**Given** I tap "Manage Subscription"
**When** the action completes
**Then** I am taken to App Store / Play Store subscription management

**Prerequisites:** Story 8.2

**Technical Notes:**
- Query RevenueCat for subscription info
- Deep link to platform subscription management
- Show days remaining if relevant

---

### Story 8.5: Subscription Cancellation Handling

**As a** user who cancels,
**I want** to retain access until my period ends,
**So that** I get what I paid for.

**Acceptance Criteria:**

**Given** I cancel my subscription
**When** the cancellation processes
**Then** I retain Pro access until the end of billing period
**And** I see "Your subscription ends on [date]"
**And** after that date, I'm downgraded to free

**Given** my subscription lapses
**When** I open the app after expiry
**Then** Pro features are locked
**And** my data is retained
**And** I can re-subscribe to regain access

**Prerequisites:** Story 8.4

**Technical Notes:**
- RevenueCat handles expiration dates
- Webhook for subscription status changes
- Don't delete user data on downgrade
- Show "Re-subscribe" prompt

---

### Story 8.6: Purchase Restoration

**As a** user on a new device,
**I want** to restore my subscription,
**So that** I don't have to pay again.

**Acceptance Criteria:**

**Given** I have an active subscription
**When** I log in on a new device and tap "Restore Purchases"
**Then** my subscription is verified
**And** Pro features unlock
**And** I see confirmation message

**Given** I have no active subscription
**When** I tap "Restore Purchases"
**Then** I see "No active subscription found"
**And** I'm prompted to subscribe

**Prerequisites:** Story 8.2

**Technical Notes:**
- RevenueCat restorePurchases() method
- Verify with App Store / Play Store
- Handle edge cases (expired, refunded, etc.)

---

## Epic 9: Settings & Profile

**Goal:** Provide user controls for preferences, account management, and legal compliance.

**Value:** Users can customize their experience and manage their account securely.

**Exit Criteria:**
- Users can edit profile information
- Notification preferences configurable
- Account deletion works (GDPR/CCPA)
- Legal documents accessible

---

### Story 9.1: Profile View and Edit

**As a** user,
**I want** to view and edit my profile,
**So that** my information is accurate.

**Acceptance Criteria:**

**Given** I am on the Profile/Settings screen
**When** I view my profile
**Then** I see my name and email
**And** I can edit my name
**And** email is displayed but not editable

**Given** I edit my name
**When** I save changes
**Then** my profile updates
**And** I see confirmation

**Prerequisites:** Story 2.2

**Technical Notes:**
- Email not editable (account identifier)
- Consider adding profile photo in future
- Validate name (not empty, reasonable length)

---

### Story 9.2: Notification Preferences

**As a** user,
**I want** to control which notifications I receive,
**So that** I'm not bothered by unwanted alerts.

**Acceptance Criteria:**

**Given** I am in Settings > Notifications
**When** I view notification options
**Then** I see toggles for: Push notifications, Focus Zone alerts, Sync error alerts
**And** I can turn each on/off independently
**And** changes save automatically

**Given** I disable Focus Zone alerts
**When** a zone heats up
**Then** I do not receive a push notification

**Prerequisites:** Story 1.4

**Technical Notes:**
- Store preferences in user profile
- Check preferences before sending notifications
- System notification permissions are separate (OS level)

---

### Story 9.3: Privacy Policy and Terms of Service

**As a** user,
**I want** to view the privacy policy and terms,
**So that** I understand how my data is used.

**Acceptance Criteria:**

**Given** I am in Settings
**When** I tap "Privacy Policy"
**Then** I see the full privacy policy (in-app or web)
**And** I can scroll through the entire document

**Given** I tap "Terms of Service"
**When** the document opens
**Then** I see the full terms of service

**Prerequisites:** Story 1.4

**Technical Notes:**
- Host documents on web, link from app
- Or embed as in-app webview
- Legal documents need review before launch
- Include required Apple/Google disclosures

---

### Story 9.4: Account Deletion

**As a** user,
**I want** to delete my account and all data,
**So that** I can exercise my privacy rights.

**Acceptance Criteria:**

**Given** I want to delete my account
**When** I tap "Delete Account"
**Then** I see warning about permanent deletion
**And** I must confirm (type "DELETE" or similar)
**And** on confirmation, deletion process starts

**Given** I confirm deletion
**When** deletion processes
**Then** my account is scheduled for deletion
**And** I am logged out
**And** within 30 days, all my data is permanently removed

**Prerequisites:** Story 2.2

**Technical Notes:**
- GDPR/CCPA compliance requirement
- Soft delete first, hard delete after 30 days (grace period)
- Delete: user record, linked accounts, deliveries, trips
- Send confirmation email
- Log deletion request for audit

---

### Story 9.5: Logout

**As a** user,
**I want** to log out of my account,
**So that** I can secure my session or switch accounts.

**Acceptance Criteria:**

**Given** I am logged in
**When** I tap "Log Out"
**Then** I see confirmation prompt
**And** if confirmed, I am logged out
**And** I am returned to the login screen
**And** my local session data is cleared

**Prerequisites:** Story 2.2

**Technical Notes:**
- Clear stored tokens (access + refresh)
- Clear cached user data
- Stop background tracking
- Don't clear app preferences (theme, etc.)

---

## Summary

| Epic | Stories | Priority | Dependencies |
|------|---------|----------|--------------|
| 1. Foundation | 5 | P0 | None |
| 2. User Authentication | 6 | P0 | Epic 1 |
| 3. Platform Account Linking | 7 | P0 | Epic 1, 2 |
| 4. Earnings Dashboard | 6 | P0 | Epic 3 |
| 5. Giglet Focus Zones | 8 | P0 | Epic 1 |
| 6. Automatic Mileage Tracking | 7 | P0 | Epic 1, 2 |
| 7. Tax Export | 5 | P1 | Epic 4, 6, 8 |
| 8. Subscription & Payments | 6 | P0 | Epic 2 |
| 9. Settings & Profile | 5 | P1 | Epic 2 |

**Total: 55 stories across 9 epics**

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._
