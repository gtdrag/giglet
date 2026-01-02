# Giglet UX Design Specification

_Created on 2025-12-30 by George_
_Updated: 2026-01-02 - Simplified to 2-tab architecture_

---

## Executive Summary

Giglet is a mobile app for food delivery drivers that helps them earn more by showing the best zones to work, tracking mileage for taxes, and consolidating earnings across platforms.

**Design Philosophy:** Minimal, focused, driver-first. The app should be glanceable while sitting in a parking lot between deliveries.

**Core Experience:** Open app → See Focus Zones map → Know exactly where to position. Glanceable at a red light in <2 seconds.

---

## 1. Navigation Architecture

### 1.1 Two-Tab Design

The app uses a simple 2-tab bottom navigation:

| Tab | Icon | Purpose |
|-----|------|---------|
| **Map** | Map pin | Real-time location intelligence - where to go NOW |
| **Dashboard** | Chart/grid | Historical data & settings - what happened BEFORE |

**Rationale:** Drivers need two modes:
1. **Active mode (Map):** "Where should I go?"
2. **Review mode (Dashboard):** "How am I doing?"

Four tabs was over-engineered. Two tabs keeps focus on what matters.

**Key Insight:** Earnings and mileage data comes from periodic CSV imports, not real-time sync. Showing stale data on the map would be confusing. Clean separation: Map = live, Dashboard = historical.

---

## 2. Map Tab (Primary Experience)

The Map tab is where the action happens. It's the hero screen of the app.

### 2.1 Layout

```
┌─────────────────────────────────┐
│  "Head to Downtown. Rain boost" │  ← Best Zone Banner
├─────────────────────────────────┤
│                                 │
│         [MAP VIEW]              │
│                                 │
│    Focus Zones (colored hexes)  │
│    My Tips (markers, optional)  │
│    Current Location (dot)       │
│                                 │
│                        [+]      │  ← Tip Logger FAB
├─────────────────────────────────┤
│  [Zones ✓] [My Tips]            │  ← Layer toggles
└─────────────────────────────────┘
│       [Map]    [Dashboard]      │  ← 2-Tab Bar
└─────────────────────────────────┘
```

### 2.2 Map Components

| Component | Description |
|-----------|-------------|
| **Focus Zones** | H3 hexagons color-coded by Giglet Score (0-100). Hot = red/orange, Cold = blue |
| **Best Zone Banner** | Top banner: "Head to [Zone]. [Reason]." Tappable to center map. |
| **Tip Logger FAB** | Floating action button (bottom right). Tap → size picker → saves GPS + rating |
| **My Tips Layer** | Toggle to show/hide personal tip location markers. Color-coded by size. |
| **Current Location** | Blue dot showing driver's position |
| **Layer Toggles** | Bottom controls to show/hide Zones and My Tips layers |

### 2.3 Zone Tap Interaction

When user taps a zone hexagon:
- Modal/sheet slides up showing:
  - Giglet Score (large number, 0-100)
  - Contributing factors with icons (e.g., "Rain expected", "Lunch rush", "Concert nearby")
  - Score breakdown visualization

### 2.4 Tip Logger Flow

1. Tap FAB (+)
2. Quick picker appears: `None | S | M | L | XL | XXL`
3. Tap size → saves current GPS + size + timestamp
4. Brief confirmation toast: "Tip logged!"
5. Haptic feedback

**Design Note:** No typing required. One tap to open, one tap to save.

### 2.5 My Tips Layer

When "My Tips" toggle is enabled:
- Markers appear at logged tip locations
- Color-coded by size:
  - XXL/XL/L = Green shades (good tips)
  - M = Yellow (okay tips)
  - S/None = Gray/Red (low tips)
- Markers cluster when zoomed out
- Tap marker → shows tip size, date, reverse-geocoded address

---

## 3. Dashboard Tab

The Dashboard is a single scrollable page with card sections. No sub-navigation needed.

### 3.1 Layout

```
┌─────────────────────────────────┐
│  Earnings                       │
│  $127.50 today                  │
│  [Today ▾] [DoorDash] [Uber]    │
│  → View all deliveries          │
├─────────────────────────────────┤
│  Mileage                        │
│  23.4 mi today • $15.68 tax est │
│  → View trip history            │
├─────────────────────────────────┤
│  Import Earnings                │
│  Last import: 2 days ago        │
│  [DoorDash CSV] [Uber CSV]      │
├─────────────────────────────────┤
│  Tax Export (Pro)               │
│  Export mileage log & earnings  │
├─────────────────────────────────┤
│  Settings                       │
│  Profile, notifications, account│
└─────────────────────────────────┘
```

### 3.2 Card Order Rationale

1. **Earnings** - What drivers care about most
2. **Mileage** - Tax benefit reminder (money-saving)
3. **Import** - Action they need to do periodically
4. **Export** - Less frequent, Pro feature
5. **Settings** - Rarely touched

### 3.3 Card Details

#### Earnings Card
- **Primary:** Today's total (large font)
- **Period selector:** Today / This Week / This Month / This Year
- **Platform breakdown:** Visual split (DoorDash vs Uber Eats)
- **Drill-down:** "View all deliveries" → list of individual deliveries

#### Mileage Card
- **Primary:** Miles for selected period
- **Secondary:** Tax deduction estimate (miles × $0.67 IRS rate)
- **Tracking status:** Indicator if auto-tracking is active
- **Drill-down:** "View trip history" → list of trips

#### Import Card
- **Status:** When last import happened
- **Actions:** Buttons to import from each platform
- **Flow:** Tap → file picker → preview → confirm

#### Tax Export Card (Pro)
- **Gated:** Shows lock icon for free users with upgrade prompt
- **Actions:** Export mileage log (CSV/PDF), Export earnings summary
- **Flow:** Tap → date range picker → format picker → share sheet

#### Settings Card
- **Minimal:** Just a link to full settings screen
- **Settings screen contains:** Profile, notifications, subscription, privacy, logout, delete account

---

## 4. Visual Design

### 4.1 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Dark-first** | Dark theme default (drivers work at night) |
| **Glanceable** | Large numbers, high contrast, minimal text |
| **Touch-friendly** | 44pt minimum tap targets |
| **Color = Information** | Zone scores, tip sizes, earnings changes all use color |

### 4.2 Color System

| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#06B6D4` | Buttons, active states |
| Background | `#09090B` | App background |
| Surface | `#18181B` | Cards, sheets |
| Text Primary | `#FFFFFF` | Headings |
| Text Secondary | `#A1A1AA` | Labels |
| Success | `#22C55E` | Positive earnings, good tips |
| Warning | `#EAB308` | Caution states |
| Error | `#EF4444` | Errors, negative states |

**Zone Heatmap:**
- Hot (80-100): `#EF4444` → `#F97316`
- Warm (50-79): `#F97316` → `#EAB308`
- Cool (0-49): `#0EA5E9` → `#06B6D4`

**Tip Markers:**
- XXL/XL: Dark green `#15803D`
- L: Green `#22C55E`
- M: Yellow `#EAB308`
- S: Orange `#F97316`
- None: Gray `#71717A`

---

## 5. Key User Flows

### 5.1 Active Driving Session
```
Open app → Map Tab → See zones → Drive to hot zone →
Get delivery → Complete → Log tip (optional) → Repeat
```

### 5.2 End of Day Review
```
Open app → Dashboard Tab → Check earnings →
Check mileage → (Optional: Import new CSV)
```

### 5.3 Weekly Import
```
Dashboard → Import Card → [DoorDash CSV] →
File picker → Preview → Confirm → Earnings updated
```

### 5.4 Tax Time Export
```
Dashboard → Tax Export → Select date range →
Choose format → Export → Share with accountant
```

---

## 6. Navigation Structure (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   └── onboarding.tsx
├── (tabs)/
│   ├── _layout.tsx        # 2-tab layout
│   ├── index.tsx          # Map tab (default)
│   └── dashboard.tsx      # Dashboard tab
├── settings/
│   ├── index.tsx          # Settings list
│   ├── profile.tsx
│   ├── notifications.tsx
│   └── subscription.tsx
├── deliveries/
│   └── index.tsx          # Full delivery list
├── trips/
│   └── index.tsx          # Full trip list
└── _layout.tsx            # Root layout
```

---

## 7. Component Inventory

### From Design System (Tamagui)
- `Button`, `Text`, `Input`, `Stack`, `Card`, `Sheet`, `Switch`

### Custom Components
| Component | Purpose |
|-----------|---------|
| `ZoneMap` | Mapbox GL with zone overlays |
| `RecommendationBanner` | "Head to [Zone]" banner |
| `TipLoggerFAB` | Floating action button for tip logging |
| `TipSizePicker` | Quick picker (None/S/M/L/XL/XXL) |
| `EarningsCard` | Dashboard earnings summary |
| `MileageCard` | Dashboard mileage summary |
| `ImportCard` | CSV import actions |
| `ExportCard` | Tax export actions (Pro) |
| `SettingsCard` | Link to settings |
| `ZoneDetailSheet` | Zone breakdown on tap |

---

## 8. What We Removed (Simplification)

| Removed | Reason |
|---------|--------|
| 4-tab navigation | Over-engineered. 2 tabs sufficient. |
| Separate Mileage tab | Consolidated into Dashboard card |
| Separate Settings tab | Consolidated into Dashboard |
| Earnings badge on map | No real-time data; would be stale |
| Complex sub-navigation | Single scrollable page is simpler |
| Bottom sheet on Map tab | Zone details only when tapped |

---

## 9. Accessibility

- WCAG 2.1 Level AA target
- 44pt minimum tap targets
- Color not sole indicator (icons + color for zones)
- VoiceOver/TalkBack labels for all interactive elements
- Reduce motion option respected
- High contrast (white on dark = 15.8:1)

---

## Appendix: Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-30 | Tamagui design system | Performance, Expo integration |
| 2025-12-30 | Bottom sheet pattern | Apple Maps familiarity |
| 2026-01-02 | 2-tab architecture | Map = action, Dashboard = data |
| 2026-01-02 | Dashboard as single scroll | No sub-navigation needed |
| 2026-01-02 | Map stays pure | CSV import = stale data on map confusing |
| 2026-01-02 | Card order | Priority: Earnings → Mileage → Import → Export → Settings |

---

_This UX Design Specification was created through collaborative design facilitation between George and Claude._
