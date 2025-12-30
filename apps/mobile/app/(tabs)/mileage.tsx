import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MileageScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mileage</Text>
        <Text style={styles.subtitle}>Track miles for tax deductions</Text>
      </View>
      <View style={styles.content}>
        {/* TODO: Implement mileage tracking */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Today's Miles</Text>
          <Text style={styles.summaryValue}>0.0 mi</Text>
        </View>
        <View style={styles.trackingStatus}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Tracking inactive</Text>
        </View>
        <Text style={styles.placeholder}>Trip history placeholder</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FAFAFA',
  },
  subtitle: {
    fontSize: 14,
    color: '#A1A1AA',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#06B6D4',
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#71717A',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#71717A',
  },
  placeholder: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 20,
  },
});
