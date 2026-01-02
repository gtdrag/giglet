import { Redirect } from 'expo-router';

export default function Index() {
  // For MVP, always redirect to login
  // Auth state management will be added in Epic 2
  return <Redirect href="/(auth)/login" />;
}
