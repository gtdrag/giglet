# Giglet - Product Requirements Document (MVP)

**Version:** 1.0
**Date:** December 30, 2024
**Status:** Ready for Planning
**Author:** Product Team

---

## 1. Executive Summary

### 1.1 Product Overview
Giglet is a mobile application designed for food delivery drivers who work on DoorDash and Uber Eats. The app provides automatic earnings tracking, automatic mileage logging, and a proprietary "Focus Zones" feature that recommends optimal locations for maximizing earnings.

### 1.2 Problem Statement
Food delivery drivers currently lack tools that:
- Automatically consolidate earnings across multiple platforms
- Track mileage for tax deductions without manual entry
- Provide actionable, real-time guidance on where to position themselves for maximum earnings

Existing solutions (e.g., Gridwise) are expensive ($10/month), bloated with features for rideshare drivers, and don't provide proactive location recommendations.

### 1.3 Solution
Giglet is a focused, delivery-only app that:
1. Automatically syncs earnings from DoorDash and Uber Eats
2. Automatically tracks mileage in the background
3. Provides proprietary "Giglet Focus Zones" - a heatmap showing optimal positioning based on restaurant density, weather, events, traffic, and crowd-sourced user data
4. Exports tax-ready reports

### 1.4 Target Market
- Primary: Full-time food delivery drivers (work 30+ hours/week)
- Secondary: Part-time/side-hustle delivery drivers
- Geography: United States (initial launch)
- Market size: ~2-3 million active delivery drivers in the US

### 1.5 Business Model
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Focus Zones map, manual mileage entry, 7-day history |
| Pro | $4.99/month or $34.99/year | Auto earnings sync, auto mileage, unlimited history, tax export, push alerts |

**Revenue Target:** $50,000 ARR (Year 1) = ~1,500 Pro subscribers

---

## 2. Goals & Success Metrics

### 2.1 Business Goals
| Goal | Target | Timeframe |
|------|--------|-----------|
| App downloads | 10,000 | 6 months post-launch |
| Pro subscribers | 500 | 6 months post-launch |
| Pro subscribers | 1,500 | 12 months post-launch |
| Monthly Recurring Revenue | $2,500 | 6 months post-launch |
| Annual Recurring Revenue | $50,000 | 12 months post-launch |

### 2.2 Product Goals
| Goal | Target | Timeframe |
|------|--------|-----------|
| App Store rating | 4.5+ stars | 3 months post-launch |
| DAU/MAU ratio | 40%+ | 3 months post-launch |
| Earnings sync success rate | 95%+ | Launch |
| Mileage tracking accuracy | 98%+ | Launch |

### 2.3 Key Performance Indicators (KPIs)
- **Activation rate:** % of signups who link at least one platform account
- **Sync success rate:** % of sync attempts that complete successfully
- **Free-to-paid conversion:** % of free users who upgrade to Pro
- **Churn rate:** % of Pro subscribers who cancel per month
- **Feature adoption:** % of users who view Focus Zones daily

---

## 3. User Personas

### 3.1 Primary Persona: "Full-Time Frankie"
- **Demographics:** 28-45 years old, drives 35-50 hours/week
- **Platforms:** Uses both DoorDash and Uber Eats, switches based on demand
- **Pain points:**
  - Manually tracking earnings across apps is tedious
  - Doesn't know where to position during slow periods
  - Mileage tracking for taxes is a nightmare
  - Current tools are too expensive for the value
- **Goals:**
  - Maximize earnings per hour
  - Minimize dead time between orders
  - Have taxes handled automatically
- **Tech comfort:** Moderate - uses smartphone daily, comfortable with apps

### 3.2 Secondary Persona: "Side-Hustle Sam"
- **Demographics:** 22-35 years old, drives 10-15 hours/week evenings/weekends
- **Platforms:** Primarily DoorDash, occasionally Uber Eats
- **Pain points:**
  - Doesn't know the best times/areas to drive in limited time
  - Forgets to track mileage
  - Unsure if gig work is worth it after expenses
- **Goals:**
  - Make the most of limited driving time
  - Understand true profitability after expenses
- **Tech comfort:** High - early adopter, tries new apps

---

## 4. Feature Requirements

### 4.1 Epic 1: User Onboarding & Authentication

#### User Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-1.1 | As a new user, I can create an account with email/password so that I can access the app | P0 | - Email validation<br>- Password requirements (8+ chars, 1 number)<br>- Confirmation email sent<br>- Account created in database |
| US-1.2 | As a new user, I can sign up with Apple/Google SSO so that registration is faster | P1 | - Apple Sign In works on iOS<br>- Google Sign In works on both platforms<br>- Account linked to SSO provider |
| US-1.3 | As a new user, I see an onboarding flow explaining the app's value | P1 | - 3-4 screen walkthrough<br>- Skip option available<br>- Only shown once |
| US-1.4 | As a user, I can log in to my existing account | P0 | - Email/password login<br>- SSO login<br>- "Forgot password" flow |
| US-1.5 | As a user, I can reset my password if forgotten | P1 | - Reset email sent<br>- Secure token-based reset<br>- Password updated |

---

### 4.2 Epic 2: Platform Account Linking

#### User Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-2.1 | As a user, I can link my DoorDash account so that my earnings sync automatically | P0 | - Secure login flow<br>- Credentials encrypted at rest<br>- Connection status shown<br>- Initial sync triggered |
| US-2.2 | As a user, I can link my Uber Eats account so that my earnings sync automatically | P0 | - Secure login flow<br>- Credentials encrypted at rest<br>- Connection status shown<br>- Initial sync triggered |
| US-2.3 | As a user, I can see the status of my linked accounts (connected, syncing, error) | P0 | - Status indicator for each platform<br>- Last sync timestamp<br>- Error message if sync failed |
| US-2.4 | As a user, I can disconnect a linked account | P1 | - One-tap disconnect<br>- Confirmation prompt<br>- Credentials deleted<br>- Historical data retained |
| US-2.5 | As a user, I can manually trigger a sync refresh | P1 | - Refresh button on accounts screen<br>- Loading indicator during sync<br>- Success/error feedback |
| US-2.6 | As a user, I receive a notification if my account connection breaks | P1 | - Push notification sent<br>- In-app alert shown<br>- Clear remediation steps |

#### Technical Requirements
- Credentials must be encrypted using AES-256 before storage
- Sync jobs run in background queue (not blocking UI)
- Implement exponential backoff for failed syncs
- Rate limit sync requests to avoid platform detection
- Session management to handle token expiration

#### Dependencies
- DoorDash login flow reverse engineering
- Uber Eats login flow reverse engineering
- Background job processing infrastructure

---

### 4.3 Epic 3: Earnings Dashboard

#### User Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-3.1 | As a user, I can see my total earnings for today | P0 | - Sum of all deliveries today<br>- Breakdown by platform<br>- Updates after each sync |
| US-3.2 | As a user, I can see my earnings for this week, month, and year | P0 | - Week: Mon-Sun totals<br>- Month: calendar month<br>- Year: Jan 1 - current<br>- Comparison to previous period |
| US-3.3 | As a user, I can see a list of individual deliveries | P1 | - Date/time of delivery<br>- Platform (DoorDash/Uber Eats icon)<br>- Base pay + tip breakdown<br>- Restaurant name (if available) |
| US-3.4 | As a user, I can see my earnings broken down by platform | P1 | - Pie chart or bar chart<br>- DoorDash vs Uber Eats<br>- Percentage and dollar amounts |
| US-3.5 | As a user, I can see my hourly earnings rate | P2 | - Total earnings / active hours<br>- Requires active time tracking<br>- Show trend over time |
| US-3.6 | As a user, I can see my tip percentage trends | P2 | - Tips as % of total earnings<br>- Trend over time<br>- By platform comparison |

#### Data Requirements
- Delivery record: timestamp, platform, base_pay, tip, restaurant_name, zone_id
- Aggregations: daily, weekly, monthly, yearly, all-time
- Platform breakdown calculations

---

### 4.4 Epic 4: Giglet Focus Zones

#### User Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-4.1 | As a user, I can view a map showing Focus Zones in my area | P0 | - Map centered on current location<br>- Color-coded zones (hot to cold)<br>- Legend explaining colors |
| US-4.2 | As a user, I can see a "Giglet Score" (0-100) for each zone | P0 | - Score displayed on zone tap<br>- Higher = better opportunity<br>- Factors listed |
| US-4.3 | As a user, I can see why a zone is rated hot or cold | P1 | - Tooltip/modal on zone tap<br>- Lists contributing factors<br>- e.g., "High restaurant density, rain expected, concert nearby" |
| US-4.4 | As a user, I receive a recommendation of the best zone to head to | P1 | - Banner or card at top of map<br>- "Head to [Zone]. [Reason]."<br>- Updates in real-time |
| US-4.5 | As a user, I can receive push notifications when a zone near me heats up | P2 (Pro) | - Configurable notifications<br>- Throttled to avoid spam (max 3/day)<br>- Tapping opens map to zone |
| US-4.6 | As a user, I can see predicted busy times for zones (hour-by-hour) | P2 | - Time slider or list view<br>- Shows projected scores by hour<br>- Based on historical patterns |

#### Algorithm Requirements (v1)
```
GigletScore(zone, time) =
    (RestaurantDensity × 0.25) +
    (RestaurantRatings × 0.10) +
    (MealTimeBoost × 0.20) +
    (WeatherBoost × 0.20) +
    (EventBoost × 0.15) +
    (TrafficPenalty × 0.10)
```

Future (v2+): Add `UserEarningsData` factor weighted by sample size

#### External API Dependencies
| Data | API | Cost |
|------|-----|------|
| Restaurant locations | Google Places API | $17 per 1000 requests |
| Restaurant ratings | Google Places API | Included above |
| Weather | OpenWeather API | Free tier: 1000 calls/day |
| Events | Ticketmaster Discovery API | Free tier: 5000 calls/day |
| Traffic | Google Maps Traffic | $10 per 1000 requests |

#### Technical Requirements
- Zone granularity: H3 hexagons (resolution 8, ~0.5km radius)
- Score recalculation: every 15 minutes
- Cache zone scores to minimize API calls
- Map SDK: Mapbox GL (more cost-effective than Google Maps at scale)

---

### 4.5 Epic 5: Automatic Mileage Tracking

#### User Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-5.1 | As a user, I can enable automatic mileage tracking | P0 | - Permission request for location (always)<br>- Clear explanation of why needed<br>- Toggle to enable/disable |
| US-5.2 | As a user, my miles are tracked automatically while I'm driving | P0 | - Background location tracking<br>- Trip detection (start when moving, stop when stationary 5+ min)<br>- Accurate within 2% |
| US-5.3 | As a user, I can see my mileage for today, this week, month, and year | P0 | - Total miles per period<br>- Estimated tax deduction ($0.67/mile for 2024) |
| US-5.4 | As a user, I can see a list of individual trips with miles | P1 | - Date, start time, end time<br>- Miles driven<br>- Route on map (optional) |
| US-5.5 | As a user, I can manually start/stop trip tracking | P1 | - Manual mode toggle<br>- Start/stop button<br>- For users who prefer control |
| US-5.6 | As a user, I can edit or delete incorrectly logged trips | P2 | - Edit miles manually<br>- Delete trip<br>- Add trip manually |
| US-5.7 | As a user, my trips are matched to my deliveries when possible | P2 | - Correlate by timestamp<br>- Show which delivery a trip was for<br>- Improves tax documentation |

#### Technical Requirements
- Use iOS Significant Location Changes API (battery efficient)
- Use Android Fused Location Provider with activity recognition
- Store route as encoded polyline (space efficient)
- Battery usage target: <5% per day of tracking
- Offline support: queue trips locally, sync when online

#### Privacy & Compliance
- Clear privacy policy explaining location data usage
- Data stored only on user's device + our servers (not shared)
- GDPR/CCPA compliant data deletion on request
- App Store / Play Store location permission justification

---

### 4.6 Epic 6: Tax Export

#### User Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-6.1 | As a Pro user, I can export an IRS-compliant mileage log | P0 (Pro) | - CSV and PDF formats<br>- Includes: date, purpose, start/end location, miles<br>- IRS-compliant format |
| US-6.2 | As a Pro user, I can export an earnings summary by platform | P0 (Pro) | - CSV and PDF formats<br>- Total earnings by platform<br>- Monthly breakdown |
| US-6.3 | As a Pro user, I can see my estimated tax deduction year-to-date | P1 (Pro) | - Miles × IRS rate ($0.67/mile)<br>- Displayed on dashboard<br>- Updated in real-time |
| US-6.4 | As a Pro user, I can select a custom date range for exports | P1 (Pro) | - Date picker for start/end<br>- Preset options (This Year, Last Year, Q1-Q4) |
| US-6.5 | As a Pro user, I can email exports to myself or my accountant | P2 (Pro) | - Share sheet integration<br>- Direct email option |

#### Export Format Requirements
**Mileage Log CSV columns:**
- Date
- Business Purpose (default: "Delivery driving")
- Starting Location
- Ending Location
- Miles Driven
- Matched Delivery ID (if applicable)

**Earnings Summary PDF includes:**
- Period covered
- Total earnings
- Breakdown by platform
- Breakdown by month
- Total miles driven
- Estimated mileage deduction

---

### 4.7 Epic 7: Subscription & Payments

#### User Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-7.1 | As a free user, I see Pro features as locked with upgrade prompts | P0 | - Clear visual distinction<br>- "Upgrade to Pro" CTA<br>- Feature explanation |
| US-7.2 | As a user, I can subscribe to Pro monthly ($4.99/mo) | P0 | - Apple In-App Purchase (iOS)<br>- Google Play Billing (Android)<br>- Subscription activated immediately |
| US-7.3 | As a user, I can subscribe to Pro annually ($34.99/yr) | P0 | - Discounted rate shown<br>- "Save 42%" messaging<br>- Same activation flow |
| US-7.4 | As a Pro user, I can manage my subscription (cancel, change plan) | P1 | - Link to App Store / Play Store subscription management<br>- Current plan status shown |
| US-7.5 | As a Pro user, I retain access until end of billing period after canceling | P0 | - Grace period handled correctly<br>- Downgrade to free at period end |
| US-7.6 | As a user, I can restore my subscription on a new device | P1 | - "Restore Purchases" button<br>- Verifies with App Store / Play Store |

#### Technical Requirements
- RevenueCat SDK for cross-platform subscription management (recommended)
- Or native StoreKit 2 (iOS) + Google Play Billing Library (Android)
- Webhook handling for subscription status changes
- Receipt validation server-side

---

### 4.8 Epic 8: Settings & Profile

#### User Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-8.1 | As a user, I can view and edit my profile (name, email) | P1 | - Edit name<br>- View email (not editable)<br>- Save changes |
| US-8.2 | As a user, I can configure notification preferences | P1 | - Toggle push notifications<br>- Toggle Focus Zone alerts<br>- Toggle sync error alerts |
| US-8.3 | As a user, I can configure mileage tracking preferences | P1 | - Auto vs manual mode<br>- Tracking sensitivity |
| US-8.4 | As a user, I can view the privacy policy and terms of service | P1 | - Links to web-hosted documents<br>- Or in-app webview |
| US-8.5 | As a user, I can delete my account and all data | P1 | - Confirmation required<br>- All data deleted within 30 days<br>- GDPR/CCPA compliance |
| US-8.6 | As a user, I can contact support | P2 | - Email link<br>- Or in-app chat (future) |
| US-8.7 | As a user, I can log out | P0 | - Clear local session<br>- Return to login screen |

---

## 5. Technical Requirements

### 5.1 Platform Support
| Platform | Minimum Version | Notes |
|----------|-----------------|-------|
| iOS | 15.0+ | Covers 95%+ of devices |
| Android | API 26 (8.0)+ | Covers 95%+ of devices |

### 5.2 Technology Stack (Recommended)
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Mobile Framework | React Native or Flutter | Single codebase for iOS + Android |
| Backend | Node.js (Express) or Python (FastAPI) | Team familiarity, ecosystem |
| Database | PostgreSQL with PostGIS | Geospatial queries for zones |
| Authentication | Firebase Auth or Auth0 | Faster implementation |
| Background Jobs | Bull (Node) or Celery (Python) | Reliable job processing for syncs |
| Maps | Mapbox GL | Cost-effective at scale |
| Subscriptions | RevenueCat | Cross-platform subscription handling |
| Analytics | Mixpanel or Amplitude | Product analytics |
| Crash Reporting | Sentry | Error monitoring |
| Hosting | Railway, Render, or AWS | Start simple, scale later |

### 5.3 Security Requirements
- All API communication over HTTPS/TLS 1.3
- User credentials for linked platforms encrypted with AES-256
- API authentication via JWT with refresh tokens
- Rate limiting on all endpoints
- Input validation and sanitization
- No sensitive data in logs
- SOC 2 compliance (future consideration)

### 5.4 Performance Requirements
| Metric | Target |
|--------|--------|
| App cold start | < 3 seconds |
| API response time (p95) | < 500ms |
| Map load time | < 2 seconds |
| Background battery usage | < 5% per day |
| Offline functionality | Core features work offline, sync when online |

### 5.5 Scalability Considerations
- Design for 100K users initially
- Stateless API servers (horizontal scaling)
- Database connection pooling
- CDN for static assets
- Queue-based sync processing (decouple from API)

---

## 6. Dependencies & Integrations

### 6.1 External APIs

| API | Purpose | Priority | Cost |
|-----|---------|----------|------|
| Google Places | Restaurant data for Focus Zones | P0 | ~$17/1000 requests |
| OpenWeather | Weather data for Focus Zones | P0 | Free tier (1000/day) |
| Ticketmaster Discovery | Event data for Focus Zones | P1 | Free tier (5000/day) |
| Google Maps Traffic | Traffic data for Focus Zones | P2 | ~$10/1000 requests |
| Mapbox | Map rendering | P0 | Free up to 25K MAU |
| Apple/Google SSO | Social login | P1 | Free |
| RevenueCat | Subscription management | P0 | Free up to $2.5K MTR |

### 6.2 Platform Integrations (Scraping)

| Platform | Method | Risk Level |
|----------|--------|------------|
| DoorDash | Account linking + session scraping | Medium - may break with UI changes |
| Uber Eats | Account linking + session scraping | Medium - may break with UI changes |

**Mitigation:**
- Monitor for breaking changes weekly
- Build graceful degradation (notify user if sync fails)
- Have email parsing as backup method (future)

---

## 7. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DoorDash/Uber block scraping | Medium | High | Monitor for blocks, implement backup methods (email parsing), rotate IPs/sessions |
| Focus Zones inaccurate at launch | Medium | Medium | Set expectations ("Gets smarter over time"), rely on deterministic factors (events, weather) initially |
| App Store rejection (background location) | Low | High | Strong privacy justification, clear user disclosure, legitimate use case |
| Low free-to-paid conversion | Medium | Medium | Ensure free tier provides value but clear upgrade path, A/B test paywall |
| High battery drain complaints | Medium | Medium | Aggressive optimization, user controls, clear documentation |
| Platform API cost overruns | Low | Medium | Caching, rate limiting, monitor usage closely |

---

## 8. Out of Scope (MVP)

The following are explicitly NOT included in MVP:

- Grubhub integration
- Instacart / grocery delivery integration
- Rideshare (Uber/Lyft rides) support
- Expense tracking beyond mileage
- Receipt photo capture
- In-app tax filing
- Social features / driver community
- Multi-language support (English only for MVP)
- Web app version
- Detailed route optimization / navigation

These may be considered for future releases based on user feedback.

---

## 9. Release Plan

### Phase 1: Foundation (Weeks 1-6)
**Goal:** Core infrastructure and account linking

- User authentication (email + SSO)
- Database schema and API scaffolding
- DoorDash account linking + sync
- Uber Eats account linking + sync
- Basic earnings dashboard

**Exit Criteria:** Users can sign up, link accounts, and see synced earnings

### Phase 2: Focus Zones (Weeks 7-10)
**Goal:** Differentiated feature - location intelligence

- Google Places integration (restaurant data)
- OpenWeather integration
- Event API integration
- Zone scoring algorithm
- Map UI with heatmap
- Zone recommendation banner

**Exit Criteria:** Users can view Focus Zones map with scores updating in real-time

### Phase 3: Mileage & Monetization (Weeks 11-14)
**Goal:** Complete value proposition and revenue

- Background mileage tracking (iOS + Android)
- Trip detection and logging
- Tax export (CSV + PDF)
- Subscription paywall (RevenueCat)
- Free vs Pro feature gating
- Push notifications for hot zones

**Exit Criteria:** Full Pro feature set working, payments processing

### Phase 4: Polish & Launch (Weeks 15-16)
**Goal:** Production-ready release

- Bug fixes and performance optimization
- Beta testing (TestFlight / internal track)
- App Store / Play Store submission
- Landing page and marketing site
- Launch marketing prep

**Exit Criteria:** Apps approved and published, ready for public launch

---

## 10. Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| Final decision on React Native vs Flutter? | Tech Lead | Open |
| Confirm DoorDash scraping approach is viable | Tech Lead | Needs spike |
| Finalize Focus Zone algorithm weights | Product | Open |
| Legal review of scraping ToS implications | Legal | Open |
| App name trademark search ("Giglet") | Legal | Open |
| Determine beta testing user recruitment strategy | Marketing | Open |

---

## 11. Appendix

### A. Competitive Analysis Summary

| App | Price | Focus | Pros | Cons |
|-----|-------|-------|------|------|
| Gridwise | $10/mo, $72/yr | Rideshare + Delivery | Market leader, lots of integrations | Expensive, bloated, not delivery-focused |
| Stride | Free | Mileage only | Free, simple | No earnings tracking, no recommendations |
| Everlance | $8/mo | Mileage + expenses | Good mileage tracking | No gig platform integration |
| **Giglet** | $5/mo, $35/yr | Delivery only | Focused, cheaper, proactive recommendations | New, less brand recognition |

### B. Market Size

- US food delivery market: $31B (2024)
- Active delivery drivers: ~2-3 million
- DoorDash + Uber Eats market share: ~85-90%
- Target addressable market: ~2 million drivers

### C. User Research (To Be Conducted)

Recommended research before/during development:
- Survey in r/doordash and r/UberEats (pain points, willingness to pay)
- 5-10 user interviews with full-time delivery drivers
- Usability testing of Figma prototypes
- Beta user feedback sessions

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 30, 2024 | Product Team | Initial draft |

---

*This document should be used as the basis for sprint planning, story creation, and technical architecture decisions. Questions or clarifications should be directed to the Product Owner.*
