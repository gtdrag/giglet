import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the events service to test the calculation logic
describe('EventsService', () => {
  describe('calculateEventScore', () => {
    // Test event data
    const mockEvent = {
      id: 'test-1',
      name: 'Lakers vs Celtics',
      venue: {
        name: 'Crypto.com Arena',
        lat: 34.043,
        lng: -118.267,
        capacity: 20000, // Arena size
      },
      startTime: new Date('2026-01-03T20:00:00Z'),
      endTime: new Date('2026-01-03T23:00:00Z'),
      type: 'sports' as const,
    };

    it('should return base score when no events nearby', async () => {
      // Import the service
      const { eventsService } = await import('../events.service');

      // Test with empty events array
      const result = eventsService.calculateEventScore(
        [],
        34.05,
        -118.24,
        new Date('2026-01-03T19:00:00Z')
      );

      expect(result.score).toBe(20);
      expect(result.nearbyEvents).toHaveLength(0);
    });

    it('should boost score when event is within time window', async () => {
      const { eventsService } = await import('../events.service');

      // 1 hour before event start (within 3-hour window before)
      const result = eventsService.calculateEventScore(
        [mockEvent],
        34.043, // Same location as venue
        -118.267,
        new Date('2026-01-03T19:00:00Z')
      );

      // Should have boost since we're close and within time window
      expect(result.score).toBeGreaterThan(20);
      expect(result.nearbyEvents).toHaveLength(1);
      expect(result.nearbyEvents[0].name).toBe('Lakers vs Celtics');
    });

    it('should not boost score when event is outside time window', async () => {
      const { eventsService } = await import('../events.service');

      // 12 hours before event (outside 3-hour window)
      const result = eventsService.calculateEventScore(
        [mockEvent],
        34.043,
        -118.267,
        new Date('2026-01-03T08:00:00Z')
      );

      expect(result.score).toBe(20);
      expect(result.nearbyEvents).toHaveLength(0);
    });

    it('should reduce boost based on distance', async () => {
      const { eventsService } = await import('../events.service');
      const timestamp = new Date('2026-01-03T19:00:00Z');

      // Close to venue
      const closeResult = eventsService.calculateEventScore(
        [mockEvent],
        34.043,
        -118.267,
        timestamp
      );

      // 3km away from venue
      const farResult = eventsService.calculateEventScore(
        [mockEvent],
        34.07, // ~3km north
        -118.267,
        timestamp
      );

      expect(closeResult.score).toBeGreaterThan(farResult.score);
    });

    it('should apply sports multiplier correctly', async () => {
      const { eventsService } = await import('../events.service');
      const timestamp = new Date('2026-01-03T19:00:00Z');
      const location = { lat: 34.043, lng: -118.267 };

      // Sports event
      const sportsResult = eventsService.calculateEventScore(
        [mockEvent],
        location.lat,
        location.lng,
        timestamp
      );

      // Same event but as theater (lower multiplier)
      const theaterEvent = { ...mockEvent, type: 'theater' as const };
      const theaterResult = eventsService.calculateEventScore(
        [theaterEvent],
        location.lat,
        location.lng,
        timestamp
      );

      // Sports should have higher boost (1.2 vs 0.9 multiplier)
      expect(sportsResult.score).toBeGreaterThan(theaterResult.score);
    });

    it('should scale boost by venue capacity', async () => {
      const { eventsService } = await import('../events.service');
      const timestamp = new Date('2026-01-03T19:00:00Z');
      const location = { lat: 34.043, lng: -118.267 };

      // Stadium event (50k+ capacity)
      const stadiumEvent = { ...mockEvent, venue: { ...mockEvent.venue, capacity: 60000 } };
      const stadiumResult = eventsService.calculateEventScore(
        [stadiumEvent],
        location.lat,
        location.lng,
        timestamp
      );

      // Small venue (1000 capacity)
      const smallEvent = { ...mockEvent, venue: { ...mockEvent.venue, capacity: 1000 } };
      const smallResult = eventsService.calculateEventScore(
        [smallEvent],
        location.lat,
        location.lng,
        timestamp
      );

      expect(stadiumResult.score).toBeGreaterThan(smallResult.score);
    });
  });

  describe('isConfigured', () => {
    it('should return false when API key is not set', async () => {
      const originalKey = process.env.TICKETMASTER_API_KEY;
      delete process.env.TICKETMASTER_API_KEY;

      // Re-import to get fresh instance
      vi.resetModules();
      const { eventsService } = await import('../events.service');

      expect(eventsService.isConfigured()).toBe(false);

      // Restore
      process.env.TICKETMASTER_API_KEY = originalKey;
    });
  });
});
