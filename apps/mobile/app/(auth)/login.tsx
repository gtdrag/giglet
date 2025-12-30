import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Giglet</Text>
        <Text style={styles.subtitle}>Stop guessing. Start earning.</Text>
        {/* TODO: Implement login form */}
        <Text style={styles.placeholder}>Login screen placeholder</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#06B6D4',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#A1A1AA',
    marginBottom: 48,
  },
  placeholder: {
    fontSize: 14,
    color: '#71717A',
  },
});
