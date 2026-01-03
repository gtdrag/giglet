/**
 * GEOCODING SERVICE - NOT CURRENTLY IN USE
 *
 * TODO: Revisit water filtering for Focus Zones
 *
 * This service was built to filter out zones that fall over water (SF Bay, oceans, etc.)
 * using reverse geocoding. However, it's NOT currently integrated due to limitations:
 *
 * ISSUES WITH NOMINATIM (OpenStreetMap):
 * 1. Rate limited to 1 request/second - checking 25 zones takes ~25 seconds
 * 2. Returns nearest addressable feature (piers, bridges, islands) rather than
 *    definitively identifying water vs land
 * 3. Blocking on geocoding made the zones API unacceptably slow
 *
 * FUTURE SOLUTIONS TO EVALUATE:
 * - Google Maps Geocoding API (paid, but faster and more accurate)
 * - Mapbox Geocoding API (paid tier has higher rate limits)
 * - Pre-computed land/water polygon data (e.g., Natural Earth shapefiles)
 * - Client-side filtering using map tile data
 *
 * When revisiting, the zones.service.ts needs to call filterLandCoordinates()
 * before returning zones to the client.
 */

import { getRedisConnection } from '../lib/redis';
import { logger } from '../utils/logger';

const CACHE_PREFIX = 'geocode:';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days - land/water doesn't change

interface NominatimResult {
  place_id: number;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    county?: string;
    state?: string;
    country?: string;
  };
  type?: string;
  class?: string;
}

class GeocodingService {
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1100; // Nominatim requires 1 req/sec

  /**
   * Check if a coordinate is on land (not water)
   * Uses OpenStreetMap Nominatim API with Redis caching
   */
  async isLandCoordinate(lat: number, lng: number): Promise<boolean> {
    // Round to 4 decimal places (~11m precision) for cache key
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    const cacheKey = `${CACHE_PREFIX}${roundedLat},${roundedLng}`;

    // Check cache first
    const redis = getRedisConnection();
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached === '1';
    }

    // Rate limit requests to Nominatim (1 per second)
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await this.delay(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();

    try {
      const result = await this.reverseGeocode(roundedLat, roundedLng);
      const isLand = this.checkIsLand(result);

      // Cache the result
      await redis.setex(cacheKey, CACHE_TTL_SECONDS, isLand ? '1' : '0');

      logger.debug('Geocoding result', {
        lat: roundedLat,
        lng: roundedLng,
        isLand,
        displayName: result?.display_name,
      });

      return isLand;
    } catch (error) {
      logger.error('Geocoding error', { lat: roundedLat, lng: roundedLng, error });
      // Default to true (show zone) on error - better than hiding valid zones
      return true;
    }
  }

  /**
   * Batch check multiple coordinates
   * Checks cache first, then geocodes uncached coordinates sequentially
   * BLOCKS until all geocoding is complete - may take ~1 sec per uncached coordinate
   */
  async filterLandCoordinates(
    coordinates: Array<{ lat: number; lng: number; [key: string]: unknown }>
  ): Promise<Array<{ lat: number; lng: number; [key: string]: unknown }>> {
    const redis = getRedisConnection();
    const results: Array<{ lat: number; lng: number; [key: string]: unknown }> = [];
    const uncachedCoords: Array<{ coord: typeof coordinates[0]; roundedLat: number; roundedLng: number }> = [];

    // First pass: check cache for all coordinates
    for (const coord of coordinates) {
      const roundedLat = Math.round(coord.lat * 10000) / 10000;
      const roundedLng = Math.round(coord.lng * 10000) / 10000;
      const cacheKey = `${CACHE_PREFIX}${roundedLat},${roundedLng}`;

      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        // We have a cached result
        if (cached === '1') {
          results.push(coord);
        }
        // cached === '0' means water, so we skip it
      } else {
        uncachedCoords.push({ coord, roundedLat, roundedLng });
      }
    }

    // Process uncached coordinates sequentially with rate limiting
    // This BLOCKS until all are geocoded - may take ~1 sec per coordinate
    if (uncachedCoords.length > 0) {
      logger.info('Geocoding uncached coordinates', { count: uncachedCoords.length });

      for (const { coord, roundedLat, roundedLng } of uncachedCoords) {
        // Rate limit
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          await this.delay(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
        }
        this.lastRequestTime = Date.now();

        try {
          const result = await this.reverseGeocode(roundedLat, roundedLng);
          const isLand = this.checkIsLand(result);
          const cacheKey = `${CACHE_PREFIX}${roundedLat},${roundedLng}`;
          await redis.setex(cacheKey, CACHE_TTL_SECONDS, isLand ? '1' : '0');

          if (isLand) {
            results.push(coord);
          }

          logger.debug('Geocoding result', {
            lat: roundedLat,
            lng: roundedLng,
            isLand,
          });
        } catch (error) {
          // On error, default to land (better to show than hide)
          results.push(coord);
          logger.warn('Geocoding error, defaulting to land', { lat: roundedLat, lng: roundedLng });
        }
      }
    }

    return results;
  }

  /**
   * Geocode coordinates in background to populate cache
   * Runs sequentially with rate limiting
   */
  private async geocodeInBackground(
    coords: Array<{ coord: { lat: number; lng: number }; roundedLat: number; roundedLng: number }>
  ): Promise<void> {
    const redis = getRedisConnection();

    for (const { roundedLat, roundedLng } of coords) {
      // Rate limit
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await this.delay(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }
      this.lastRequestTime = Date.now();

      try {
        const result = await this.reverseGeocode(roundedLat, roundedLng);
        const isLand = this.checkIsLand(result);
        const cacheKey = `${CACHE_PREFIX}${roundedLat},${roundedLng}`;
        await redis.setex(cacheKey, CACHE_TTL_SECONDS, isLand ? '1' : '0');

        logger.debug('Background geocoding result', {
          lat: roundedLat,
          lng: roundedLng,
          isLand,
        });
      } catch (error) {
        // Don't cache errors - we'll try again next time
        logger.warn('Background geocoding error', { lat: roundedLat, lng: roundedLng });
      }
    }
  }

  /**
   * Call Nominatim reverse geocoding API
   */
  private async reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Giglet/1.0 (food delivery zone mapping)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        logger.warn('Nominatim rate limit hit');
      }
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    // Nominatim returns { error: "..." } for coordinates with no data (like water)
    if (data.error) {
      return null;
    }

    return data as NominatimResult;
  }

  /**
   * Determine if a geocoding result represents land
   */
  private checkIsLand(result: NominatimResult | null): boolean {
    // No result = likely water
    if (!result) {
      return false;
    }

    // Check the type/class for water features
    const waterTypes = ['water', 'bay', 'ocean', 'sea', 'strait', 'coastline'];
    const waterClasses = ['natural', 'waterway'];

    if (result.type && waterTypes.includes(result.type.toLowerCase())) {
      return false;
    }

    if (
      result.class &&
      waterClasses.includes(result.class.toLowerCase()) &&
      result.type !== 'beach'
    ) {
      return false;
    }

    // Check display name for water indicators
    const displayNameLower = (result.display_name || '').toLowerCase();
    if (
      displayNameLower.includes('pacific ocean') ||
      displayNameLower.includes('atlantic ocean') ||
      displayNameLower.includes('gulf of mexico') ||
      (displayNameLower.includes(' bay,') && !displayNameLower.includes('blvd'))
    ) {
      return false;
    }

    // If it's just an administrative boundary with no specific address,
    // it's probably water or empty area (Nominatim returns city/county boundaries for water)
    if (result.class === 'boundary' && result.type === 'administrative') {
      // Only trust it as land if there's a specific address component
      if (result.address) {
        const { road, house_number, postcode, suburb, neighbourhood } = result.address;
        if (road || house_number || postcode || suburb || neighbourhood) {
          return true;
        }
      }
      // Administrative boundary only = likely water/empty
      return false;
    }

    // Has address components = definitely land
    if (result.address) {
      const { road, house_number, postcode, suburb, neighbourhood } = result.address;
      if (road || house_number || postcode || suburb || neighbourhood) {
        return true;
      }
    }

    // Default to land if we have any result
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const geocodingService = new GeocodingService();
