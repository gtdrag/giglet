import api from './api';
import { getCalendars } from 'expo-localization';

export interface ZoneScoreFactors {
  mealTimeBoost: number;
  peakHourBoost: number;
  weekendBoost: number;
  weatherBoost: number;
  eventBoost: number;
  baseScore: number;
}

export interface NearbyEvent {
  name: string;
  venue: string;
  startsIn: string;
}

export interface ZoneScoreResponse {
  score: number;
  label: string;
  factors: ZoneScoreFactors;
  weatherDescription?: string;
  nearbyEvents?: NearbyEvent[];
  calculatedAt: string;
  timezone: string;
  nextRefresh: string;
}

/**
 * Get zone score for a location
 * Includes weather and event boosts when lat/lng provided
 */
export async function getZoneScore(lat: number, lng: number): Promise<ZoneScoreResponse> {
  const calendars = getCalendars();
  const timezone = calendars[0]?.timeZone || 'UTC';

  const response = await api.get<{ success: boolean; data: ZoneScoreResponse }>(
    '/zones/score',
    {
      params: { lat, lng, timezone },
    }
  );

  return response.data.data;
}

/**
 * Get zone score label color
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#22C55E'; // Green - Hot
  if (score >= 60) return '#EAB308'; // Yellow - Busy
  if (score >= 40) return '#F97316'; // Orange - Moderate
  if (score >= 20) return '#EF4444'; // Red - Slow
  return '#6B7280'; // Gray - Dead
}

/**
 * Get opacity for zone overlay based on score
 */
export function getScoreOpacity(score: number): number {
  // Higher scores = more visible
  return 0.2 + (score / 100) * 0.4; // Range: 0.2 - 0.6
}
