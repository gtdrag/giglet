# Story: Community Slow Spot Reports (Zone-Integrated)

Status: drafted

## Story

**As a** delivery driver,
**I want** to see slow restaurant wait times reported by other drivers when I tap on a Focus Zone,
**So that** I can make fully-informed decisions about whether to work that zone and which restaurants to avoid.

## Acceptance Criteria

1. **Given** I tap on a Focus Zone, **When** the zone modal opens, **Then** I see a "Slow Spots Nearby" section showing the top 3 slow restaurants reported within that zone

2. **Given** there are no slow spot reports in a zone, **When** the modal opens, **Then** the Slow Spots section shows "No slow spots reported" or is hidden

3. **Given** I want to report a slow restaurant, **When** I tap "Report Slow Spot" in the zone modal, **Then** I can enter a restaurant name and optional message, and submit with my GPS captured automatically

4. **Given** a report is older than 2 hours, **When** the zone slow spots are calculated, **Then** expired reports are excluded from the list

5. **Given** I submit a report, **When** it saves successfully, **Then** I see confirmation feedback and the slow spots list refreshes

6. **Given** I am in Chicago and tap a zone, **When** slow spots load, **Then** I only see reports from within that zone's radius (not from LA or NYC)

## Prerequisites

- Story 5.6 (Zone Tap Detail View) - Complete
- Backend API infrastructure

## Tasks / Subtasks

- [ ] Task 1: Design Database Schema (AC: 4, 6)
  - [ ] Create `slow_spot_reports` table:
    ```
    id: UUID (primary key)
    restaurant_name: VARCHAR(255)
    message: TEXT (nullable)
    lat: DECIMAL(10, 7)
    lng: DECIMAL(10, 7)
    created_at: TIMESTAMP
    ```
  - [ ] Add spatial index on (lat, lng) for radius queries
  - [ ] Add index on created_at for expiration filtering
  - [ ] Create cleanup job for reports older than 24 hours

- [ ] Task 2: Implement Report Submission API (AC: 3, 5)
  - [ ] POST `/api/v1/slow-spots` endpoint
  - [ ] Request body:
    ```typescript
    {
      restaurant_name: string;  // Required
      message?: string;         // Optional
      lat: number;              // Required - reporter's GPS
      lng: number;              // Required - reporter's GPS
    }
    ```
  - [ ] Validate restaurant_name is not empty
  - [ ] Store report with current timestamp
  - [ ] Return created report with ID

- [ ] Task 3: Implement Get Slow Spots API (AC: 1, 4, 6)
  - [ ] GET `/api/v1/slow-spots?lat=X&lng=Y&radius=Z` endpoint
  - [ ] Query reports within radius (default 5 miles) of provided coordinates
  - [ ] Filter to reports from last 2 hours only
  - [ ] Aggregate by restaurant_name, count occurrences
  - [ ] Return top 3 ranked by report count:
    ```typescript
    {
      slowSpots: [
        { restaurant: string, count: number, lastMessage?: string }
      ]
    }
    ```

- [ ] Task 4: Extend ZoneDetailData Interface (AC: 1, 2)
  - [ ] Add `SlowSpot` interface to types:
    ```typescript
    interface SlowSpot {
      restaurant: string;
      count: number;
      lastMessage?: string;
    }
    ```
  - [ ] Extend `ZoneDetailData`:
    ```typescript
    interface ZoneDetailData {
      // ...existing fields
      slowSpots?: SlowSpot[];
    }
    ```

- [ ] Task 5: Fetch Slow Spots with Zone Data (AC: 1, 6)
  - [ ] When zone is tapped, call slow spots API with zone's lat/lng
  - [ ] Pass zone radius (or default 5 miles) as query param
  - [ ] Include slowSpots in ZoneDetailData passed to modal
  - [ ] Handle loading/error states

- [ ] Task 6: Add Slow Spots Section to ZoneDetailModal (AC: 1, 2)
  - [ ] Add new section between "Score Factors" and "Nearby Events"
  - [ ] Section header: "Slow Spots Nearby" with warning icon
  - [ ] Render top 3 slow spots with:
    - Restaurant name
    - Report count badge
    - Last message (if available)
  - [ ] Color coding: 🔴 (5+ reports), 🟠 (3-4), 🟡 (1-2)
  - [ ] Empty state: "No slow spots reported nearby" or hide section
  - [ ] Add divider above/below section

- [ ] Task 7: Add Report Slow Spot UI (AC: 3, 5)
  - [ ] Add "Report Slow Spot" button in zone modal (collapsible section or secondary button)
  - [ ] On tap, expand inline form OR open mini-modal:
    - Text input for restaurant name
    - Optional text input for message
    - Submit button
  - [ ] On submit: capture current GPS automatically
  - [ ] Show loading state during submission
  - [ ] Show success toast/feedback
  - [ ] Refresh slow spots list after successful submission

- [ ] Task 8: Add Unit Tests (AC: 1, 3, 4)
  - [ ] Test radius query returns only nearby reports
  - [ ] Test expiration filtering (>2 hours excluded)
  - [ ] Test aggregation and ranking logic
  - [ ] Test report submission validation

## Dev Notes

### Core Concept: Zone-Integrated Slow Spots

Instead of a standalone screen, slow spots are surfaced directly in the Zone Detail Modal. When a driver taps a zone to see "Is this zone hot?", they also see "But watch out for these slow restaurants."

**User flow:**
1. Driver sees zone circles on map
2. Taps a hot zone → modal opens
3. Sees score, factors, AND slow spots in one view
4. Makes informed decision: "Zone is hot, but I'll avoid Chipotle"

### Data Flow: Loading Zone with Slow Spots

```
Driver taps zone on map
        ↓
App has zone center coordinates (lat: 41.878, lng: -87.629)
        ↓
Parallel API calls:
  1. GET /api/v1/zones/{id}/score  (existing)
  2. GET /api/v1/slow-spots?lat=41.878&lng=-87.629&radius=5
        ↓
Combine responses into ZoneDetailData:
{
  score: 85,
  label: "Hot",
  factors: { ... },
  slowSpots: [
    { restaurant: "Chipotle Main St", count: 7, lastMessage: "25 min wait" },
    { restaurant: "Wendy's Oak Ave", count: 4 },
    { restaurant: "Popeyes 5th & Pine", count: 3 }
  ]
}
        ↓
ZoneDetailModal renders with slow spots section
```

### Data Flow: Submitting a Report

```
Driver is at slow restaurant (physically there)
        ↓
Opens zone modal (or has it open already)
        ↓
Taps "Report Slow Spot"
        ↓
Enters: "Chipotle Main St" + "25 min wait for 2 items"
        ↓
Taps Submit
        ↓
App captures current GPS: (41.878, -87.629)
        ↓
POST /api/v1/slow-spots
{
  restaurant_name: "Chipotle Main St",
  message: "25 min wait for 2 items",
  lat: 41.878,
  lng: -87.629
}
        ↓
Success → Toast "Report submitted!"
        ↓
Refresh slow spots list in modal
```

### Radius Query (Spatial Search)

Instead of grid zones, use simple radius search from zone center:

```sql
-- Find reports within 5 miles of zone center
-- Using Haversine formula approximation
SELECT
  restaurant_name,
  COUNT(*) as report_count,
  MAX(message) as last_message
FROM slow_spot_reports
WHERE created_at > NOW() - INTERVAL '2 hours'
  AND (
    -- Rough bounding box first (faster)
    lat BETWEEN :center_lat - 0.07 AND :center_lat + 0.07
    AND lng BETWEEN :center_lng - 0.09 AND :center_lng + 0.09
  )
  AND (
    -- Then precise distance check
    -- 0.07 degrees ≈ 5 miles latitude
    SQRT(POW(lat - :center_lat, 2) + POW(lng - :center_lng, 2)) < 0.07
  )
GROUP BY restaurant_name
ORDER BY report_count DESC
LIMIT 3;
```

For MVP, the rough bounding box alone may be sufficient.

### Updated ZoneDetailModal Structure

```
┌─────────────────────────────────┐
│  ─────  (drag handle)           │
│                            [X]  │
│                                 │
│  ┌────┐                         │
│  │ 85 │  Hot Zone               │
│  └────┘  Giglet Score           │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Score Factors                  │
│  🍽 Dinner rush          ████ 80│
│  ⏰ Peak hours           ███░ 65│
│  🌧 Rainy conditions     ██░░ 45│
│  🎫 Bulls game nearby    ███░ 60│
│  📅 Weekday              █░░░ 30│
│                                 │
│  ─────────────────────────────  │
│                                 │
│  ⚠️ Slow Spots Nearby           │  ← NEW
│  ┌─────────────────────────┐    │
│  │ 🔴 Chipotle Main St  7  │    │
│  │    "25 min wait"        │    │
│  ├─────────────────────────┤    │
│  │ 🟠 Wendy's Oak Ave   4  │    │
│  │    "drive thru slow"    │    │
│  ├─────────────────────────┤    │
│  │ 🟡 Popeyes 5th       3  │    │
│  └─────────────────────────┘    │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Nearby Events                  │
│  🎫 Bulls vs Lakers (starts 2h) │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  📍 Report a Slow Spot          │  ← NEW (collapsible)
│  ┌─────────────────────────┐    │
│  │ Restaurant name...      │    │
│  │ What's the wait? (opt)  │    │
│  │        [Submit Report]  │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🧭     Go Here          │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │        Close            │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Slow Spot Display Colors

| Report Count | Color | Indicator |
|--------------|-------|-----------|
| 5+ reports | Red (#EF4444) | 🔴 |
| 3-4 reports | Orange (#F97316) | 🟠 |
| 1-2 reports | Yellow (#EAB308) | 🟡 |

### Report Expiration

| Age | Behavior |
|-----|----------|
| 0-2 hours | Included in zone slow spots |
| 2-24 hours | Excluded from display, kept for analytics |
| 24+ hours | Deleted by cleanup job |

### Privacy & Anonymity

- No user ID stored with reports
- GPS coordinates stored are the reporter's location (effectively the restaurant's location since they're there)
- No login required to submit reports
- Reports are aggregated - individual submissions not shown

### API Response Shape

```typescript
// GET /api/v1/slow-spots?lat=41.878&lng=-87.629&radius=5
{
  slowSpots: [
    {
      restaurant: "Chipotle Main St",
      count: 7,
      lastMessage: "25 min wait"
    },
    {
      restaurant: "Wendy's Oak Ave",
      count: 4,
      lastMessage: "drive thru backed up"
    },
    {
      restaurant: "Popeyes 5th & Pine",
      count: 3,
      lastMessage: null
    }
  ],
  queriedAt: "2026-01-03T14:30:00Z",
  radius: 5,
  center: { lat: 41.878, lng: -87.629 }
}
```

### Report Submission Form

Keep it minimal to reduce friction:
- **Restaurant name** (required): Free text, max 100 chars
- **Message** (optional): Free text, max 200 chars, placeholder "What's the wait like?"
- **GPS**: Captured automatically, not shown to user

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Slow spots API fails | Show zone without slow spots section, don't block |
| Report submission fails | Show error toast, keep form populated for retry |
| No GPS available | Disable report submission, show message |

### Future Enhancements

- Restaurant name autocomplete from historical reports
- "Me too" button to upvote existing slow spot instead of new report
- Slow spots visible as small markers on the map itself
- Push notification: "Heads up - 5 drivers reported Chipotle slow in your zone"
- Slow spot trends: "Chipotle is usually slow 5-7pm"

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-03 | 1.0 | Story drafted (standalone screen) |
| 2026-01-03 | 2.0 | Revised to zone-integrated approach |
