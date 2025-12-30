# Giglet - Product Requirements Document

**Author:** George
**Date:** 2024-12-30
**Version:** 1.0

---

## Executive Summary

Giglet is a mobile application designed exclusively for food delivery drivers who work on DoorDash and Uber Eats. Unlike existing tools that passively track what you already earned, Giglet actively tells you where to be for maximum earnings through its proprietary Focus Zones algorithm.

The app automatically syncs earnings from both platforms, tracks mileage in the background for tax deductions, and provides real-time location intelligence that no competitor offers. At half the price of Gridwise ($35/year vs $72/year), Giglet is the focused, affordable choice for the 2+ million delivery drivers in the US.

**Problem:** Delivery drivers waste time and money guessing where orders will be. They manually track earnings across apps and struggle with mileage logging for taxes.

**Solution:** Automatic everything - earnings sync, mileage tracking, and smart recommendations on where to position for the best deliveries.

### What Makes This Special

**"Stop guessing. Start earning."**

The magic of Giglet is the **Focus Zones** feature - a real-time heatmap that combines restaurant density, weather conditions, local events, traffic patterns, and crowd-sourced user data to tell drivers exactly where they should be positioned. This isn't just analytics about the past; it's actionable intelligence about right now.

When a driver opens Giglet, they see: *"Head to Midtown. Dinner rush starting, rain in forecast, concert at MSG tonight."* That moment of clarity - knowing exactly where to go instead of driving around hoping - is what makes users love this app.

---

## Project Classification

**Technical Type:** Mobile App (iOS + Android)
**Domain:** General Consumer / Gig Economy
**Complexity:** Medium

This is a cross-platform mobile application with:
- Background location services for mileage tracking
- External platform integrations (DoorDash, Uber Eats via account linking)
- Real-time data aggregation from multiple APIs (weather, events, places)
- Geospatial algorithms for zone scoring
- Subscription-based monetization

The domain is general consumer technology - no regulated industries (healthcare, fintech, etc.) are involved. The primary technical challenges are:
1. Reliable platform integration via account linking/scraping
2. Battery-efficient background location tracking
3. Real-time zone scoring algorithm performance

---

## Success Criteria

Success for Giglet means drivers genuinely rely on it to earn more money - not vanity metrics, but real utility.

### Primary Success Indicators

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Daily Active Users who check Focus Zones | 40%+ of MAU | Proves the core value prop works |
| Pro subscription retention (Month 3) | 70%+ | Users find ongoing value worth paying for |
| App Store rating | 4.5+ stars | Word-of-mouth driver for gig worker community |
| Earnings sync success rate | 95%+ | Core feature must be reliable |

### The Real Success Test

A driver who uses Giglet for a month should be able to say: *"I know where to go now. I waste less time. My taxes are handled."*

If we achieve that, the business metrics follow.

### Business Metrics

| Metric | 6 Month Target | 12 Month Target |
|--------|----------------|-----------------|
| Downloads | 10,000 | 50,000 |
| Pro Subscribers | 500 | 1,500 |
| Monthly Recurring Revenue | $2,500 | $4,200 |
| Annual Recurring Revenue | $30,000 | $50,000 |

**Revenue Model:**
- Free tier: Focus Zones map, manual mileage, 7-day history
- Pro tier: $4.99/month or $34.99/year - auto sync, auto mileage, unlimited history, tax export, alerts

---

## Product Scope

### MVP - Minimum Viable Product

The MVP must deliver complete value for the core use case: a delivery driver who wants to earn more and handle taxes easily.

**Must Have:**

1. **Automatic Earnings Sync**
   - Connect DoorDash account → see all deliveries synced
   - Connect Uber Eats account → see all deliveries synced
   - Unified dashboard showing combined earnings
   - Daily, weekly, monthly, yearly views

2. **Giglet Focus Zones**
   - Map with color-coded zones (hot to cold)
   - Giglet Score (0-100) for each zone
   - Explanation of why zones are hot/cold
   - "Head to [Zone]" recommendation banner
   - Updates every 15 minutes

3. **Automatic Mileage Tracking**
   - Background GPS tracking while driving
   - Smart trip detection (auto start/stop)
   - Running total with IRS deduction estimate
   - Trip history with miles per trip

4. **Tax Export (Pro)**
   - IRS-compliant mileage log (CSV + PDF)
   - Earnings summary by platform
   - Date range selection

5. **Subscription & Payments**
   - Free tier with limited features
   - Pro tier via App Store / Play Store
   - Clear upgrade prompts

### Growth Features (Post-MVP)

- Push notifications when zones heat up
- Predicted busy times (hour-by-hour forecast)
- Earnings-per-hour analytics
- Tip percentage trends
- Zone performance history ("You earned 20% more in Brooklyn on Saturdays")

### Vision (Future)

- Grubhub integration (if user demand)
- AI-powered personal recommendations ("Based on your patterns, try Zone X tonight")
- Driver community features (anonymized insights sharing)
- Integration with tax filing services
- Expense tracking beyond mileage

---

## Mobile App Specific Requirements

### Platform Support

| Platform | Minimum Version | Coverage |
|----------|-----------------|----------|
| iOS | 15.0+ | ~95% of iPhones |
| Android | API 26 (8.0 Oreo)+ | ~95% of Android devices |

### Development Approach

**Recommended:** React Native or Flutter for single codebase

Rationale:
- Ship to both platforms simultaneously
- Faster iteration for small team
- Strong ecosystem for maps, location, payments
- Acceptable performance for this use case

### Device Features Required

| Feature | iOS | Android | Purpose |
|---------|-----|---------|---------|
| Background Location | Always | Foreground Service | Mileage tracking |
| Push Notifications | APNs | FCM | Zone alerts |
| Secure Storage | Keychain | EncryptedSharedPrefs | Credentials |
| Network | Required | Required | Data sync |

### Offline Capabilities

- Mileage tracking continues offline (queued for sync)
- Last-known Focus Zones cached and displayed
- Earnings history viewable offline
- Sync automatically when connection restored

### App Store Compliance

**iOS Background Location Justification:**
"Giglet tracks mileage for tax deductions while you deliver. Background location is required to accurately log miles driven during your delivery shifts, even when the app isn't in the foreground."

**Required Privacy Disclosures:**
- Location data: Used for mileage tracking and zone recommendations
- Linked platform credentials: Encrypted, used only for earnings sync
- Analytics: Anonymous usage for app improvement

---

## User Experience Principles

### Visual Personality

- **Clean and utilitarian** - drivers glance at phones quickly
- **High contrast** - readable in bright sunlight or dark car
- **Minimal text** - icons and colors convey meaning
- **Dark mode default** - easier on eyes during night driving

### Design Philosophy

"Glanceable intelligence" - a driver stopped at a red light should understand their situation in 2 seconds:
- Where's hot right now? (map colors)
- How much did I make today? (big number)
- Am I tracking miles? (indicator)

### Key Interactions

1. **Focus Zones Map**
   - Full-screen map as primary view
   - Tap zone → see score + factors
   - Recommendation banner always visible at top
   - Current location prominent

2. **Earnings Dashboard**
   - Today's total front and center
   - Swipe to change time period
   - Tap for detailed breakdown
   - Platform icons for quick identification

3. **Account Linking**
   - Simple "Connect DoorDash" / "Connect Uber Eats" buttons
   - Clear status indicators (connected, syncing, error)
   - Non-technical error messages ("We couldn't connect. Try again?")

4. **Mileage Tracking**
   - Always-visible indicator when tracking
   - Manual override easily accessible
   - Battery usage shown transparently

---

## Functional Requirements

### FR-1: User Authentication

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-1.1 | Email/password registration | P0 | Valid email, 8+ char password, confirmation email |
| FR-1.2 | Apple Sign In (iOS) | P1 | Native Apple authentication flow |
| FR-1.3 | Google Sign In | P1 | Works on both platforms |
| FR-1.4 | Password reset | P1 | Email-based secure reset flow |
| FR-1.5 | Session persistence | P0 | Stay logged in until explicit logout |

### FR-2: Platform Account Linking

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-2.1 | DoorDash account connection | P0 | Secure login, credentials encrypted, sync triggered |
| FR-2.2 | Uber Eats account connection | P0 | Secure login, credentials encrypted, sync triggered |
| FR-2.3 | Connection status display | P0 | Show connected/syncing/error state per platform |
| FR-2.4 | Manual sync trigger | P1 | User can force refresh |
| FR-2.5 | Account disconnection | P1 | Remove credentials, retain historical data |
| FR-2.6 | Sync failure notification | P1 | Push + in-app alert when connection breaks |

**Technical Note:** Platform integration via account linking + session-based data retrieval. Must handle token expiration gracefully.

### FR-3: Earnings Dashboard

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-3.1 | Today's total earnings | P0 | Sum of all deliveries today, updates on sync |
| FR-3.2 | Period selection | P0 | Day, week, month, year, custom range |
| FR-3.3 | Platform breakdown | P1 | Visual split between DoorDash and Uber Eats |
| FR-3.4 | Individual delivery list | P1 | Date, time, earnings, tip, platform, restaurant |
| FR-3.5 | Period comparison | P2 | This week vs last week, etc. |
| FR-3.6 | Hourly rate calculation | P2 | Earnings / active hours |

### FR-4: Giglet Focus Zones (Core Differentiator)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-4.1 | Zone map display | P0 | Map with color-coded zones, centered on user location |
| FR-4.2 | Giglet Score per zone | P0 | 0-100 score displayed on zone tap |
| FR-4.3 | Score factor breakdown | P1 | Show why zone is hot/cold (weather, events, etc.) |
| FR-4.4 | Top recommendation | P1 | Banner: "Head to [Zone]. [Reason]." |
| FR-4.5 | Score refresh | P0 | Update every 15 minutes |
| FR-4.6 | Hot zone alerts (Pro) | P2 | Push notification when nearby zone heats up |
| FR-4.7 | Time-based forecast | P2 | Predicted scores for next few hours |

**Algorithm (v1):**
```
GigletScore(zone, time) =
    (RestaurantDensity × 0.25) +
    (RestaurantRatings × 0.10) +
    (MealTimeBoost × 0.20) +
    (WeatherBoost × 0.20) +
    (EventBoost × 0.15) +
    (TrafficPenalty × 0.10)
```

Future: Add UserEarningsData factor as user base grows.

### FR-5: Automatic Mileage Tracking

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-5.1 | Enable background tracking | P0 | Location permission request with clear explanation |
| FR-5.2 | Automatic trip detection | P0 | Start when driving, stop after 5+ min stationary |
| FR-5.3 | Mileage totals display | P0 | Today, week, month, year with tax deduction estimate |
| FR-5.4 | Trip history | P1 | List of trips with date, miles, start/end time |
| FR-5.5 | Manual start/stop | P1 | Override for users who prefer control |
| FR-5.6 | Trip editing | P2 | Edit miles, delete trips, add manual trips |
| FR-5.7 | Delivery correlation | P2 | Match trips to deliveries by timestamp |

**Technical:** Use iOS Significant Location Changes + Android Fused Location with activity recognition. Target <5% daily battery impact.

### FR-6: Tax Export (Pro Feature)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-6.1 | IRS mileage log export | P0 | CSV + PDF with date, purpose, locations, miles |
| FR-6.2 | Earnings summary export | P0 | CSV + PDF with totals by platform and month |
| FR-6.3 | Date range selection | P1 | Custom range + presets (This Year, Q1-Q4, etc.) |
| FR-6.4 | YTD deduction display | P1 | Miles × IRS rate shown on dashboard |
| FR-6.5 | Share/email export | P2 | Native share sheet integration |

### FR-7: Subscription Management

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-7.1 | Free tier limitations | P0 | Focus Zones viewable, sync/mileage/export locked |
| FR-7.2 | Pro monthly purchase | P0 | $4.99/month via App Store / Play Store |
| FR-7.3 | Pro annual purchase | P0 | $34.99/year with "Save 42%" messaging |
| FR-7.4 | Upgrade prompts | P0 | Clear CTAs when accessing locked features |
| FR-7.5 | Subscription status | P1 | Show current plan, renewal date |
| FR-7.6 | Restore purchases | P1 | Recover subscription on new device |
| FR-7.7 | Cancellation handling | P0 | Access until period end, then downgrade |

### FR-8: Settings & Profile

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-8.1 | Profile management | P1 | View/edit name, view email |
| FR-8.2 | Notification preferences | P1 | Toggle push, zone alerts, sync errors |
| FR-8.3 | Mileage tracking preferences | P1 | Auto vs manual mode |
| FR-8.4 | Privacy policy / ToS | P1 | Links to legal documents |
| FR-8.5 | Account deletion | P1 | GDPR/CCPA compliant full deletion |
| FR-8.6 | Logout | P0 | Clear session, return to login |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| App cold start | < 3 seconds | Drivers need quick access |
| Map load time | < 2 seconds | Primary screen must be snappy |
| API response (p95) | < 500ms | Responsive feel |
| Sync completion | < 30 seconds | Background, but shouldn't feel stuck |
| Offline → online sync | < 10 seconds | Quick reconciliation |

### Security

| Requirement | Implementation |
|-------------|----------------|
| Transport security | HTTPS/TLS 1.3 for all API calls |
| Credential storage | AES-256 encryption at rest |
| API authentication | JWT with refresh tokens |
| Platform credentials | Encrypted, never logged, never transmitted to third parties |
| Input validation | Server-side validation on all endpoints |
| Rate limiting | Protect against abuse |

### Scalability

- **Initial target:** 100,000 users
- **Architecture:** Stateless API servers (horizontal scaling)
- **Database:** PostgreSQL with PostGIS for geospatial queries
- **Background jobs:** Queue-based processing (Bull/Celery) for syncs
- **Caching:** Zone scores cached, refreshed every 15 minutes
- **CDN:** Static assets served via CDN

### Accessibility

- VoiceOver / TalkBack support for core flows
- Minimum touch target size (44x44pt)
- Color-blind friendly zone colors (not just red/green)
- High contrast mode support

### Integration

| External Service | Purpose | Criticality |
|------------------|---------|-------------|
| Google Places API | Restaurant density for zones | High |
| OpenWeather API | Weather boost factor | High |
| Ticketmaster/Eventbrite | Event boost factor | Medium |
| Google Maps Traffic | Traffic penalty factor | Medium |
| Mapbox | Map rendering | High |
| RevenueCat | Subscription management | High |
| Firebase/Auth0 | Authentication | High |

---

## Implementation Planning

### Epic Breakdown

| Epic | Description | Priority | Est. Effort |
|------|-------------|----------|-------------|
| E1: User Onboarding | Auth, registration, onboarding flow | P0 | 1 week |
| E2: Platform Linking | DoorDash + Uber Eats account connection + sync | P0 | 2 weeks |
| E3: Earnings Dashboard | Display synced earnings, breakdowns, history | P0 | 1.5 weeks |
| E4: Focus Zones | Map, scoring algorithm, recommendations | P0 | 2.5 weeks |
| E5: Mileage Tracking | Background GPS, trip detection, history | P0 | 2 weeks |
| E6: Tax Export | PDF/CSV generation, date ranges | P1 | 1 week |
| E7: Subscriptions | Paywall, purchase flows, entitlements | P0 | 1 week |
| E8: Settings | Profile, preferences, account management | P1 | 0.5 weeks |

### Recommended Phase Plan

**Phase 1: Foundation (Weeks 1-6)**
- E1: User Onboarding
- E2: Platform Linking
- E3: Earnings Dashboard
- Exit: Users can sign up, link accounts, see synced earnings

**Phase 2: Differentiation (Weeks 7-10)**
- E4: Focus Zones (complete)
- Exit: Focus Zones map working with real-time scores

**Phase 3: Complete Value (Weeks 11-14)**
- E5: Mileage Tracking
- E6: Tax Export
- E7: Subscriptions
- E8: Settings
- Exit: Full Pro feature set, payments working

**Phase 4: Launch (Weeks 15-16)**
- Beta testing (TestFlight / internal track)
- Bug fixes and polish
- App Store / Play Store submission
- Marketing prep

---

## References

- Competitive analysis: Gridwise ($10/mo), Stride (free, mileage only), Everlance ($8/mo)
- Market research: DoorDash (60-67% share) + Uber Eats (23-26% share) = ~85-90% of US food delivery
- Target market: ~2 million active food delivery drivers in US
- Revenue target: $50,000 ARR (1,500 Pro subscribers at ~$35/year)

---

## Next Steps

1. **Epic & Story Breakdown** - Run: `workflow create-epics-and-stories`
2. **Architecture** - Run: `workflow architecture`
3. **UX Design** - Run: `workflow create-ux-design`

---

*This PRD captures the essence of Giglet - the moment a delivery driver stops guessing and starts knowing exactly where to earn.*

*Created through collaborative discovery between George and AI facilitator.*
