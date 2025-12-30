import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

// Simple icon placeholders - will be replaced with actual icons
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>
        {name[0].toUpperCase()}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#18181B',
          borderTopColor: '#27272A',
          height: 84,
          paddingBottom: 24,
          paddingTop: 12,
        },
        tabBarActiveTintColor: '#06B6D4',
        tabBarInactiveTintColor: '#71717A',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="zones"
        options={{
          title: 'Zones',
          tabBarIcon: ({ focused }) => <TabIcon name="Zones" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ focused }) => <TabIcon name="Earnings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mileage"
        options={{
          title: 'Mileage',
          tabBarIcon: ({ focused }) => <TabIcon name="Mileage" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#71717A',
  },
  iconTextFocused: {
    color: '#06B6D4',
  },
});
