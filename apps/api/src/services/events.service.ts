/**
 * Events Service
 * Fetches event data from Ticketmaster Discovery API and calculates event-based score boosts
 * Story 5.5: Event Boost Integration
 */

interface EventData {
  id: string;
  name: string;
  venue: {
    name: string;
    lat: number;
    lng: number;
    capacity?: number;
  };
  startTime: Date;
  endTime?: Date;
  type: 'concert' | 'sports' | 'theater' | 'other';
}

interface CachedEvents {
  events: EventData[];
  cachedAt: number;
  lat: number;
  lng: number;
}

// Event size boost multipliers based on venue capacity
const VENUE_CAPACITY_BOOSTS = {
  stadium: { minCapacity: 50000, boost: 60 },   // 60 score for stadium events
  arena: { minCapacity: 10000, boost: 50 },     // 50 score for arena events
  large: { minCapacity: 5000, boost: 40 },      // 40 score for large venues
  medium: { minCapacity: 1000, boost: 30 },     // 30 score for medium venues
  small: { minCapacity: 0, boost: 20 },         // 20 score for small venues
} as const;

// Event type boosts (some events drive more delivery demand)
const EVENT_TYPE_BOOSTS = {
  sports: 1.2,      // Sports fans order lots of food
  concert: 1.1,     // Concerts drive moderate food demand
  theater: 0.9,     // Theater goers less likely to order
  other: 1.0,
} as const;

// Proximity scoring (distance in km)
const PROXIMITY_CONFIG = {
  maxDistanceKm: 5,        // Events beyond this don't boost
  peakDistanceKm: 1,       // Maximum boost within this distance
} as const;

// Time window configuration
const TIME_WINDOW = {
  hoursBeforeEvent: 3,     // Boost starts 3 hours before
  hoursAfterEvent: 2,      // Boost ends 2 hours after
} as const;

// Cache configuration
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (events don't change often)
const API_TIMEOUT_MS = 10000; // 10 seconds

class EventsService {
  private cache: Map<string, CachedEvents> = new Map();
  private apiKey: string;
  private baseUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

  constructor() {
    this.apiKey = process.env.TICKETMASTER_API_KEY || '';
  }

  /**
   * Get event score for a location (0-100 scale)
   * Returns base score of 20 if no events nearby or API unavailable
   */
  async getEventScore(
    lat: number,
    lng: number,
    timestamp: Date = new Date()
  ): Promise<{ score: number; nearbyEvents: Array<{ name: string; venue: string; startsIn: string }> }> {
    try {
      const events = await this.getNearbyEvents(lat, lng);
      if (!events || events.length === 0) {
        return { score: 20, nearbyEvents: [] };
      }

      const result = this.calculateEventScore(events, lat, lng, timestamp);
      return result;
    } catch (error) {
      console.error('[EventsService] Error getting event score:', error);
      return { score: 20, nearbyEvents: [] };
    }
  }

  /**
   * Fetch nearby events from Ticketmaster API with caching
   */
  async getNearbyEvents(lat: number, lng: number, radiusKm: number = 10): Promise<EventData[]> {
    if (!this.apiKey) {
      console.warn('[EventsService] TICKETMASTER_API_KEY not configured');
      return [];
    }

    const cacheKey = this.getCacheKey(lat, lng);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const events = await this.fetchEventsFromApi(lat, lng, radiusKm);
      if (events.length > 0) {
        this.setCache(cacheKey, events, lat, lng);
      }
      return events;
    } catch (error) {
      console.error('[EventsService] API fetch failed:', error);
      // Try to return stale cache if available
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('[EventsService] Using stale cache due to API failure');
        return staleCache.events;
      }
      return [];
    }
  }

  /**
   * Fetch events from Ticketmaster Discovery API
   */
  private async fetchEventsFromApi(lat: number, lng: number, radiusKm: number): Promise<EventData[]> {
    const radiusMiles = Math.round(radiusKm * 0.621371); // Convert km to miles
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format dates for API
    const startDateTime = today.toISOString().split('.')[0] + 'Z';
    const endDateTime = tomorrow.toISOString().split('.')[0] + 'Z';

    const params = new URLSearchParams({
      apikey: this.apiKey,
      latlong: `${lat},${lng}`,
      radius: String(radiusMiles),
      unit: 'miles',
      startDateTime,
      endDateTime,
      size: '50', // Get up to 50 events
      sort: 'date,asc',
    });

    const url = `${this.baseUrl}?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[EventsService] API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      return this.parseEventsResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        console.error('[EventsService] API request timed out');
      }
      throw error;
    }
  }

  /**
   * Parse Ticketmaster API response into EventData
   */
  private parseEventsResponse(data: TicketmasterResponse): EventData[] {
    if (!data._embedded?.events) {
      return [];
    }

    return data._embedded.events
      .map((event): EventData | null => {
        const venue = event._embedded?.venues?.[0];
        if (!venue?.location?.latitude || !venue?.location?.longitude) {
          return null; // Skip events without venue coordinates
        }

        // Determine event type
        let type: EventData['type'] = 'other';
        const segment = event.classifications?.[0]?.segment?.name?.toLowerCase();
        if (segment === 'sports') type = 'sports';
        else if (segment === 'music') type = 'concert';
        else if (segment === 'arts & theatre') type = 'theater';

        // Parse dates
        const startTime = event.dates?.start?.dateTime
          ? new Date(event.dates.start.dateTime)
          : new Date();

        // Estimate end time (2-3 hours after start)
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + (type === 'sports' ? 3 : 2));

        return {
          id: event.id,
          name: event.name,
          venue: {
            name: venue.name,
            lat: parseFloat(venue.location.latitude),
            lng: parseFloat(venue.location.longitude),
            capacity: venue.generalInfo?.capacity
              ? parseInt(venue.generalInfo.capacity, 10)
              : undefined,
          },
          startTime,
          endTime,
          type,
        };
      })
      .filter((event): event is EventData => event !== null);
  }

  /**
   * Calculate event score based on nearby events and time
   */
  calculateEventScore(
    events: EventData[],
    userLat: number,
    userLng: number,
    timestamp: Date
  ): { score: number; nearbyEvents: Array<{ name: string; venue: string; startsIn: string }> } {
    const now = timestamp.getTime();
    const activeEvents: Array<{ event: EventData; boost: number; distance: number }> = [];

    for (const event of events) {
      const distance = this.calculateDistance(userLat, userLng, event.venue.lat, event.venue.lng);

      // Skip if too far
      if (distance > PROXIMITY_CONFIG.maxDistanceKm) {
        continue;
      }

      // Check if event is in active window
      const eventStart = event.startTime.getTime();
      const eventEnd = event.endTime?.getTime() || eventStart + 2 * 60 * 60 * 1000; // Default 2 hours

      const windowStart = eventStart - TIME_WINDOW.hoursBeforeEvent * 60 * 60 * 1000;
      const windowEnd = eventEnd + TIME_WINDOW.hoursAfterEvent * 60 * 60 * 1000;

      if (now < windowStart || now > windowEnd) {
        continue;
      }

      // Calculate base boost from venue capacity
      let baseBoost: number = VENUE_CAPACITY_BOOSTS.small.boost;
      const capacity = event.venue.capacity || 5000; // Default to medium venue

      if (capacity >= VENUE_CAPACITY_BOOSTS.stadium.minCapacity) {
        baseBoost = VENUE_CAPACITY_BOOSTS.stadium.boost;
      } else if (capacity >= VENUE_CAPACITY_BOOSTS.arena.minCapacity) {
        baseBoost = VENUE_CAPACITY_BOOSTS.arena.boost;
      } else if (capacity >= VENUE_CAPACITY_BOOSTS.large.minCapacity) {
        baseBoost = VENUE_CAPACITY_BOOSTS.large.boost;
      } else if (capacity >= VENUE_CAPACITY_BOOSTS.medium.minCapacity) {
        baseBoost = VENUE_CAPACITY_BOOSTS.medium.boost;
      }

      // Apply event type multiplier
      const typeMultiplier = EVENT_TYPE_BOOSTS[event.type];
      let boost = baseBoost * typeMultiplier;

      // Apply distance decay
      if (distance > PROXIMITY_CONFIG.peakDistanceKm) {
        const decayFactor = 1 - ((distance - PROXIMITY_CONFIG.peakDistanceKm) /
          (PROXIMITY_CONFIG.maxDistanceKm - PROXIMITY_CONFIG.peakDistanceKm));
        boost *= Math.max(0.3, decayFactor); // Minimum 30% of boost
      }

      // Apply time-based decay (boost peaks at event start)
      const timeFactor = this.getTimeBoostFactor(now, eventStart, eventEnd, windowStart, windowEnd);
      boost *= timeFactor;

      activeEvents.push({ event, boost, distance });
    }

    if (activeEvents.length === 0) {
      return { score: 20, nearbyEvents: [] };
    }

    // Take the highest boost from active events
    activeEvents.sort((a, b) => b.boost - a.boost);
    const topBoost = Math.min(100, Math.round(activeEvents[0].boost));

    // Format nearby events for response
    const nearbyEvents = activeEvents.slice(0, 3).map(({ event }) => {
      const startsIn = this.formatTimeUntil(event.startTime, timestamp);
      return {
        name: event.name,
        venue: event.venue.name,
        startsIn,
      };
    });

    return { score: topBoost, nearbyEvents };
  }

  /**
   * Get time-based boost factor (ramps up before event, peaks during, decays after)
   */
  private getTimeBoostFactor(
    now: number,
    eventStart: number,
    eventEnd: number,
    windowStart: number,
    windowEnd: number
  ): number {
    // During the event: full boost
    if (now >= eventStart && now <= eventEnd) {
      return 1.0;
    }

    // Before the event: ramp up
    if (now < eventStart) {
      const totalRampTime = eventStart - windowStart;
      const elapsed = now - windowStart;
      return 0.5 + (0.5 * elapsed / totalRampTime); // 50% to 100%
    }

    // After the event: decay
    const totalDecayTime = windowEnd - eventEnd;
    const elapsed = now - eventEnd;
    return Math.max(0.3, 1 - (0.7 * elapsed / totalDecayTime)); // 100% to 30%
  }

  /**
   * Format time until event for display
   */
  private formatTimeUntil(eventTime: Date, now: Date): string {
    const diffMs = eventTime.getTime() - now.getTime();

    if (diffMs < 0) {
      const pastHours = Math.abs(Math.round(diffMs / (60 * 60 * 1000)));
      if (pastHours === 0) return 'now';
      return `${pastHours}h ago`;
    }

    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

    if (hours === 0) {
      return `in ${minutes}m`;
    }
    return `in ${hours}h ${minutes}m`;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Generate cache key from lat/lng rounded to ~5km grid
   */
  private getCacheKey(lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 20) / 20; // 0.05 degree ≈ 5km
    const roundedLng = Math.round(lng * 20) / 20;
    return `events:${roundedLat}:${roundedLng}`;
  }

  /**
   * Get data from cache if not expired
   */
  private getFromCache(key: string): EventData[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.cachedAt > CACHE_TTL_MS;
    if (isExpired) {
      return null; // Don't delete - keep for stale fallback
    }

    return cached.events;
  }

  /**
   * Store data in cache
   */
  private setCache(key: string, events: EventData[], lat: number, lng: number): void {
    this.cache.set(key, {
      events,
      cachedAt: Date.now(),
      lat,
      lng,
    });

    // Cleanup old entries (keep cache size manageable)
    if (this.cache.size > 50) {
      this.cleanupCache();
    }
  }

  /**
   * Remove expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = CACHE_TTL_MS * 2; // Keep stale entries for 48 hours max

    for (const [key, value] of this.cache.entries()) {
      if (now - value.cachedAt > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached event data (for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Ticketmaster API response types (minimal for parsing)
interface TicketmasterResponse {
  _embedded?: {
    events?: Array<{
      id: string;
      name: string;
      dates?: {
        start?: {
          dateTime?: string;
        };
      };
      classifications?: Array<{
        segment?: {
          name?: string;
        };
      }>;
      _embedded?: {
        venues?: Array<{
          name: string;
          location?: {
            latitude: string;
            longitude: string;
          };
          generalInfo?: {
            capacity?: string;
          };
        }>;
      };
    }>;
  };
}

export const eventsService = new EventsService();
