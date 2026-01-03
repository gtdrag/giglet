import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapPage from './index';
import DashboardPage from './dashboard';
import MileagePage from './mileage';
import { useMileageStore } from '../../src/stores/mileageStore';

type Page = 'map' | 'dashboard' | 'mileage';

export default function MainLayout() {
  const [currentPage, setCurrentPage] = useState<Page>('map');
  const { trackingEnabled, loadTrackingPreference, checkPermission } = useMileageStore();

  // Load saved tracking preference on mount
  useEffect(() => {
    loadTrackingPreference();
  }, [loadTrackingPreference]);

  // Re-check permission when mileage tab is focused
  useEffect(() => {
    if (currentPage === 'mileage') {
      checkPermission();
    }
  }, [currentPage, checkPermission]);

  const renderPage = () => {
    switch (currentPage) {
      case 'map':
        return <MapPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'mileage':
        return <MileagePage />;
      default:
        return <MapPage />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Page content */}
      <View style={styles.content}>
        {renderPage()}
      </View>

      {/* Segmented control at bottom */}
      <SafeAreaView edges={['bottom']} style={styles.footerContainer}>
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segment, currentPage === 'map' && styles.segmentActive]}
            onPress={() => setCurrentPage('map')}
          >
            <Text style={[styles.segmentText, currentPage === 'map' && styles.segmentTextActive]}>
              Map
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, currentPage === 'dashboard' && styles.segmentActive]}
            onPress={() => setCurrentPage('dashboard')}
          >
            <Text style={[styles.segmentText, currentPage === 'dashboard' && styles.segmentTextActive]}>
              Dashboard
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, currentPage === 'mileage' && styles.segmentActive]}
            onPress={() => setCurrentPage('mileage')}
          >
            <View style={styles.mileageSegmentContent}>
              <Text style={[styles.segmentText, currentPage === 'mileage' && styles.segmentTextActive]}>
                Mileage
              </Text>
              {trackingEnabled && <View style={styles.trackingDot} />}
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  content: {
    flex: 1,
  },
  footerContainer: {
    backgroundColor: '#09090B',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#27272A',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#71717A',
  },
  segmentTextActive: {
    color: '#FAFAFA',
  },
  mileageSegmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
});
