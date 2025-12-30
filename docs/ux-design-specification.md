# Giglet UX Design Specification

_Created on 2025-12-30 by George_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

**Project:** Giglet - A mobile application for food delivery drivers (DoorDash and Uber Eats) that provides real-time location intelligence through proprietary "Focus Zones" to maximize earnings.

**Vision:** "Stop guessing. Start earning." - The app that tells drivers WHERE to go, not just what they already earned.

**Target Users:** Food delivery drivers who work on DoorDash and/or Uber Eats, seeking to:
- Earn more by being in the right place at the right time
- Automatically track mileage for tax deductions
- See unified earnings across platforms

**Core Experience:** Open app → see Focus Zones map → know exactly where to position. Glanceable at a red light in <2 seconds.

**Desired Emotional Response:** Empowered, confident, in control. The certainty of "I know where to go."

**Platform:** iOS + Android (cross-platform via Expo/React Native)

**UX Philosophy:**
- **Simplicity** - As few elements as possible
- **Big Elements** - Easy to tap/see at a glance
- **Intuitive** - Zero learning curve, self-explanatory
- **Map IS the Interface** - Minimal chrome, maximum map

**Inspiration Analysis:**

| App | Pattern | Giglet Application |
|-----|---------|-------------------|
| DoorDash Dasher (2025) | Big map primary view, earnings pill at top, zone hotspots, dark mode | Map-first with floating earnings |
| Uber Driver | "Glanceable" design goal, large text/icons, persistent map | Everything parseable in <2 seconds |
| Waze | Safety-first, strict character limits, high contrast, minimal overlay | Minimal UI, information via color |

---

## 1. Design System Foundation

### 1.1 Design System Choice

**Selected:** Tamagui

**Rationale:**
- Compiler-optimized for maximum performance (critical for map-heavy app)
- First-class Expo integration
- Built-in theming system with dark mode support
- Use only what you need - no bloat
- Cross-platform consistency (iOS, Android, potential Web)

**What Tamagui Provides:**
- Theme tokens (colors, spacing, typography)
- Animated components with spring physics
- Responsive styling utilities
- Accessibility built-in
- Zero-runtime CSS extraction for performance

**Components We'll Use from Tamagui:**
- `Button` - Primary actions
- `Card` / `Sheet` - Floating UI elements
- `Text` / `H1-H6` - Typography
- `Stack` / `XStack` / `YStack` - Layout primitives
- `Input` - Form fields (settings, auth)

**Custom Components Needed:**
- `ZoneMap` - Mapbox GL integration (not from design system)
- `EarningsPill` - Floating earnings indicator
- `ZoneScoreCard` - Zone detail overlay
- `MileageIndicator` - Tracking status
- `BottomTabBar` - Custom navigation (Expo Router)

**Why Not Full Component Library:**
Giglet is 80% map. We don't need 40+ pre-built components. Tamagui gives us the foundation (theming, primitives, performance) while keeping bundle size minimal.

---

## 2. Core User Experience

### 2.1 Defining Experience

**The One-Line Description:** "It's the app that shows you WHERE to go to get more deliveries."

**Core Interaction:** Open app → See Focus Zones heatmap → Know where to position

**Pattern Analysis:**

| Pattern Element | Type | Reference |
|-----------------|------|-----------|
| Heatmap overlay on map | Established | Uber surge, Google traffic, Waze |
| Zone scoring (0-100) | Established | Weather apps, air quality indexes |
| "Go here" recommendation | Established | DoorDash Dasher 2025 |
| Color-coded intensity | Established | Universal heatmap convention |

**Conclusion:** Focus Zones leverages established, familiar patterns. Users will immediately understand the heatmap paradigm without explanation.

### 2.2 Novel UX Patterns

**None required.** All core interactions follow established mobile and map UX conventions:

- Map navigation (pan, zoom, tap) - Universal
- Tab bar navigation - iOS/Android standard
- Pull-to-refresh - Standard mobile pattern
- Floating action elements - Material/iOS pattern
- Bottom sheet for details - Standard mobile pattern

This is intentional - Giglet's value is in the *data* (Focus Zones algorithm), not novel interaction mechanics. The UX should be invisible.

### 2.3 Core Experience Principles

| Principle | Definition | Implementation |
|-----------|------------|----------------|
| **Speed** | Instant comprehension | Map loads <2 sec, recommendation visible immediately |
| **Glanceability** | Understand in 2 seconds | Big zones, high contrast, one clear recommendation |
| **Simplicity** | Minimum viable UI | 4 tabs max, no nested menus, no tutorial |
| **Color as Information** | Reduce text, increase visual | Hot=warm colors, cold=cool colors, money=green |
| **Dark Mode First** | Night driving optimized | Dark theme default, high contrast overlays |

These principles are non-negotiable and guide every subsequent UX decision.

---

## 3. Visual Foundation

### 3.1 Color System

**Selected Theme:** Clean Pro

**Personality:** Professional, Trustworthy, Minimal

**Core Palette:**

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Cyan | `#06B6D4` | Primary buttons, active states, links |
| Secondary | Sky Blue | `#0EA5E9` | Secondary actions, hover states |
| Accent | Violet | `#8B5CF6` | Highlights, special features |
| Background | Near Black | `#09090B` | App background |
| Surface | Dark Gray | `#18181B` | Cards, sheets, elevated surfaces |
| Text Primary | White | `#FFFFFF` | Headings, primary text |
| Text Secondary | Gray | `#A1A1AA` | Labels, secondary text |
| Border | Dark Border | `#27272A` | Dividers, input borders |

**Semantic Colors:**

| State | Color | Hex | Usage |
|-------|-------|-----|-------|
| Success | Green | `#22C55E` | Earnings, positive states, confirmations |
| Warning | Yellow | `#EAB308` | Alerts, caution states |
| Error | Red | `#EF4444` | Errors, destructive actions |
| Info | Cyan | `#06B6D4` | Informational states |

**Heatmap Zone Colors:**

| Zone Temp | Gradient | Usage |
|-----------|----------|-------|
| Hot (80-100) | `#EF4444` → `#F97316` | High demand zones |
| Warm (50-79) | `#F97316` → `#EAB308` | Medium demand zones |
| Cool (0-49) | `#0EA5E9` → `#06B6D4` | Low demand zones |

**Typography:**

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| H1 (Earnings) | 32px | Bold (700) | Success Green |
| H2 (Section) | 24px | Semibold (600) | White |
| H3 (Card Title) | 18px | Semibold (600) | White |
| Body | 16px | Regular (400) | White |
| Label | 14px | Medium (500) | Gray |
| Caption | 12px | Regular (400) | Gray |

**Spacing Scale (8px base):**

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing |
| sm | 8px | Component internal |
| md | 16px | Default spacing |
| lg | 24px | Section spacing |
| xl | 32px | Major sections |
| 2xl | 48px | Page margins |

**Border Radius:**

| Token | Value | Usage |
|-------|-------|-------|
| sm | 6px | Small buttons, badges |
| md | 10px | Inputs, small cards |
| lg | 12px | Cards, sheets |
| xl | 16px | Large cards, modals |
| full | 9999px | Pills, avatars |

**Interactive Visualizations:**

- Color Theme Explorer: [ux-color-themes.html](./ux-color-themes.html)

---

## 4. Design Direction

### 4.1 Chosen Design Approach

**Selected:** Bottom Sheet (Direction 5)

**Philosophy:** Full map with swipe-up details - Apple Maps / Google Maps pattern

**Why This Works:**
- Familiar pattern users already understand (zero learning curve)
- Maximum map visibility in collapsed state
- Swipe up for more info when stopped/parked
- Recommendation banner always visible above sheet
- Progressive disclosure - simple glance vs. detailed view

**Layout Structure:**

```
┌─────────────────────────────┐
│  Status Bar                 │
├─────────────────────────────┤
│                             │
│                             │
│         MAP                 │
│    (Full screen behind)     │
│                             │
│   [Zone Scores floating]    │
│                             │
│   [User Location Dot]       │
│                             │
├─────────────────────────────┤
│  ↗ Head to Midtown  [92]    │  ← Recommendation Banner
├─────────────────────────────┤
│  ═══  (drag handle)         │  ← Bottom Sheet (collapsed)
│  Today's Summary            │
│  $127.50   47.2mi   12 del  │
└─────────────────────────────┘
│  Zones │ Earnings │ Miles │⚙│  ← Tab Bar
└─────────────────────────────┘
```

**Bottom Sheet States:**

| State | Height | Shows |
|-------|--------|-------|
| Collapsed | ~120px | Handle, title, summary stats |
| Half | ~50% | + Zone details, hourly breakdown |
| Expanded | ~85% | + Full delivery list, charts |

**Key Decisions:**

| Element | Decision | Rationale |
|---------|----------|-----------|
| Zone Scores | Float on map | Glanceable without interaction |
| Recommendation | Fixed banner above sheet | Always visible, action-oriented |
| Earnings | In bottom sheet | Part of summary, not primary view |
| Navigation | Bottom tab bar | iOS/Android standard |

**Interaction Patterns:**

- **Tap zone on map** → Sheet expands to show zone details
- **Swipe up on sheet** → Expand for more data
- **Swipe down / tap map** → Collapse sheet
- **Tap recommendation** → Center map on recommended zone

**Interactive Mockups:**

- Design Direction Showcase: [ux-design-directions.html](./ux-design-directions.html)

---

## 5. User Journey Flows

### 5.1 Critical User Paths

**Design Philosophy:** Minimum taps, maximum clarity. Every journey optimized for speed.

---

#### Journey 1: Onboarding

**Goal:** New driver → Using app in <2 minutes

```
┌─────────┐    ┌─────────┐    ┌─────────────┐    ┌─────────┐
│ Welcome │ →  │ Sign Up │ →  │Link Platform│ →  │  Map    │
│         │    │         │    │  (optional) │    │  View   │
│"Stop    │    │ Email   │    │             │    │         │
│guessing"│    │ Apple   │    │ DoorDash    │    │ Ready!  │
│         │    │ Google  │    │ Uber Eats   │    │         │
│ [Start] │    │         │    │ [Skip]      │    │         │
└─────────┘    └─────────┘    └─────────────┘    └─────────┘
```

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tutorial | None | App is self-explanatory |
| Auth options | Apple, Google, Email | Social = 1 tap signup |
| Platform linking | Optional first run | Reduce friction, do later |
| Permissions | Request on first use | Location when opening map |

---

#### Journey 2: Focus Zones (Core Loop)

**Goal:** Open app → Know where to go (2 seconds)

```
┌──────────────────────────────────────┐
│            OPEN APP                   │
│               ↓                       │
│  ┌────────────────────────────────┐  │
│  │         MAP VIEW               │  │
│  │   [Zone Heatmap Visible]       │  │
│  │   [Score Badges: 92, 67, 34]   │  │
│  │                                │  │
│  │   ┌────────────────────────┐   │  │
│  │   │ ↗ Head to Midtown [92] │   │  │
│  │   └────────────────────────┘   │  │
│  │                                │  │
│  │   [Bottom Sheet - Collapsed]   │  │
│  └────────────────────────────────┘  │
│                                       │
│         ↓ TAP ZONE                    │
│                                       │
│  ┌────────────────────────────────┐  │
│  │   [Bottom Sheet - Expanded]    │  │
│  │                                │  │
│  │   Midtown - Score 92           │  │
│  │   ━━━━━━━━━━━━━━━━━━━━         │  │
│  │   Restaurants: ████████ High   │  │
│  │   Weather: Rain +20            │  │
│  │   Events: MSG Concert +15      │  │
│  │   Traffic: Light 0             │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

| Interaction | Result |
|-------------|--------|
| Open app | Map with zones + recommendation |
| Tap zone | Sheet expands with score breakdown |
| Tap recommendation | Center map on zone |
| Swipe down | Collapse sheet |

---

#### Journey 3: Earnings Check

**Goal:** See earnings at a glance

```
[Tap Earnings Tab]
        ↓
┌────────────────────────┐
│     $127.50            │  ← Big number
│     Today              │
│                        │
│  ←  Day | Week | Month →  ← Swipe to change
│                        │
│  ████████████ DoorDash │  ← Platform breakdown
│  ████████    Uber Eats │
│                        │
│  Recent Deliveries     │
│  └─ $8.50 - Thai Place │
│  └─ $12.00 - Pizza Hut │
│  └─ $6.25 - Chipotle   │
└────────────────────────┘
```

| Interaction | Result |
|-------------|--------|
| Swipe left/right | Change time period |
| Tap delivery | Show details (tip, base, time) |
| Pull down | Trigger sync |

---

#### Journey 4: Mileage Tracking

**Goal:** Automatic tracking, visible tax benefit

```
[Mileage Tab]
        ↓
┌────────────────────────┐
│  ● Tracking Active     │  ← Status indicator
│                        │
│     47.2 mi            │  ← Today's miles
│     $26.86 saved       │  ← Tax deduction (IRS rate)
│                        │
│  This Week: 234.5 mi   │
│  This Month: 892.1 mi  │
│                        │
│  Today's Trips         │
│  └─ 9:15 AM - 3.2 mi   │
│  └─ 11:30 AM - 5.8 mi  │
│  └─ 1:45 PM - 4.1 mi   │
│                        │
│  [+ Add Manual Trip]   │  ← De-emphasized
└────────────────────────┘
```

| Feature | Behavior |
|---------|----------|
| Auto tracking | Starts on movement, stops after 5min stationary |
| Tax calculation | Miles × IRS rate ($0.67/mi for 2024) |
| Manual add | Available but not prominent |

---

#### Journey 5: Tax Export (Pro)

**Goal:** IRS-ready documents in 3 taps

```
[Mileage Tab] → [Export Button]
                      ↓
        ┌─────────────────────────┐
        │   Export Tax Documents  │
        │                         │
        │   Date Range:           │
        │   [2024 ▾]              │
        │   ○ Full Year           │
        │   ○ Q1  ○ Q2  ○ Q3  ○ Q4│
        │   ○ Custom              │
        │                         │
        │   Include:              │
        │   ☑ Mileage Log         │
        │   ☑ Earnings Summary    │
        │                         │
        │   Format:               │
        │   [PDF]  [CSV]          │
        │                         │
        │   [Generate & Share]    │
        └─────────────────────────┘
                      ↓
              [Native Share Sheet]
```

---

#### Journey 6: Upgrade to Pro

**Goal:** Clear value, easy purchase

```
[Tap Locked Feature (e.g., Export)]
                ↓
┌─────────────────────────────┐
│         Giglet Pro          │
│                             │
│  ✓ Auto earnings sync       │
│  ✓ Automatic mileage        │
│  ✓ Unlimited history        │
│  ✓ Tax export (PDF + CSV)   │
│  ✓ Hot zone alerts          │
│                             │
│  ┌───────────────────────┐  │
│  │ $34.99/year           │  │  ← Highlighted
│  │ Save 42%              │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ $4.99/month           │  │
│  └───────────────────────┘  │
│                             │
│  [Continue]                 │
│                             │
│  Restore Purchases          │
└─────────────────────────────┘
```

| Decision | Choice |
|----------|--------|
| Default highlight | Annual (better value) |
| Upsell frequency | Only when tapping locked feature |
| Free trial | Not for MVP (simplicity) |

---

## 6. Component Library

### 6.1 Component Strategy

**Approach:** Minimal component set. Use Tamagui primitives, build only what's unique to Giglet.

---

#### From Tamagui (Use As-Is)

| Component | Usage |
|-----------|-------|
| `Button` | Primary/secondary actions |
| `Text` / `H1-H4` | All typography |
| `Input` | Form fields (settings, auth) |
| `Stack` / `XStack` / `YStack` | Layout primitives |
| `Sheet` | Bottom sheet foundation |
| `Card` | Surface containers |
| `Separator` | Dividers |
| `Switch` | Toggle settings |
| `Spinner` | Loading states |

---

#### Custom Components (Build)

##### 1. ZoneMap
**Purpose:** Mapbox GL wrapper with zone overlays

| Element | Description |
|---------|-------------|
| Map base | Mapbox GL with dark style |
| Zone overlays | H3 hexagons with gradient fills |
| Score badges | Floating score indicators |
| User location | Pulsing dot with accuracy ring |
| Recommendation banner | Fixed position above bottom sheet |

**States:** Loading, Error (no location), Normal

---

##### 2. ZoneScoreBadge
**Purpose:** Floating score indicator on map

```
┌──────┐
│  92  │  ← Score number
└──────┘
   ↑ Background gradient based on score
```

| Prop | Type | Description |
|------|------|-------------|
| score | number | 0-100 |
| size | 'sm' \| 'md' | Badge size |
| onPress | function | Tap handler |

**Variants:**
- Hot (80-100): Red → Orange gradient
- Warm (50-79): Orange → Yellow gradient
- Cool (0-49): Blue → Cyan gradient

---

##### 3. RecommendationBanner
**Purpose:** Action-oriented zone suggestion

```
┌────────────────────────────────┐
│ ↗  Head to Midtown    [92]    │
└────────────────────────────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| zoneName | string | Zone to recommend |
| score | number | Zone score |
| distance | string | Optional distance |
| onPress | function | Navigate to zone |

**States:** Default, Pressed, Hidden (no recommendation)

---

##### 4. EarningsSummary
**Purpose:** Big earnings display with period selector

```
┌────────────────────────┐
│     $127.50            │
│     Today              │
│  ← Day | Week | Month →│
└────────────────────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| amount | number | Earnings value |
| period | 'day' \| 'week' \| 'month' | Selected period |
| onPeriodChange | function | Period change handler |

---

##### 5. PlatformBreakdown
**Purpose:** Visual earnings split by platform

```
████████████ DoorDash  $89.00
████████    Uber Eats  $38.50
```

| Prop | Type | Description |
|------|------|-------------|
| doordash | number | DoorDash earnings |
| ubereats | number | Uber Eats earnings |

---

##### 6. DeliveryListItem
**Purpose:** Single delivery in list

```
┌────────────────────────────────┐
│ 🍕 Pizza Hut          $12.00  │
│ 2:34 PM · DoorDash · 2.1 mi   │
└────────────────────────────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| restaurant | string | Restaurant name |
| amount | number | Total earnings |
| tip | number | Tip portion |
| platform | 'doordash' \| 'ubereats' | Source |
| time | Date | Delivery time |
| distance | number | Miles |

---

##### 7. MileageSummary
**Purpose:** Mileage with tax deduction

```
┌────────────────────────┐
│  ● Tracking Active     │
│     47.2 mi            │
│     $26.86 saved       │
└────────────────────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| miles | number | Total miles |
| taxRate | number | IRS rate per mile |
| isTracking | boolean | Tracking status |

---

##### 8. TripListItem
**Purpose:** Single trip in mileage list

```
┌────────────────────────────────┐
│ 9:15 AM - 10:02 AM    3.2 mi  │
│ Downtown → Midtown            │
└────────────────────────────────┘
```

---

##### 9. ProPaywall
**Purpose:** Upgrade prompt sheet

| Element | Description |
|---------|-------------|
| Benefits list | Checkmark list of Pro features |
| Pricing cards | Monthly/Annual with savings badge |
| CTA button | "Continue" to purchase |
| Restore link | For existing subscribers |

---

##### 10. ZoneDetailSheet
**Purpose:** Expanded zone info in bottom sheet

```
┌────────────────────────────────┐
│   Midtown - Score 92          │
│   ━━━━━━━━━━━━━━━━━━━━         │
│   Restaurants: ████████ High  │
│   Weather: Rain +20           │
│   Events: MSG Concert +15     │
│   Traffic: Light 0            │
│                               │
│   [Navigate Here]             │
└────────────────────────────────┘
```

---

#### Component States (All Components)

| State | Visual Treatment |
|-------|------------------|
| Default | Normal appearance |
| Pressed | Slight scale down (0.98) + opacity |
| Disabled | 40% opacity, no interaction |
| Loading | Skeleton or spinner |
| Error | Red border/text where applicable |

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

**Philosophy:** Every pattern optimized for speed and simplicity. No unnecessary confirmations.

---

#### Button Hierarchy

| Type | Style | Usage |
|------|-------|-------|
| Primary | Solid cyan (`#06B6D4`), black text | Main action per screen |
| Secondary | Outline cyan, cyan text | Alternative actions |
| Tertiary | Text only, cyan | Links, minor actions |
| Destructive | Solid red (`#EF4444`) | Delete, disconnect |

**Rules:**
- Max 1 primary button per screen
- Minimum tap target: 44x44px
- Border radius: 10px

---

#### Feedback Patterns

| Type | Pattern | Duration |
|------|---------|----------|
| Success | Toast at top, green | 2 seconds, auto-dismiss |
| Error | Toast at top, red | 4 seconds, tap to dismiss |
| Loading | Inline spinner or skeleton | Until complete |
| Sync | Subtle indicator in header | Background, non-blocking |

**Rules:**
- No modal alerts for routine feedback
- Toasts stack from top, max 2 visible
- Loading states use skeleton, not spinners (faster perceived performance)

---

#### Form Patterns

| Element | Decision |
|---------|----------|
| Label position | Above input |
| Required indicator | None (all fields required unless stated) |
| Validation timing | On blur + on submit |
| Error display | Inline below field, red text |
| Help text | Gray caption below input |

**Rules:**
- Auto-focus first field when screen opens
- Show/hide password toggle on password fields
- Keyboard type matches input (email, number, etc.)

---

#### Navigation Patterns

| Element | Decision |
|---------|----------|
| Primary nav | Bottom tab bar (4 tabs) |
| Tab icons | Filled when active, outline when inactive |
| Active indicator | Cyan color + filled icon |
| Back button | iOS: chevron left, Android: arrow left |
| Deep linking | Supported for all main screens |

**Tabs:**
1. Zones (map icon) - Default
2. Earnings (dollar icon)
3. Mileage (road icon)
4. Settings (gear icon)

---

#### Bottom Sheet Patterns

| State | Snap Point |
|-------|------------|
| Collapsed | 120px (summary visible) |
| Half | 50% screen |
| Expanded | 85% screen (map peek visible) |

**Behavior:**
- Drag handle always visible
- Swipe down to collapse
- Tap outside (on map) to collapse
- Tap content to expand

---

#### Empty States

| Scenario | Message | Action |
|----------|---------|--------|
| No earnings yet | "No deliveries synced" | [Connect Platform] |
| No mileage | "Start driving to track miles" | None (auto-starts) |
| No zones (location off) | "Enable location to see zones" | [Enable Location] |
| No connection | "You're offline" | [Retry] |

**Rules:**
- Always show icon + short message + action (if applicable)
- Keep it encouraging, not blaming

---

#### Confirmation Patterns

| Action | Confirmation? |
|--------|--------------|
| Delete trip | Yes - inline "Undo" toast (5 sec) |
| Disconnect platform | Yes - bottom sheet confirmation |
| Delete account | Yes - type "DELETE" to confirm |
| Log out | No |
| Cancel subscription | Handled by App Store/Play Store |

**Philosophy:** Undo > Confirm. Let users act fast, give undo option.

---

#### Pull-to-Refresh

| Screen | Behavior |
|--------|----------|
| Zones map | Refresh zone scores |
| Earnings | Trigger platform sync |
| Mileage | Refresh trip list |

**Animation:** Native iOS/Android pull-to-refresh

---

#### Date/Time Display

| Context | Format |
|---------|--------|
| Today's earnings | "Today" |
| Recent delivery | "2:34 PM" |
| Past delivery | "Dec 28, 2:34 PM" |
| Trip duration | "9:15 AM - 10:02 AM" |
| Export range | "Jan 1 - Dec 31, 2024" |

**Rules:**
- Use relative time for today ("2 hours ago")
- Use absolute time for anything older
- Always show user's local timezone

---

#### Loading Patterns

| Context | Pattern |
|---------|---------|
| Initial app load | Splash → Map (no intermediate) |
| Map loading | Map skeleton with shimmer |
| List loading | Skeleton rows (3 visible) |
| Button action | Spinner inside button, disabled state |
| Background sync | Subtle header indicator only |

---

#### Gesture Patterns

| Gesture | Action |
|---------|--------|
| Swipe left/right (Earnings) | Change time period |
| Swipe up (Bottom sheet) | Expand |
| Swipe down (Bottom sheet) | Collapse |
| Pinch (Map) | Zoom |
| Long press (Trip) | Show delete option |

**Rules:**
- All gestures have button alternatives (accessibility)
- No hidden gestures for critical actions

---

## 8. Responsive Design & Accessibility

### 8.1 Responsive Strategy

**Platform:** Mobile only (iOS + Android). No tablet or web optimization for MVP.

---

#### Device Size Handling

| Device Class | Screen Width | Adaptation |
|--------------|--------------|------------|
| Small phones | < 375px | Tighter spacing, smaller fonts allowed |
| Standard phones | 375-414px | Default design |
| Large phones | > 414px | More breathing room, same layout |

**Rules:**
- Map always fills available space
- Bottom sheet uses percentage heights (not fixed)
- Tab bar fixed at bottom, standard height (49pt iOS, 56dp Android)
- Safe areas respected (notch, home indicator)

---

#### Orientation

| Orientation | Support |
|-------------|---------|
| Portrait | Full support (primary) |
| Landscape | Lock to portrait for MVP |

**Rationale:** Drivers use phones in portrait mounts. Landscape adds complexity without value.

---

#### Safe Areas

```
┌─────────────────────────────┐
│▓▓▓▓▓ Status Bar ▓▓▓▓▓▓▓▓▓▓│  ← Respect top inset
├─────────────────────────────┤
│                             │
│         Content             │
│                             │
├─────────────────────────────┤
│▓▓▓▓▓ Home Indicator ▓▓▓▓▓▓│  ← Respect bottom inset
└─────────────────────────────┘
```

- Use `SafeAreaView` wrapper
- Bottom sheet respects home indicator
- Tab bar sits above home indicator

---

### 8.2 Accessibility Strategy

**Target:** WCAG 2.1 Level AA

---

#### Color & Contrast

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| Text contrast | 4.5:1 minimum | White on dark bg = 15.8:1 ✓ |
| Large text contrast | 3:1 minimum | All headings pass ✓ |
| Non-text contrast | 3:1 minimum | Buttons, icons pass ✓ |
| Color-blind safe | No red/green only | Zone colors use intensity + badges |

**Zone Accessibility:**
- Hot zones: Red-orange + score badge
- Warm zones: Orange-yellow + score badge
- Cool zones: Blue-cyan + score badge
- Score badges ensure color-blind users can distinguish zones

---

#### Touch Targets

| Element | Minimum Size |
|---------|--------------|
| Buttons | 44x44pt |
| Tab bar items | 44x49pt |
| List items | 44pt height minimum |
| Map zone badges | 44x44pt |

---

#### Screen Reader Support

| Element | Accessibility Label |
|---------|---------------------|
| Zone badge (92) | "Midtown zone, score 92 out of 100, hot zone" |
| Earnings | "Today's earnings, 127 dollars and 50 cents" |
| Recommendation | "Recommendation: Head to Midtown, score 92" |
| Tab: Zones | "Zones tab, selected" |
| Mileage tracking | "Mileage tracking active, 47.2 miles today" |

**Rules:**
- All interactive elements have labels
- Decorative images marked as decorative
- Dynamic content announces changes
- Focus order follows visual order

---

#### Keyboard/Switch Control

| Action | Support |
|--------|---------|
| Tab navigation | All interactive elements focusable |
| Focus indicators | Visible focus ring (cyan outline) |
| Escape/back | Closes sheets, goes back |
| Enter/Space | Activates buttons |

---

#### Motion & Animation

| Preference | Behavior |
|------------|----------|
| Reduce Motion ON | Disable map animations, instant transitions |
| Reduce Motion OFF | Smooth 200ms transitions, spring animations |

**Implementation:** Check `prefers-reduced-motion` / `accessibilityReduceMotion`

---

#### Text Scaling

| System Setting | Behavior |
|----------------|----------|
| Default | Design spec sizes |
| Large Text | Scale up to 1.5x, layouts adjust |
| Extra Large | Scale up to 2x, scrollable content |

**Rules:**
- Use relative font sizes (not fixed px)
- Test at 200% scale
- Truncate with ellipsis, don't clip

---

#### Testing Checklist

| Test | Tool |
|------|------|
| Color contrast | Stark (Figma), Accessibility Inspector |
| Screen reader | VoiceOver (iOS), TalkBack (Android) |
| Keyboard nav | Physical keyboard + Switch Control |
| Motion sensitivity | Reduce Motion toggle |
| Text scaling | System font size settings |

---

## 9. Implementation Guidance

### 9.1 Summary

**What We Created Together:**

| Area | Decision |
|------|----------|
| Design System | Tamagui (compiler-optimized, minimal footprint) |
| Color Theme | Clean Pro (cyan primary, dark mode, professional) |
| Design Direction | Bottom Sheet (Apple Maps pattern, familiar UX) |
| User Journeys | 6 flows designed with minimum-tap philosophy |
| Components | 10 custom + Tamagui primitives |
| UX Patterns | 12 consistency rule categories defined |
| Accessibility | WCAG 2.1 AA compliance target |

---

### 9.2 Implementation Priority

**Phase 1: Foundation**
1. Set up Tamagui with Clean Pro theme tokens
2. Implement bottom tab navigation (Expo Router)
3. Build ZoneMap component with Mapbox GL
4. Create bottom sheet with snap points

**Phase 2: Core Experience**
5. Zone score badges on map
6. Recommendation banner
7. Zone detail sheet (expanded state)

**Phase 3: Features**
8. Earnings tab with summary + list
9. Mileage tab with tracking status
10. Settings tab with preferences

**Phase 4: Polish**
11. Empty states
12. Loading skeletons
13. Error handling
14. Accessibility labels

---

### 9.3 Key Files for Developers

| File | Purpose |
|------|---------|
| `ux-design-specification.md` | This document - all UX decisions |
| `ux-color-themes.html` | Interactive color palette reference |
| `ux-design-directions.html` | Visual mockups of chosen direction |
| `architecture.md` | Technical implementation details |
| `PRD.md` | Product requirements |
| `epics.md` | Development stories |

---

### 9.4 Design Tokens (Tamagui Config)

```typescript
// tamagui.config.ts - Key tokens from this spec

const tokens = {
  color: {
    primary: '#06B6D4',
    secondary: '#0EA5E9',
    accent: '#8B5CF6',
    background: '#09090B',
    surface: '#18181B',
    border: '#27272A',
    textPrimary: '#FFFFFF',
    textSecondary: '#A1A1AA',
    success: '#22C55E',
    warning: '#EAB308',
    error: '#EF4444',
    zoneHot: '#EF4444',
    zoneWarm: '#F97316',
    zoneCool: '#06B6D4',
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 12,
    xl: 16,
    full: 9999,
  },
}
```

---

### 9.5 Next Steps

1. **Architecture Review** - Confirm tech decisions align with UX needs
2. **Epic 1: Foundation** - Begin implementation per `epics.md`
3. **Design Iteration** - Refine as you build, update this spec

---

## Appendix

### Related Documents

- Product Requirements: `docs/PRD.md`
- Architecture: `docs/architecture.md`
- Epics: `docs/epics.md`

### Core Interactive Deliverables

- **Color Theme Visualizer**: `docs/ux-color-themes.html`
- **Design Direction Mockups**: `docs/ux-design-directions.html`

### Version History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-30 | 1.0 | Initial UX Design Specification | George |

---

_This UX Design Specification was created through collaborative design facilitation, not template generation. All decisions were made with user input and are documented with rationale._
