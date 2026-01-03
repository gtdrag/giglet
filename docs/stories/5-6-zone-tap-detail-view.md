# Story 5.6: Zone Tap Detail View

## Story

**As a** user,
**I want** to tap a zone and see why it's hot or cold,
**So that** I understand the recommendation.

## Acceptance Criteria

**Given** I tap on a zone on the map
**When** the detail modal opens
**Then** I see the Giglet Score (0-100)
**And** I see contributing factors: "High restaurant density", "Rain expected", "Concert nearby"
**And** factors are listed with their impact (positive/negative icons)

**Given** a zone has score 85
**When** I view details
**Then** I understand this is a hot zone
**And** I see specific reasons (not just "score: 85")

## Prerequisites

- Story 5.2 (Zone Scoring Algorithm Backend) - Complete
- Story 5.1 (Focus Zones Map Display) - Complete

## Technical Notes

- Store factor breakdown with each score
- Display top 3-4 most impactful factors
- Use icons: restaurant icon, weather icon, event icon, traffic icon
- Show relative impact (high/medium/low)

## Implementation Tasks

### Task 1: Create ZoneDetailModal Component

Create modal component showing:
- Score with color indicator (Hot/Busy/Moderate/Slow/Dead)
- Score factors with icons
- Nearby events if any
- Weather description

### Task 2: Add Factor Descriptions

Map factor scores to human-readable descriptions:
- mealTimeBoost → "Dinner rush" / "Lunch time" / "Off-peak hours"
- peakHourBoost → "Peak delivery hours" / "Slow period"
- weekendBoost → "Weekend boost" / "Weekday"
- weatherBoost → "Rain driving demand" / "Clear weather"
- eventBoost → "Lakers game nearby" / "Concert at venue"

### Task 3: Integrate with Map

- Add onPress handler to zone markers/polygons
- Fetch zone score with factors on tap
- Show modal with animated slide-up

## Status

- [x] Story file created
- [x] ZoneDetailModal component created
- [x] Factor descriptions implemented
- [x] Map integration complete
- [ ] Tested on iOS/Android
