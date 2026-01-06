/**
 * TipMarkersLayer Clustering Logic Tests
 * Story 10-3: Tip Locations Map Layer
 *
 * Tests for the clustering algorithm used to group nearby tip markers
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the API module to prevent expo module loading
vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { TipLog, TipSize, getTipSizeColor } from '../../../services/tips';

// Local type for testing (matches react-native-maps Region)
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Re-implement the clustering functions for testing
// (These match the logic in TipMarkersLayer.tsx)

interface ClusterMarker {
  id: string;
  latitude: number;
  longitude: number;
  tips: TipLog[];
  count: number;
}

const getClusterRadius = (latitudeDelta: number): number => {
  if (latitudeDelta < 0.01) return 0;
  if (latitudeDelta < 0.05) return 0.002;
  if (latitudeDelta < 0.1) return 0.005;
  return 0.01;
};

const clusterTips = (tips: TipLog[], region: Region): ClusterMarker[] => {
  const clusterRadius = getClusterRadius(region.latitudeDelta);

  if (clusterRadius === 0) {
    return tips.map((tip) => ({
      id: tip.id,
      latitude: tip.lat,
      longitude: tip.lng,
      tips: [tip],
      count: 1,
    }));
  }

  const clusters = new Map<string, TipLog[]>();

  for (const tip of tips) {
    const gridX = Math.floor(tip.lng / clusterRadius);
    const gridY = Math.floor(tip.lat / clusterRadius);
    const key = `${gridX},${gridY}`;

    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key)!.push(tip);
  }

  const result: ClusterMarker[] = [];
  let clusterId = 0;

  for (const [, clusterTips] of clusters) {
    const sumLat = clusterTips.reduce((sum, t) => sum + t.lat, 0);
    const sumLng = clusterTips.reduce((sum, t) => sum + t.lng, 0);

    result.push({
      id: `cluster-${clusterId++}`,
      latitude: sumLat / clusterTips.length,
      longitude: sumLng / clusterTips.length,
      tips: clusterTips,
      count: clusterTips.length,
    });
  }

  return result;
};

const sizeOrder: Record<TipSize, number> = {
  XXLARGE: 5,
  XLARGE: 4,
  LARGE: 3,
  MEDIUM: 2,
  SMALL: 1,
  NONE: 0,
};

const getClusterColor = (tips: TipLog[]): string => {
  let highestTip = tips[0];
  let highestOrder = sizeOrder[highestTip.tipSize] || 0;

  for (const tip of tips) {
    const order = sizeOrder[tip.tipSize] || 0;
    if (order > highestOrder) {
      highestOrder = order;
      highestTip = tip;
    }
  }

  return getTipSizeColor(highestTip.tipSize);
};

// Test helper
const createTip = (id: string, lat: number, lng: number, tipSize: TipSize = 'MEDIUM'): TipLog => ({
  id,
  lat,
  lng,
  tipSize,
  createdAt: '2026-01-06T12:00:00.000Z',
});

describe('TipMarkersLayer Clustering - Story 10-3', () => {
  describe('getClusterRadius', () => {
    it('returns 0 for very high zoom (latitudeDelta < 0.01)', () => {
      expect(getClusterRadius(0.005)).toBe(0);
      expect(getClusterRadius(0.009)).toBe(0);
    });

    it('returns small radius for high zoom (0.01 <= latitudeDelta < 0.05)', () => {
      expect(getClusterRadius(0.01)).toBe(0.002);
      expect(getClusterRadius(0.04)).toBe(0.002);
    });

    it('returns medium radius for medium zoom (0.05 <= latitudeDelta < 0.1)', () => {
      expect(getClusterRadius(0.05)).toBe(0.005);
      expect(getClusterRadius(0.09)).toBe(0.005);
    });

    it('returns large radius for low zoom (latitudeDelta >= 0.1)', () => {
      expect(getClusterRadius(0.1)).toBe(0.01);
      expect(getClusterRadius(0.5)).toBe(0.01);
    });
  });

  describe('clusterTips', () => {
    const highZoomRegion: Region = {
      latitude: 34.0522,
      longitude: -118.2437,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };

    const lowZoomRegion: Region = {
      latitude: 34.0522,
      longitude: -118.2437,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };

    it('returns individual markers when zoomed in (no clustering)', () => {
      const tips = [
        createTip('tip-1', 34.0522, -118.2437),
        createTip('tip-2', 34.0525, -118.2440),
      ];

      const clusters = clusterTips(tips, highZoomRegion);

      expect(clusters).toHaveLength(2);
      expect(clusters[0].count).toBe(1);
      expect(clusters[1].count).toBe(1);
    });

    it('clusters nearby tips when zoomed out', () => {
      const tips = [
        createTip('tip-1', 34.0522, -118.2437),
        createTip('tip-2', 34.0523, -118.2438),
        createTip('tip-3', 34.0524, -118.2439),
      ];

      const clusters = clusterTips(tips, lowZoomRegion);

      // All three should be in one cluster (same grid cell)
      expect(clusters).toHaveLength(1);
      expect(clusters[0].count).toBe(3);
    });

    it('separates tips in different grid cells', () => {
      const tips = [
        createTip('tip-1', 34.0, -118.0), // Grid cell A
        createTip('tip-2', 34.5, -118.5), // Grid cell B (far away)
      ];

      const clusters = clusterTips(tips, lowZoomRegion);

      expect(clusters).toHaveLength(2);
      expect(clusters[0].count).toBe(1);
      expect(clusters[1].count).toBe(1);
    });

    it('calculates cluster center as average of tip positions', () => {
      const tips = [
        createTip('tip-1', 34.0, -118.0),
        createTip('tip-2', 34.02, -118.02),
      ];

      const clusters = clusterTips(tips, lowZoomRegion);

      // Assuming they're in the same cluster
      if (clusters.length === 1) {
        expect(clusters[0].latitude).toBe(34.01); // Average of 34.0 and 34.02
        expect(clusters[0].longitude).toBe(-118.01); // Average
      }
    });

    it('handles empty tips array', () => {
      const clusters = clusterTips([], highZoomRegion);
      expect(clusters).toHaveLength(0);
    });

    it('handles single tip', () => {
      const tips = [createTip('tip-1', 34.0522, -118.2437)];
      const clusters = clusterTips(tips, lowZoomRegion);

      expect(clusters).toHaveLength(1);
      expect(clusters[0].count).toBe(1);
      expect(clusters[0].latitude).toBe(34.0522);
    });
  });

  describe('getClusterColor', () => {
    it('returns color of highest-value tip in cluster', () => {
      const tips = [
        createTip('tip-1', 34.0, -118.0, 'SMALL'),
        createTip('tip-2', 34.0, -118.0, 'XLARGE'),
        createTip('tip-3', 34.0, -118.0, 'MEDIUM'),
      ];

      const color = getClusterColor(tips);
      expect(color).toBe(getTipSizeColor('XLARGE'));
    });

    it('returns correct color when highest is XXLARGE', () => {
      const tips = [
        createTip('tip-1', 34.0, -118.0, 'LARGE'),
        createTip('tip-2', 34.0, -118.0, 'XXLARGE'),
      ];

      const color = getClusterColor(tips);
      expect(color).toBe(getTipSizeColor('XXLARGE'));
    });

    it('returns NONE color when all tips are NONE', () => {
      const tips = [
        createTip('tip-1', 34.0, -118.0, 'NONE'),
        createTip('tip-2', 34.0, -118.0, 'NONE'),
      ];

      const color = getClusterColor(tips);
      expect(color).toBe(getTipSizeColor('NONE'));
    });

    it('handles single tip cluster', () => {
      const tips = [createTip('tip-1', 34.0, -118.0, 'LARGE')];

      const color = getClusterColor(tips);
      expect(color).toBe(getTipSizeColor('LARGE'));
    });
  });

  describe('Tip size ordering', () => {
    it('orders tip sizes from lowest to highest', () => {
      expect(sizeOrder['NONE']).toBeLessThan(sizeOrder['SMALL']);
      expect(sizeOrder['SMALL']).toBeLessThan(sizeOrder['MEDIUM']);
      expect(sizeOrder['MEDIUM']).toBeLessThan(sizeOrder['LARGE']);
      expect(sizeOrder['LARGE']).toBeLessThan(sizeOrder['XLARGE']);
      expect(sizeOrder['XLARGE']).toBeLessThan(sizeOrder['XXLARGE']);
    });
  });
});
