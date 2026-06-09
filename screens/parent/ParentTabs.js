import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

import ParentDashboardScreen from './ParentDashboardScreen';
import MyChildrenScreen from './MyChildrenScreen';
import ParentPhotosScreen from './ParentPhotosScreen';
import ParentMessagesScreen from './ParentMessagesScreen';
import ParentSettingsScreen from './ParentSettingsScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused, theme }) {
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? theme.primary : 'transparent',
      borderRadius: 20, paddingHorizontal: focused ? 12 : 0,
      paddingVertical: 4,
    }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
    </View>
  );
}

export default function ParentTabs() {
  const { theme, t } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.navBg,
          borderTopColor: theme.navBorder,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 62,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="ParentDashboard"
        component={ParentDashboardScreen}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} theme={theme} />,
        }}
      />
      <Tab.Screen
        name="MyChildren"
        component={MyChildrenScreen}
        options={{
          tabBarLabel: t('myChildren'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="👶" focused={focused} theme={theme} />,
        }}
      />
      <Tab.Screen
        name="ParentPhotos"
        component={ParentPhotosScreen}
        options={{
          tabBarLabel: t('photos'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="📸" focused={focused} theme={theme} />,
        }}
      />
      <Tab.Screen
        name="ParentMessages"
        component={ParentMessagesScreen}
        options={{
          tabBarLabel: t('messages'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} theme={theme} />,
        }}
      />
      <Tab.Screen
        name="ParentSettings"
        component={ParentSettingsScreen}
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} theme={theme} />,
        }}
      />
    </Tab.Navigator>
  );
}
