import { prisma } from '../lib/prisma';
import { toZonedTime } from 'date-fns-tz';
import { weatherService } from './weather.service';

interface ZoneWithScore {
  id: string;
  h3Index: string;
  name: string | null;
  score: number;
  scoreLabel: string;
  lastCalculatedAt: Date | null;
}

interface ZoneScoreFactors {
  mealTimeBoost: number;
  peakHourBoost: number;
  weekendBoost: number;
  weatherBoost: number;
  baseScore: number;
}

// Meal window definitions per architecture spec
const MEAL_WINDOWS = {
  breakfast: { start: 7, end: 10, score: 40 },
  lunch: { start: 11, end: 14, score: 80 },
  dinner: { start: 17, end: 21, score: 100 },
  lateNight: { start: 21, end: 24, score: 50 },
  offPeak: { score: 20 },
} as const;

// Weekend multipliers for meal boosts
const WEEKEND_MULTIPLIER = {
  dinner: 1.2, // Weekend dinner is 20% higher
  breakfast: 1.1, // Weekend breakfast/brunch 10% higher
} as const;

// Transition duration in hours (30 minutes = 0.5 hours)
const TRANSITION_DURATION = 0.5;

class ZonesService {
  /**
   * Calculate zone score based on time factors
   * @param timestamp - The time to calculate score for (defaults to now)
   * @param timezone - IANA timezone string (defaults to UTC)
   * @param weatherBoost - Weather score (0-100), defaults to 20 (neutral)
   */
  calculateScore(
    timestamp: Date = new Date(),
    timezone: string = 'UTC',
    weatherBoost: number = 20
  ): { score: number; factors: ZoneScoreFactors } {
    // Convert to user's timezone
    const localTime = this.getLocalTime(timestamp, timezone);
    const hour = localTime.getHours() + localTime.getMinutes() / 60; // Fractional hour for smooth transitions
    const dayOfWeek = localTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    // Factor weights (Story 5.4: Added weather factor)
    const WEIGHTS = {
      mealTime: 0.25,
      peakHour: 0.25,
      weekend: 0.15,
      weather: 0.15,
      base: 0.20,
    };

    // Calculate individual factors (0-100 scale)
    const factors: ZoneScoreFactors = {
      mealTimeBoost: this.getMealTimeScore(hour, isWeekend),
      peakHourBoost: this.getPeakHourScore(hour),
      weekendBoost: this.getWeekendScore(dayOfWeek),
      weatherBoost: weatherBoost,
      baseScore: 50, // Default activity level
    };

    // Weighted sum
    const score =
      factors.mealTimeBoost * WEIGHTS.mealTime +
      factors.peakHourBoost * WEIGHTS.peakHour +
      factors.weekendBoost * WEIGHTS.weekend +
      factors.weatherBoost * WEIGHTS.weather +
      factors.baseScore * WEIGHTS.base;

    return {
      score: Math.round(Math.max(0, Math.min(100, score))),
      factors,
    };
  }

  /**
   * Calculate zone score including weather data
   * Async version that fetches weather from API
   * @param lat - Latitude for weather lookup
   * @param lng - Longitude for weather lookup
   * @param timestamp - The time to calculate score for (defaults to now)
   * @param timezone - IANA timezone string (defaults to UTC)
   */
  async calculateScoreWithWeather(
    lat: number,
    lng: number,
    timestamp: Date = new Date(),
    timezone: string = 'UTC'
  ): Promise<{ score: number; factors: ZoneScoreFactors; weatherDescription: string }> {
    // Fetch weather score (returns 20 on failure - neutral)
    const { score: weatherBoost, description: weatherDescription } =
      await weatherService.getWeatherScore(lat, lng);

    const result = this.calculateScore(timestamp, timezone, weatherBoost);

    return {
      ...result,
      weatherDescription,
    };
  }

  /**
   * Convert UTC timestamp to local time in specified timezone
   */
  private getLocalTime(timestamp: Date, timezone: string): Date {
    try {
      return toZonedTime(timestamp, timezone);
    } catch {
      // Invalid timezone - fall back to UTC
      return timestamp;
    }
  }

  /**
   * Calculate meal time score with smooth transitions and weekend boost
   * @param hour - Fractional hour (e.g., 11.5 = 11:30 AM)
   * @param isWeekend - Whether it's Saturday or Sunday
   */
  private getMealTimeScore(hour: number, isWeekend: boolean = false): number {
    // Check each meal window with smooth transitions
    const { breakfast, lunch, dinner, lateNight, offPeak } = MEAL_WINDOWS;

    // Breakfast: 7-10 AM
    if (hour >= breakfast.start && hour < breakfast.end) {
      const baseScore = this.getWindowScore(hour, breakfast.start, breakfast.end, offPeak.score, breakfast.score);
      return isWeekend ? Math.min(100, baseScore * WEEKEND_MULTIPLIER.breakfast) : baseScore;
    }

    // Transition: breakfast → off-peak (10:00 - 10:30)
    if (hour >= breakfast.end && hour < breakfast.end + TRANSITION_DURATION) {
      return this.interpolate(hour, breakfast.end, breakfast.end + TRANSITION_DURATION, breakfast.score, offPeak.score);
    }

    // Transition: off-peak → lunch (10:30 - 11:00)
    if (hour >= lunch.start - TRANSITION_DURATION && hour < lunch.start) {
      return this.interpolate(hour, lunch.start - TRANSITION_DURATION, lunch.start, offPeak.score, lunch.score);
    }

    // Lunch: 11 AM - 2 PM
    if (hour >= lunch.start && hour < lunch.end) {
      return this.getWindowScore(hour, lunch.start, lunch.end, offPeak.score, lunch.score);
    }

    // Transition: lunch → off-peak (2:00 - 2:30)
    if (hour >= lunch.end && hour < lunch.end + TRANSITION_DURATION) {
      return this.interpolate(hour, lunch.end, lunch.end + TRANSITION_DURATION, lunch.score, offPeak.score);
    }

    // Transition: off-peak → dinner (4:30 - 5:00)
    if (hour >= dinner.start - TRANSITION_DURATION && hour < dinner.start) {
      return this.interpolate(hour, dinner.start - TRANSITION_DURATION, dinner.start, offPeak.score, dinner.score);
    }

    // Dinner: 5-9 PM (peak)
    if (hour >= dinner.start && hour < dinner.end) {
      const baseScore = this.getWindowScore(hour, dinner.start, dinner.end, offPeak.score, dinner.score);
      return isWeekend ? Math.min(100, baseScore * WEEKEND_MULTIPLIER.dinner) : baseScore;
    }

    // Transition: dinner → late night (9:00 - 9:30) - no transition needed, both are active
    // Late night: 9 PM - 12 AM
    if (hour >= lateNight.start && hour < lateNight.end) {
      return lateNight.score;
    }

    // Off-peak hours
    return offPeak.score;
  }

  /**
   * Get score within a meal window with smooth entry/exit transitions
   */
  private getWindowScore(hour: number, start: number, end: number, fromScore: number, toScore: number): number {
    // Smooth entry transition (first 30 min of window)
    if (hour < start + TRANSITION_DURATION) {
      return this.interpolate(hour, start, start + TRANSITION_DURATION, fromScore, toScore);
    }
    // Smooth exit transition (last 30 min of window)
    if (hour >= end - TRANSITION_DURATION) {
      return this.interpolate(hour, end - TRANSITION_DURATION, end, toScore, fromScore);
    }
    // Full score in the middle of the window
    return toScore;
  }

  /**
   * Linear interpolation between two values
   */
  private interpolate(value: number, start: number, end: number, fromScore: number, toScore: number): number {
    const progress = (value - start) / (end - start);
    const clampedProgress = Math.max(0, Math.min(1, progress));
    return Math.round(fromScore + (toScore - fromScore) * clampedProgress);
  }

  private getPeakHourScore(hour: number): number {
    // Peak delivery hours (using integer hour for simplicity here)
    const intHour = Math.floor(hour);
    if (intHour >= 11 && intHour < 14) return 90; // Lunch rush
    if (intHour >= 17 && intHour < 21) return 100; // Dinner rush
    if (intHour >= 7 && intHour < 10) return 70; // Breakfast
    if (intHour >= 21 && intHour < 23) return 50; // Late night
    // Dead hours
    if (intHour >= 23 || intHour < 6) return 10;
    return 40; // Other hours
  }

  private getWeekendScore(dayOfWeek: number): number {
    // Friday evening, Saturday, Sunday = higher scores
    if (dayOfWeek === 0) return 80; // Sunday
    if (dayOfWeek === 5) return 70; // Friday
    if (dayOfWeek === 6) return 90; // Saturday
    return 50; // Weekdays
  }

  getScoreLabel(score: number): string {
    if (score >= 80) return 'Hot';
    if (score >= 60) return 'Busy';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Slow';
    return 'Dead';
  }

  /**
   * Get zones near a location with current scores (including weather)
   */
  async getZonesNearLocation(
    lat: number,
    lng: number,
    _radiusKm: number = 5, // TODO: Use for spatial query when H3 is implemented
    timezone: string = 'UTC'
  ): Promise<ZoneWithScore[]> {
    // Calculate score with weather data
    const { score } = await this.calculateScoreWithWeather(lat, lng, new Date(), timezone);

    // Generate some sample zones around the location
    // In production, use H3 library to generate actual hexagons
    const zones = await this.getOrCreateZonesForArea(lat, lng);

    return zones.map((zone) => ({
      id: zone.id,
      h3Index: zone.h3Index,
      name: zone.name,
      score: zone.currentScore || score,
      scoreLabel: this.getScoreLabel(zone.currentScore || score),
      lastCalculatedAt: zone.lastCalculatedAt,
    }));
  }

  /**
   * Get or create zones for an area
   * MVP: Returns existing zones or creates sample ones
   */
  private async getOrCreateZonesForArea(
    lat: number,
    lng: number
  ): Promise<
    Array<{
      id: string;
      h3Index: string;
      name: string | null;
      currentScore: number;
      lastCalculatedAt: Date | null;
    }>
  > {
    // Try to find existing zones in the database
    const existingZones = await prisma.zone.findMany({
      take: 20,
      orderBy: { currentScore: 'desc' },
    });

    if (existingZones.length > 0) {
      return existingZones;
    }

    // No zones exist - create sample zones for the area
    // In production, use H3 to generate proper hexagons
    const { score } = this.calculateScore();
    const sampleZones = this.generateSampleZones(lat, lng, score);

    // Bulk create zones
    await prisma.zone.createMany({
      data: sampleZones,
      skipDuplicates: true,
    });

    return prisma.zone.findMany({
      take: 20,
      orderBy: { currentScore: 'desc' },
    });
  }

  /**
   * Generate sample zones around a location
   * MVP placeholder - in production use H3 library
   */
  private generateSampleZones(
    centerLat: number,
    centerLng: number,
    baseScore: number
  ): Array<{
    h3Index: string;
    name: string;
    currentScore: number;
    lastCalculatedAt: Date;
  }> {
    // Generate a grid of zones around the center
    const zones = [];
    const gridSize = 3;
    const stepDegrees = 0.01; // ~1km

    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        const lat = centerLat + i * stepDegrees;
        const lng = centerLng + j * stepDegrees;
        // Create a pseudo H3 index (in production, use h3-js library)
        const h3Index = `mock_${lat.toFixed(4)}_${lng.toFixed(4)}`;

        // Vary scores slightly for visual interest
        const scoreVariation = Math.floor(Math.random() * 20) - 10;
        const zoneScore = Math.max(0, Math.min(100, baseScore + scoreVariation));

        zones.push({
          h3Index,
          name: `Zone ${i + gridSize + 1}-${j + gridSize + 1}`,
          currentScore: zoneScore,
          lastCalculatedAt: new Date(),
        });
      }
    }

    return zones;
  }

  /**
   * Refresh all zone scores
   * Called by scheduled job every 15 minutes
   */
  async refreshAllScores(): Promise<number> {
    const { score } = this.calculateScore();
    const now = new Date();

    // Update all zones with new base score + variation using batch update
    const zones = await prisma.zone.findMany({ select: { id: true } });

    // Use Promise.all for parallel updates
    const updatePromises = zones.map((zone) => {
      const scoreVariation = Math.floor(Math.random() * 20) - 10;
      const newScore = Math.max(0, Math.min(100, score + scoreVariation));

      return prisma.zone.update({
        where: { id: zone.id },
        data: {
          currentScore: newScore,
          lastCalculatedAt: now,
        },
      });
    });

    await Promise.all(updatePromises);
    return zones.length;
  }
}

export const zonesService = new ZonesService();
