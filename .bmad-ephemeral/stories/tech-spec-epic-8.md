# Technical Specification: Epic 8 - Subscription & Payments

**Date:** 2026-01-04
**Epic:** 8 - Subscription & Payments
**Status:** Draft

---

## 1. Epic Overview

### 1.1 Goal
Implement the monetization layer with free tier limitations and Pro subscription via in-app purchase.

### 1.2 Value Proposition
Enables business sustainability while providing clear value differentiation between tiers. Users understand exactly what they get for free vs Pro, and can seamlessly upgrade.

### 1.3 Exit Criteria
- Free tier has appropriate limitations
- Pro subscription purchasable (monthly and annual)
- Subscription status correctly gates features
- Users can restore purchases on new devices

### 1.4 Story Summary

| Story | Title | PRD Ref | Priority |
|-------|-------|---------|----------|
| 8.1 | Free Tier Feature Limitations | US-7.1 | P0 |
| 8.2 | Pro Monthly Subscription Purchase | US-7.2 | P0 |
| 8.3 | Pro Annual Subscription Purchase | US-7.3 | P0 |
| 8.4 | Subscription Status Display | US-7.4 | P1 |
| 8.5 | Subscription Cancellation Handling | US-7.5 | P0 |
| 8.6 | Purchase Restoration | US-7.6 | P1 |

---

## 2. Technical Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBILE APP                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              RevenueCat SDK                              │    │
│  │   - Purchase handling                                    │    │
│  │   - Subscription status                                  │    │
│  │   - Restore purchases                                    │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────┴────────────────────────────────┐    │
│  │         Subscription Store (Zustand)                     │    │
│  │   - currentTier: FREE | PRO_MONTHLY | PRO_ANNUAL        │    │
│  │   - isProUser: boolean                                   │    │
│  │   - expiresAt: Date | null                              │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS (Webhooks)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND API                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         Subscription Service                             │    │
│  │   - Webhook handler (RevenueCat)                        │    │
│  │   - Subscription status sync                            │    │
│  │   - Feature entitlement checks                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────┴────────────────────────────────┐    │
│  │              PostgreSQL (Subscription table)             │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│  │ RevenueCat │  │ App Store │  │ Play Store│                   │
│  │   Server   │  │  Connect  │  │  Console  │                   │
│  └───────────┘  └───────────┘  └───────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **Purchase Flow:**
   - User initiates purchase in app
   - RevenueCat SDK handles platform-specific IAP
   - On success, RevenueCat sends webhook to backend
   - Backend updates Subscription record
   - Mobile app refreshes subscription status

2. **Entitlement Check Flow:**
   - App checks `subscriptionStore.isProUser` for feature gating
   - Backend can verify via `req.user.subscription.tier`
   - RevenueCat SDK provides real-time entitlement status

3. **Restore Flow:**
   - User taps "Restore Purchases"
   - RevenueCat queries App Store/Play Store
   - If active subscription found, entitlements restored
   - Backend notified via webhook

---

## 3. Database Schema

### 3.1 Existing Schema (from Architecture)

```prisma
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
```

### 3.2 Schema Extensions Needed

None - existing schema is sufficient for Epic 8.

---

## 4. API Design

### 4.1 Endpoints

```
GET    /api/v1/subscriptions           # Get current user's subscription
POST   /api/v1/subscriptions/webhook   # RevenueCat webhook handler
```

### 4.2 Request/Response Schemas

**GET /api/v1/subscriptions**

Response:
```typescript
{
  "success": true,
  "data": {
    "tier": "PRO_MONTHLY" | "PRO_ANNUAL" | "FREE",
    "status": "ACTIVE" | "EXPIRED" | "CANCELED" | "GRACE_PERIOD",
    "currentPeriodStart": "2026-01-04T00:00:00Z",
    "currentPeriodEnd": "2026-02-04T00:00:00Z",
    "willRenew": true,
    "managementUrl": "https://apps.apple.com/account/subscriptions"
  }
}
```

**POST /api/v1/subscriptions/webhook**

RevenueCat webhook payload (handled automatically by RevenueCat SDK):
- `INITIAL_PURCHASE`
- `RENEWAL`
- `CANCELLATION`
- `EXPIRATION`
- `BILLING_ISSUE`
- `PRODUCT_CHANGE`

---

## 5. Mobile Implementation

### 5.1 File Structure

```
apps/mobile/src/
├── services/
│   └── subscriptions.ts       # RevenueCat wrapper + API calls
├── stores/
│   └── subscriptionStore.ts   # Zustand store for subscription state
├── components/
│   └── subscriptions/
│       ├── PaywallModal.tsx   # Pro upgrade prompt
│       ├── ProBadge.tsx       # "Pro" indicator
│       └── PricingCard.tsx    # Monthly/Annual options
├── hooks/
│   └── useSubscription.ts     # Convenience hook
└── screens/
    └── (future settings integration)
```

### 5.2 RevenueCat Configuration

**Products to configure:**

| Product ID | Type | Price | Notes |
|------------|------|-------|-------|
| `giglet_pro_monthly` | Auto-renewable | $4.99/month | |
| `giglet_pro_annual` | Auto-renewable | $34.99/year | 42% savings |

**Entitlements:**
- `pro` - Grants access to all Pro features

### 5.3 Feature Gating Logic

```typescript
// Pro features check
const PRO_FEATURES = [
  'autoEarningsSync',      // Future - not in MVP
  'autoMileageTracking',   // Background tracking
  'unlimitedHistory',      // > 7 days
  'taxExport',             // Export functionality
  'zoneAlerts',            // Push notifications for zones
];

function canAccessFeature(feature: string, tier: SubscriptionTier): boolean {
  if (tier === 'FREE') {
    return !PRO_FEATURES.includes(feature);
  }
  return true;
}
```

---

## 6. Backend Implementation

### 6.1 File Structure

```
apps/api/src/
├── routes/
│   └── subscriptions.routes.ts
├── controllers/
│   └── subscriptions.controller.ts
├── services/
│   └── subscriptions.service.ts
├── schemas/
│   └── subscriptions.schema.ts
└── middleware/
    └── subscription.middleware.ts  # Pro-only route protection
```

### 6.2 Webhook Security

- Verify RevenueCat webhook signature
- Use shared secret from RevenueCat dashboard
- Log all webhook events for debugging

---

## 7. Story Technical Details

### Story 8.1: Free Tier Feature Limitations

**Implementation:**
1. Create `subscriptionStore.ts` with tier state
2. Create `PaywallModal.tsx` component
3. Add `useSubscription` hook
4. Implement feature checks in existing screens

**Files to create:**
- `apps/mobile/src/stores/subscriptionStore.ts`
- `apps/mobile/src/components/subscriptions/PaywallModal.tsx`
- `apps/mobile/src/hooks/useSubscription.ts`

**Files to modify:**
- `apps/mobile/app/(tabs)/dashboard.tsx` - Add Pro gates for tax export
- `apps/mobile/app/(tabs)/mileage.tsx` - Add Pro gate for auto-tracking

### Story 8.2: Pro Monthly Subscription Purchase

**Implementation:**
1. Configure RevenueCat SDK
2. Create purchase flow UI
3. Implement backend webhook handler

**Files to create:**
- `apps/mobile/src/services/subscriptions.ts`
- `apps/mobile/src/components/subscriptions/PricingCard.tsx`
- `apps/api/src/routes/subscriptions.routes.ts`
- `apps/api/src/controllers/subscriptions.controller.ts`
- `apps/api/src/services/subscriptions.service.ts`

**Files to modify:**
- `apps/mobile/package.json` - Add react-native-purchases
- `apps/mobile/app/_layout.tsx` - Initialize RevenueCat
- `apps/api/src/routes/index.ts` - Add subscriptions routes

### Story 8.3: Pro Annual Subscription Purchase

**Implementation:**
- Same flow as 8.2, different product ID
- Add savings badge UI element

**Files to modify:**
- `apps/mobile/src/components/subscriptions/PricingCard.tsx` - Add annual option

### Story 8.4: Subscription Status Display

**Implementation:**
1. Create subscription management UI in settings
2. Add management URL deep links

**Files to create:**
- `apps/mobile/app/subscription.tsx` - Subscription management screen

**Files to modify:**
- `apps/mobile/app/accounts.tsx` - Add link to subscription management

### Story 8.5: Subscription Cancellation Handling

**Implementation:**
- Webhook handles cancellation events
- Update subscription status to CANCELED
- Show expiration date in UI

**Files to modify:**
- `apps/api/src/services/subscriptions.service.ts` - Handle cancellation webhook
- `apps/mobile/src/stores/subscriptionStore.ts` - Handle canceled state

### Story 8.6: Purchase Restoration

**Implementation:**
1. Add "Restore Purchases" button
2. Call RevenueCat restore method
3. Update local state on success

**Files to modify:**
- `apps/mobile/src/services/subscriptions.ts` - Add restore function
- `apps/mobile/app/subscription.tsx` - Add restore button

---

## 8. Integration Points

### 8.1 Existing Code Integration

| Component | Integration Needed |
|-----------|-------------------|
| Dashboard | Pro badge, tax export gate |
| Mileage | Auto-tracking Pro gate |
| Settings/Accounts | Subscription management link |
| Auth | Initialize subscription on login |

### 8.2 RevenueCat Setup Steps

1. Create RevenueCat account
2. Connect App Store Connect and Play Console
3. Create app in RevenueCat
4. Configure products and entitlements
5. Set up webhook URL
6. Add API keys to environment

---

## 9. Testing Strategy

### 9.1 Unit Tests

- `subscriptionStore.ts` - State management
- `subscriptions.service.ts` - Webhook handling
- Feature gating logic

### 9.2 Integration Tests

- Purchase flow (sandbox)
- Webhook processing
- Subscription status API

### 9.3 Manual Testing

- iOS Sandbox purchases
- Android test tracks
- Restore purchases
- Cancellation flow

---

## 10. Environment Variables

### Mobile (`.env`)
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=xxx
```

### Backend (`.env`)
```
REVENUECAT_WEBHOOK_SECRET=xxx
REVENUECAT_API_KEY=xxx
```

---

## 11. Acceptance Criteria Traceability

| PRD Requirement | Story | Implementation |
|-----------------|-------|----------------|
| US-7.1: Pro features locked | 8.1 | PaywallModal + feature gates |
| US-7.2: Monthly $4.99 | 8.2 | RevenueCat + PricingCard |
| US-7.3: Annual $34.99 | 8.3 | RevenueCat + PricingCard |
| US-7.4: Manage subscription | 8.4 | subscription.tsx + deep links |
| US-7.5: Grace period | 8.5 | Webhook handling |
| US-7.6: Restore purchases | 8.6 | RevenueCat restore API |

---

## 12. Dependencies

### External Dependencies
- RevenueCat account and configuration
- App Store Connect product setup
- Google Play Console product setup

### Internal Dependencies
- Epic 2 (Auth) - User authentication required
- Existing Prisma schema with Subscription model

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| App Store review delays | Launch delay | Submit early, follow guidelines |
| RevenueCat integration issues | Feature blocked | Thorough sandbox testing |
| Webhook delivery failures | Status out of sync | Retry logic, manual refresh |

---

## 14. Implementation Order

1. **Story 8.1** - Foundation (store, hooks, gates)
2. **Story 8.2** - Monthly purchase flow
3. **Story 8.3** - Annual option (incremental)
4. **Story 8.4** - Status display
5. **Story 8.5** - Cancellation handling
6. **Story 8.6** - Restore purchases

---

*Generated: 2026-01-04*
*Epic: 8 - Subscription & Payments*
