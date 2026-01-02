import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

export default function RegisterScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Giglet and start earning smarter</Text>

        {/* TODO: Implement registration form */}
        <View style={styles.form}>
          <Text style={styles.placeholder}>Registration form placeholder</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.linkText}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A1A1AA',
    marginBottom: 48,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  placeholder: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#71717A',
  },
  linkText: {
    fontSize: 14,
    color: '#06B6D4',
    fontWeight: '600',
  },
});
