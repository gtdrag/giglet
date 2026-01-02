/**
 * Weather Service
 * Fetches weather data from OpenWeather API and calculates weather-based score boosts
 * Story 5.4: Weather Impact Integration
 */

interface WeatherData {
  conditionCode: number;
  temperature: number; // Fahrenheit
  description: string;
  cityName: string;
}

interface CachedWeather {
  data: WeatherData;
  cachedAt: number;
}

// Weather condition boost multipliers
const WEATHER_BOOSTS = {
  thunderstorm: { min: 200, max: 232, score: 60 },
  drizzle: { min: 300, max: 321, score: 35 },
  rain: { min: 500, max: 531, score: 50 },
  snow: { min: 600, max: 622, score: 70 },
  atmosphere: { min: 700, max: 781, score: 25 }, // fog, mist, etc.
  clear: { min: 800, max: 800, score: 20 },
  clouds: { min: 801, max: 804, score: 20 },
} as const;

// Temperature thresholds (Fahrenheit)
const TEMP_THRESHOLDS = {
  extremeCold: 32, // Below this = cold boost
  extremeHeat: 95, // Above this = heat boost
  tempBoost: 20, // Additional score for extreme temps
} as const;

// Cache configuration
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const API_TIMEOUT_MS = 5000; // 5 seconds

class WeatherService {
  private cache: Map<string, CachedWeather> = new Map();
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5/weather';

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
  }

  /**
   * Get weather score for a location (0-100 scale)
   * Returns base score of 20 if API fails or is unavailable
   */
  async getWeatherScore(lat: number, lng: number): Promise<{ score: number; description: string }> {
    try {
      const weather = await this.getCurrentWeather(lat, lng);
      if (!weather) {
        return { score: 20, description: 'Weather unavailable' };
      }

      const score = this.calculateWeatherScore(weather);
      return { score, description: weather.description };
    } catch (error) {
      console.error('[WeatherService] Error getting weather score:', error);
      return { score: 20, description: 'Weather unavailable' };
    }
  }

  /**
   * Fetch current weather from OpenWeather API with caching
   */
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData | null> {
    if (!this.apiKey) {
      console.warn('[WeatherService] OPENWEATHER_API_KEY not configured');
      return null;
    }

    const cacheKey = this.getCacheKey(lat, lng);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const weather = await this.fetchWeatherFromApi(lat, lng);
      if (weather) {
        this.setCache(cacheKey, weather);
      }
      return weather;
    } catch (error) {
      console.error('[WeatherService] API fetch failed:', error);
      // Try to return stale cache if available
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('[WeatherService] Using stale cache due to API failure');
        return staleCache.data;
      }
      return null;
    }
  }

  /**
   * Fetch weather data from OpenWeather API
   */
  private async fetchWeatherFromApi(lat: number, lng: number): Promise<WeatherData | null> {
    const url = `${this.baseUrl}?lat=${lat}&lon=${lng}&appid=${this.apiKey}&units=imperial`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[WeatherService] API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      return {
        conditionCode: data.weather?.[0]?.id || 800,
        temperature: data.main?.temp || 70,
        description: data.weather?.[0]?.description || 'unknown',
        cityName: data.name || 'Unknown',
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        console.error('[WeatherService] API request timed out');
      }
      throw error;
    }
  }

  /**
   * Calculate weather score based on conditions and temperature
   * Returns 0-100 scale where higher = worse weather = higher delivery demand
   */
  calculateWeatherScore(weather: WeatherData): number {
    let score = 20; // Base score for clear/mild weather

    // Check precipitation conditions (mutually exclusive - use highest match)
    const code = weather.conditionCode;

    if (code >= WEATHER_BOOSTS.snow.min && code <= WEATHER_BOOSTS.snow.max) {
      score = WEATHER_BOOSTS.snow.score; // Snow: highest boost
    } else if (code >= WEATHER_BOOSTS.thunderstorm.min && code <= WEATHER_BOOSTS.thunderstorm.max) {
      score = WEATHER_BOOSTS.thunderstorm.score; // Thunderstorm
    } else if (code >= WEATHER_BOOSTS.rain.min && code <= WEATHER_BOOSTS.rain.max) {
      score = WEATHER_BOOSTS.rain.score; // Rain
    } else if (code >= WEATHER_BOOSTS.drizzle.min && code <= WEATHER_BOOSTS.drizzle.max) {
      score = WEATHER_BOOSTS.drizzle.score; // Drizzle
    } else if (code >= WEATHER_BOOSTS.atmosphere.min && code <= WEATHER_BOOSTS.atmosphere.max) {
      score = WEATHER_BOOSTS.atmosphere.score; // Fog, mist, etc.
    }
    // Clear/clouds use base score of 20

    // Temperature extremes (additive boost)
    if (weather.temperature < TEMP_THRESHOLDS.extremeCold) {
      score = Math.min(100, score + TEMP_THRESHOLDS.tempBoost);
    } else if (weather.temperature > TEMP_THRESHOLDS.extremeHeat) {
      score = Math.min(100, score + TEMP_THRESHOLDS.tempBoost);
    }

    return score;
  }

  /**
   * Generate cache key from lat/lng rounded to ~10km grid
   */
  private getCacheKey(lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 10) / 10; // 0.1 degree ≈ 11km
    const roundedLng = Math.round(lng * 10) / 10;
    return `weather:${roundedLat}:${roundedLng}`;
  }

  /**
   * Get data from cache if not expired
   */
  private getFromCache(key: string): WeatherData | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.cachedAt > CACHE_TTL_MS;
    if (isExpired) {
      return null; // Don't delete - keep for stale fallback
    }

    return cached.data;
  }

  /**
   * Store data in cache
   */
  private setCache(key: string, data: WeatherData): void {
    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
    });

    // Cleanup old entries (keep cache size manageable)
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Remove expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = CACHE_TTL_MS * 4; // Keep stale entries for 1 hour max

    for (const [key, value] of this.cache.entries()) {
      if (now - value.cachedAt > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached weather data (for testing)
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

export const weatherService = new WeatherService();
