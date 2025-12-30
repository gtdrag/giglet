import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: Add auth check - redirect to (auth)/login if not authenticated
  return <Redirect href="/(tabs)/zones" />;
}
