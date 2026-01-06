# Giglet Deployment Checklist

Complete guide for deploying Giglet to production, including all required accounts, API keys, and configuration.

---

## Phase 1: Account Registration & API Keys

### Required Accounts

| Status | Service | Cost | Purpose | Signup URL |
|--------|---------|------|---------|------------|
| [ ] | Apple Developer Program | $99/year | iOS App Store distribution | https://developer.apple.com/programs/ |
| [ ] | Google Play Console | $25 one-time | Android Play Store distribution | https://play.google.com/console |
| [ ] | RevenueCat | Free tier | In-app subscription management | https://www.revenuecat.com |
| [ ] | Google Cloud Console | Pay-as-you-go | OAuth, Places API, Maps | https://console.cloud.google.com |
| [ ] | Mapbox | Free tier (50k loads/mo) | Map display in mobile app | https://www.mapbox.com |
| [ ] | OpenWeather | Free tier (1k calls/day) | Weather data for Focus Zones | https://openweathermap.org/api |
| [ ] | Ticketmaster Developer | Free | Event data for Focus Zones | https://developer.ticketmaster.com |
| [ ] | Amplitude | Free tier | Analytics | https://amplitude.com |
| [ ] | Sentry | Free tier | Error tracking | https://sentry.io |
| [ ] | Expo | Free | Push notifications, EAS builds | https://expo.dev |
| [ ] | Railway | Usage-based | API hosting & databases | https://railway.app |

---

## Phase 2: Infrastructure Setup

### Database (PostgreSQL + PostGIS)

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Provision PostgreSQL 16+ database | Railway, Supabase, or Neon recommended |
| [ ] | Enable PostGIS extension | Required for geospatial queries |
| [ ] | Configure connection pooling | Recommended for production |
| [ ] | Set up automated backups | Daily minimum |
| [ ] | Note down `DATABASE_URL` | Format: `postgresql://user:pass@host:5432/dbname` |

### Redis Cache

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Provision Redis instance | Railway, Upstash, or Redis Cloud |
| [ ] | Note down `REDIS_URL` | Format: `redis://user:pass@host:6379` |

### Domain & DNS

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Register domain | e.g., `giglet.app` |
| [ ] | Configure DNS for API | e.g., `api.giglet.app` |
| [ ] | Configure DNS for web/legal | e.g., `giglet.app` |
| [ ] | Set up SSL certificates | Usually automatic with Railway/Vercel |

---

## Phase 3: RevenueCat Configuration

### Dashboard Setup

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Create new project in RevenueCat | |
| [ ] | Add iOS app | Bundle ID: `app.giglet.driver` |
| [ ] | Add Android app | Package: `app.giglet.driver` |
| [ ] | Connect to App Store Connect | Requires shared secret |
| [ ] | Connect to Google Play Console | Requires service account |

### Products & Entitlements

| Status | Task | Product ID |
|--------|------|------------|
| [ ] | Create monthly product | `giglet_pro_monthly` |
| [ ] | Create annual product | `giglet_pro_annual` |
| [ ] | Create "pro" entitlement | Attach both products |

### API Keys (Save These)

| Key | Environment Variable | Where to Find |
|-----|---------------------|---------------|
| iOS Public API Key | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat > iOS App > API Keys |
| Android Public API Key | `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat > Android App > API Keys |
| Webhook Auth Key | `REVENUECAT_WEBHOOK_SECRET` | RevenueCat > Project > Webhooks |

### Webhook Configuration

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Add webhook URL | `https://api.giglet.app/api/v1/webhooks/revenuecat` |
| [ ] | Enable events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION | |

---

## Phase 4: Google Cloud Setup

### Project Setup

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Create new GCP project | e.g., "Giglet Production" |
| [ ] | Enable billing | Required for APIs |

### APIs to Enable

| Status | API | Purpose |
|--------|-----|---------|
| [ ] | Places API | Restaurant/venue search |
| [ ] | Maps SDK for Android | Map display |
| [ ] | Identity Platform | OAuth (optional) |

### OAuth Credentials

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Configure OAuth consent screen | External, production mode |
| [ ] | Create Web Client ID | For backend token verification |
| [ ] | Create iOS Client ID | For mobile Google Sign-In |
| [ ] | Add authorized domains | `giglet.app`, `api.giglet.app` |

### API Keys (Save These)

| Key | Environment Variable | Restrictions |
|-----|---------------------|--------------|
| Places API Key | `GOOGLE_PLACES_API_KEY` | Restrict to Places API, server IPs |
| Maps API Key | Move to env var | Restrict to Maps SDK, Android app |
| Web Client ID | `GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | |
| iOS Client ID | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | |

### Security Fix Required

> **Warning**: Google Maps API key is currently hardcoded in `apps/mobile/app.json:42`
>
> Current exposed key: `AIzaSyA7EHLDTPS4xTAzCmmg8yi779sLB74NxzY`
>
> **Action**: Rotate this key immediately and move to environment variable

---

## Phase 5: Apple Developer Setup

### App Registration

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Register App ID | `app.giglet.driver` |
| [ ] | Enable Sign in with Apple | Capability |
| [ ] | Enable Push Notifications | Capability |
| [ ] | Enable In-App Purchase | Capability |

### App Store Connect

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Create app in App Store Connect | |
| [ ] | Note Apple ID | Update in `eas.json` |
| [ ] | Note ASC App ID | Update in `eas.json` |
| [ ] | Create in-app purchases | Link to RevenueCat |
| [ ] | Configure App Store listing | Screenshots, description, etc. |

### Certificates & Provisioning

| Status | Task | Notes |
|--------|------|-------|
| [ ] | EAS handles automatically | Or manual via Xcode |
| [ ] | Push notification certificate | For Expo push |

---

## Phase 6: Google Play Setup

### App Registration

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Create app in Play Console | Package: `app.giglet.driver` |
| [ ] | Complete store listing | Screenshots, description, etc. |
| [ ] | Set up Google Play Billing | For subscriptions |

### Service Account for EAS

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Create service account | In GCP with Play Console access |
| [ ] | Download JSON key | Save as `google-play-key.json` |
| [ ] | Grant permissions in Play Console | Admin for releases |

### Play Console Configuration

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Create in-app products | Link to RevenueCat |
| [ ] | Set up internal testing track | For initial builds |
| [ ] | Configure release tracks | Internal > Alpha > Beta > Production |

---

## Phase 7: Legal Documents

### Required Documents

| Status | Document | Hosted URL |
|--------|----------|------------|
| [ ] | Privacy Policy | `https://giglet.app/privacy` |
| [ ] | Terms of Service | `https://giglet.app/terms` |

### Content Requirements

**Privacy Policy must include:**
- Data collected (location, earnings, account info)
- How data is used
- Third-party services (RevenueCat, analytics)
- Data retention and deletion
- Contact information

**Terms of Service must include:**
- Subscription terms and billing
- Acceptable use
- Limitation of liability
- Dispute resolution

### Hosting Options
- Static site on Vercel/Netlify
- Simple HTML pages on your domain
- Use a legal document generator (Termly, iubenda)

---

## Phase 8: Environment Variables

### API Environment Variables

Create `apps/api/.env` for production:

```env
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/giglet?schema=public

# Redis
REDIS_URL=redis://user:password@host:6379

# Security (GENERATE NEW VALUES - DO NOT USE DEFAULTS)
JWT_SECRET=<generate-256-bit-hex-string>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d
ENCRYPTION_KEY=<generate-64-character-hex-string>

# Apple
APPLE_BUNDLE_ID=app.giglet.driver

# Google
GOOGLE_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com
GOOGLE_PLACES_API_KEY=<your-places-api-key>

# External APIs
OPENWEATHER_API_KEY=<your-openweather-key>
TICKETMASTER_API_KEY=<your-ticketmaster-key>

# Expo Push Notifications
EXPO_ACCESS_TOKEN=<your-expo-access-token>

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=<your-webhook-secret>
```

### Mobile Environment Variables

Create `apps/mobile/.env` for production:

```env
# API
EXPO_PUBLIC_API_URL=https://api.giglet.app/api/v1

# Maps
EXPO_PUBLIC_MAPBOX_TOKEN=<your-mapbox-public-token>

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=<your-ios-public-key>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<your-android-public-key>

# Analytics
EXPO_PUBLIC_AMPLITUDE_KEY=<your-amplitude-key>

# Error Tracking
EXPO_PUBLIC_SENTRY_DSN=<your-sentry-dsn>

# Google Auth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>.apps.googleusercontent.com
```

### Generating Secure Keys

```bash
# Generate JWT_SECRET (256-bit hex)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (64-char hex)
openssl rand -hex 32
```

---

## Phase 9: Build & Deploy

### API Deployment

| Status | Task | Command/Notes |
|--------|------|---------------|
| [ ] | Deploy to Railway | Connect GitHub repo |
| [ ] | Set environment variables | In Railway dashboard |
| [ ] | Run database migrations | `npm run migrate` |
| [ ] | Verify health check | `GET https://api.giglet.app/health` |

### Mobile Build Configuration

Update `apps/mobile/eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

### Build & Submit

| Status | Task | Command |
|--------|------|---------|
| [ ] | Login to Expo | `npx eas login` |
| [ ] | Build iOS | `npx eas build --platform ios --profile production` |
| [ ] | Build Android | `npx eas build --platform android --profile production` |
| [ ] | Submit iOS | `npx eas submit --platform ios --profile production` |
| [ ] | Submit Android | `npx eas submit --platform android --profile production` |

---

## Phase 10: Post-Deployment Verification

### API Health Checks

| Status | Test | Expected Result |
|--------|------|-----------------|
| [ ] | `GET /health` | 200 OK |
| [ ] | `POST /api/v1/auth/register` | User creation works |
| [ ] | Database connectivity | No connection errors |
| [ ] | Redis connectivity | Cache operations work |

### Mobile App Testing

| Status | Test | Notes |
|--------|------|-------|
| [ ] | Email registration | New account creation |
| [ ] | Google Sign-In | OAuth flow complete |
| [ ] | Apple Sign-In | OAuth flow complete |
| [ ] | Subscription purchase | RevenueCat integration |
| [ ] | CSV import | Earnings data import |
| [ ] | Mileage tracking | Background location |
| [ ] | Focus Zones | Map display, zone data |
| [ ] | Tax export | PDF/CSV generation |
| [ ] | Push notifications | Receive test notification |

### Monitoring Setup

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Verify Sentry errors appear | Test with intentional error |
| [ ] | Verify Amplitude events | Check dashboard |
| [ ] | Set up uptime monitoring | Railway, UptimeRobot, etc. |
| [ ] | Configure alerts | For errors and downtime |

---

## Security Checklist

| Status | Item | Priority |
|--------|------|----------|
| [ ] | Rotate exposed Google Maps API key | **Critical** |
| [ ] | Use strong JWT_SECRET (not default) | **Critical** |
| [ ] | Use strong ENCRYPTION_KEY (not default) | **Critical** |
| [ ] | Restrict API keys to specific services | High |
| [ ] | Enable rate limiting | High |
| [ ] | Review CORS settings | Medium |
| [ ] | Enable database SSL | Medium |

---

## Cost Estimates (Monthly)

| Service | Estimated Cost | Notes |
|---------|----------------|-------|
| Apple Developer | ~$8.25 | $99/year |
| Railway (API + DB + Redis) | $5-20 | Usage-based |
| Domain | ~$1-2 | Varies by registrar |
| RevenueCat | Free | Until $2.5k MRR |
| Google Cloud | $0-10 | Free tier covers most |
| Mapbox | Free | 50k loads/month free |
| OpenWeather | Free | 1k calls/day free |
| Amplitude | Free | 10M events/month |
| Sentry | Free | 5k errors/month |
| **Total** | **~$15-40/month** | At launch scale |

---

## File References

| File | Purpose |
|------|---------|
| `apps/api/.env.example` | API environment template |
| `apps/api/src/config/index.ts` | Environment variable usage |
| `apps/api/prisma/schema.prisma` | Database schema |
| `apps/api/Dockerfile` | Container build |
| `apps/mobile/.env.example` | Mobile environment template |
| `apps/mobile/app.json` | iOS/Android configuration |
| `apps/mobile/eas.json` | Build/submit configuration |
| `docker-compose.yml` | Local development setup |

---

## Support & Resources

- **Expo Documentation**: https://docs.expo.dev
- **RevenueCat Docs**: https://docs.revenuecat.com
- **Railway Docs**: https://docs.railway.app
- **Apple App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policies**: https://play.google.com/console/about/guides/

---

*Last updated: January 2026*
