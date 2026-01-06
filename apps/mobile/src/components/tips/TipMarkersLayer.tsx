/**
 * TipMarkersLayer Component
 * Story 10-3: Tip Locations Map Layer
 *
 * Renders tip markers on the map with simple client-side clustering.
 * Groups nearby markers at low zoom levels to avoid visual clutter.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Region } from 'react-native-maps';
import { TipMarker } from './TipMarker';
import { TipLog, getTipSizeColor } from '../../services/tips';

interface TipMarkersLayerProps {
  tips: TipLog[];
  region: Region;
}

interface ClusterMarker {
  id: string;
  latitude: number;
  longitude: number;
  tips: TipLog[];
  count: number;
}

/**
 * Calculate cluster grid size based on zoom level (latitudeDelta)
 * Smaller latitudeDelta = more zoomed in = smaller clusters
 */
const getClusterRadius = (latitudeDelta: number): number => {
  // At high zoom (latitudeDelta < 0.01), show individual markers
  if (latitudeDelta < 0.01) return 0;
  // At medium zoom, cluster nearby markers
  if (latitudeDelta < 0.05) return 0.002;
  if (latitudeDelta < 0.1) return 0.005;
  // At low zoom, use larger clusters
  return 0.01;
};

/**
 * Simple clustering algorithm - groups tips within a grid cell
 */
const clusterTips = (tips: TipLog[], region: Region): ClusterMarker[] => {
  const clusterRadius = getClusterRadius(region.latitudeDelta);

  // If no clustering needed, return individual tips as clusters of 1
  if (clusterRadius === 0) {
    return tips.map((tip) => ({
      id: tip.id,
      latitude: tip.lat,
      longitude: tip.lng,
      tips: [tip],
      count: 1,
    }));
  }

  // Group tips into grid cells
  const clusters = new Map<string, TipLog[]>();

  for (const tip of tips) {
    // Calculate grid cell key
    const gridX = Math.floor(tip.lng / clusterRadius);
    const gridY = Math.floor(tip.lat / clusterRadius);
    const key = `${gridX},${gridY}`;

    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key)!.push(tip);
  }

  // Convert to cluster markers
  const result: ClusterMarker[] = [];
  let clusterId = 0;

  for (const [, clusterTips] of clusters) {
    // Calculate center of cluster
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

/**
 * Get the dominant tip size color in a cluster (most common or highest value)
 */
const getClusterColor = (tips: TipLog[]): string => {
  const sizeOrder: Record<string, number> = {
    XXLARGE: 5,
    XLARGE: 4,
    LARGE: 3,
    MEDIUM: 2,
    SMALL: 1,
    NONE: 0,
  };

  // Find the tip with the highest value
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

export function TipMarkersLayer({ tips, region }: TipMarkersLayerProps) {
  const clusters = useMemo(() => clusterTips(tips, region), [tips, region]);

  return (
    <>
      {clusters.map((cluster) => {
        // Single tip - render as TipMarker
        if (cluster.count === 1) {
          return <TipMarker key={cluster.tips[0].id} tip={cluster.tips[0]} />;
        }

        // Cluster - render as cluster marker
        const clusterColor = getClusterColor(cluster.tips);

        return (
          <Marker
            key={cluster.id}
            coordinate={{
              latitude: cluster.latitude,
              longitude: cluster.longitude,
            }}
            tracksViewChanges={false}
          >
            <View style={[styles.clusterContainer, { backgroundColor: clusterColor }]}>
              <Text style={styles.clusterText}>{cluster.count}</Text>
            </View>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  clusterContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  clusterText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '700',
  },
});
