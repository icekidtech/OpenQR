import { Redirect, Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', color: colors.text },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Create',
          headerTitle: 'OpenQR',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="qr-code" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="grid-view" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="batch"
        options={{
          title: 'Batch',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="layers" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
