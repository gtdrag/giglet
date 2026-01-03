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

export interface NearbyZone {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  label: string;
  factors: ZoneScoreFactors;
  weatherDescription?: string;
  nearbyEvents?: NearbyEvent[];
}

export interface NearbyZonesResponse {
  zones: NearbyZone[];
  meta: {
    center: { lat: number; lng: number };
    totalZones: number;
    calculatedAt: string;
    timezone: string;
  };
}

/**
 * Get nearby zones with scores
 * Main endpoint for displaying zones on the map
 * Uses longer timeout since geocoding can take ~1 sec per zone
 */
export async function getNearbyZones(lat: number, lng: number): Promise<NearbyZone[]> {
  const calendars = getCalendars();
  const timezone = calendars[0]?.timeZone || 'UTC';

  const response = await api.get<{ success: boolean; data: NearbyZonesResponse }>(
    '/zones/nearby',
    {
      params: { lat, lng, timezone },
      timeout: 60000, // 60 seconds - geocoding takes ~1 sec per zone
    }
  );

  return response.data.data.zones;
}

interface StreamMessage {
  type: 'meta' | 'zone' | 'complete';
  data?: NearbyZone;
  totalCandidates?: number;
  totalZones?: number;
  center?: { lat: number; lng: number };
}

/**
 * Stream nearby zones one-by-one
 * Zones appear progressively as they're calculated
 * @param onZone - Called for each zone as it arrives
 * @param onProgress - Called with progress updates (processed/total)
 * @param onComplete - Called when streaming is complete
 */
export async function streamNearbyZones(
  lat: number,
  lng: number,
  onZone: (zone: NearbyZone) => void,
  onProgress: (processed: number, total: number) => void,
  onComplete: (totalZones: number) => void
): Promise<void> {
  const calendars = getCalendars();
  const timezone = calendars[0]?.timeZone || 'UTC';

  const baseUrl = api.defaults.baseURL || '';
  const token = api.defaults.headers.common['Authorization'];

  const url = `${baseUrl}/zones/stream?lat=${lat}&lng=${lng}&timezone=${encodeURIComponent(timezone)}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': token as string,
      'Accept': 'application/x-ndjson',
    },
  });

  if (!response.ok) {
    throw new Error(`Stream request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let processed = 0;
  let total = 25;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message: StreamMessage = JSON.parse(line);

        if (message.type === 'meta' && message.totalCandidates) {
          total = message.totalCandidates;
        } else if (message.type === 'zone' && message.data) {
          processed++;
          onZone(message.data);
          onProgress(processed, total);
        } else if (message.type === 'complete') {
          onComplete(message.totalZones || 0);
        }
      } catch {
        console.warn('Failed to parse stream message:', line);
      }
    }
  }
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
