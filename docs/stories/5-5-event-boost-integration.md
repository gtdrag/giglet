# Story 5.5: Event Boost Integration

## Story

**As a** system,
**I want** to boost zone scores near events,
**So that** drivers know where demand will spike.

## Acceptance Criteria

**Given** a concert is happening at 8 PM in Zone X
**When** zone scores are calculated between 5 PM and 11 PM
**Then** Zone X and adjacent zones receive event boost (factor: 1.3-1.6)

**Given** a sports game is happening
**When** zone scores are calculated during game time
**Then** zones near the stadium receive event boost

**Given** no events are nearby
**When** zone scores are calculated
**Then** no event boost is applied

## Prerequisites

- Story 5.2 (Zone Scoring Algorithm Backend) - Complete

## Technical Notes

- Use Ticketmaster Discovery API
- Geocode event venues to zones
- Boost starts 2-3 hours before event, ends 2 hours after
- Scale boost by event size (stadium vs small venue)
- Cache event data daily
- Factor: 1.3-1.6 for zones near events

## Implementation Tasks

### Task 1: Create Events Service

Create `src/services/events.service.ts`:

- Implement Ticketmaster Discovery API integration
- Search for events within radius of coordinates
- Parse event data: name, venue, start time, venue capacity
- Cache event data in Redis (24-hour TTL)
- Graceful fallback when API unavailable

### Task 2: Add Event Boost Calculation

Update zones service to:

- Fetch nearby events for a location
- Calculate event boost factor based on:
  - Event proximity (closer = higher boost)
  - Event size (stadium 50k+ = 1.6, arena 10k+ = 1.4, small <5k = 1.3)
  - Time window (2-3 hours before, during, 2 hours after)
- Return normalized 0-40 score component

### Task 3: Add Environment Configuration

- Add TICKETMASTER_API_KEY to environment
- Update env validation schema

### Task 4: Integration Testing

- Test with real API key
- Verify boost calculation logic
- Test cache behavior

## Status

- [x] Story file created
- [x] Events service implemented (src/services/events.service.ts)
- [x] Zone scoring updated (src/services/zones.service.ts)
- [x] Environment configured (.env with TICKETMASTER_API_KEY placeholder)
- [x] Unit tests created and passing (7 tests)

## Files Changed

- `apps/api/src/services/events.service.ts` - New Ticketmaster API integration
- `apps/api/src/services/zones.service.ts` - Added eventBoost factor to scoring
- `apps/api/src/controllers/zones.controller.ts` - Updated to include nearbyEvents in response
- `apps/api/src/schemas/zones.schema.ts` - Added lat/lng to score endpoint
- `apps/api/src/services/__tests__/events.service.test.ts` - Unit tests
- `apps/api/.env` - Added TICKETMASTER_API_KEY placeholder
- `docs/stories/5-5-event-boost-integration.md` - This story file

## Implementation Notes

1. **Event Service** (`events.service.ts`):
   - Ticketmaster Discovery API integration
   - 24-hour cache for event data (events don't change frequently)
   - Boost calculation based on:
     - Venue capacity (stadium: 60, arena: 50, large: 40, medium: 30, small: 20)
     - Event type multiplier (sports: 1.2, concert: 1.1, theater: 0.9, other: 1.0)
     - Distance decay (peak within 1km, max 5km)
     - Time window (3 hours before, during event, 2 hours after)

2. **Zone Scoring** updated weights:
   - mealTime: 0.20
   - peakHour: 0.20
   - weekend: 0.10
   - weather: 0.20
   - event: 0.15
   - base: 0.15

3. **API Response** now includes:
   - `nearbyEvents` array with event name, venue, and "startsIn" time
   - `eventBoost` factor in the factors breakdown
