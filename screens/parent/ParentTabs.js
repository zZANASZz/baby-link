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

function TabIcon({ emoji, focused }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
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
          height: 60,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="ParentDashboard"
        component={ParentDashboardScreen}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MyChildren"
        component={MyChildrenScreen}
        options={{
          tabBarLabel: t('myChildren'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="👶" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ParentPhotos"
        component={ParentPhotosScreen}
        options={{
          tabBarLabel: t('photos'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="📸" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ParentMessages"
        component={ParentMessagesScreen}
        options={{
          tabBarLabel: t('messages'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ParentSettings"
        component={ParentSettingsScreen}
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}