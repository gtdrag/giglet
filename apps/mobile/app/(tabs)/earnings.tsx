import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EarningsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
        <Text style={styles.subtitle}>Track your income across platforms</Text>
      </View>
      <View style={styles.content}>
        {/* TODO: Implement earnings dashboard */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Today's Earnings</Text>
          <Text style={styles.summaryValue}>$0.00</Text>
        </View>
        <Text style={styles.placeholder}>Earnings dashboard placeholder</Text>
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
    marginBottom: 20,
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
    color: '#22C55E',
  },
  placeholder: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 20,
  },
});
