import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

import DashboardScreen from './DashboardScreen';
import ChildrenScreen from './ChildrenScreen';
import MessagesScreen from './MessagesScreen';
import AgendaScreen from './AgendaScreen';
import SettingsScreen from './SettingsScreen';
import PhotosScreen from './PhotosScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
    </View>
  );
}

export default function StaffTabs() {
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
        tabBarLabelStyle: { fontSize: 10, marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Children"
        component={ChildrenScreen}
        options={{
          tabBarLabel: t('children'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="👶" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Photos"
        component={PhotosScreen}
        options={{
          tabBarLabel: t('photos'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="📸" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: t('messages'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{
          tabBarLabel: t('agenda'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}