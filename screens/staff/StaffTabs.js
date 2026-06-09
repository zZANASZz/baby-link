import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform
} from 'react-native';
import { useTheme } from '../../lib/theme';

import DashboardScreen from './DashboardScreen';
import ChildrenScreen from './ChildrenScreen';
import MessagesScreen from './MessagesScreen';
import AgendaScreen from './AgendaScreen';
import SettingsScreen from './SettingsScreen';
import PhotosScreen from './PhotosScreen';

const TABS = [
  { key: 'Dashboard', emoji: '🏠', labelKey: 'home' },
  { key: 'Children', emoji: '👶', labelKey: 'children' },
  { key: 'Photos', emoji: '📸', labelKey: 'photos' },
  { key: 'Messages', emoji: '💬', labelKey: 'messages' },
  { key: 'Agenda', emoji: '📅', labelKey: 'agenda' },
  { key: 'Settings', emoji: '⚙️', labelKey: 'settings' },
];

const SCREENS = {
  Dashboard: DashboardScreen,
  Children: ChildrenScreen,
  Photos: PhotosScreen,
  Messages: MessagesScreen,
  Agenda: AgendaScreen,
  Settings: SettingsScreen,
};

export default function StaffTabs({ navigation }) {
  const { theme, t } = useTheme();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const s = styles(theme);

  const ActiveScreen = SCREENS[activeTab];

  const navObj = {
    navigate: (screen, params) => {
      if (SCREENS[screen]) {
        setActiveTab(screen);
      } else if (navigation) {
        navigation.navigate(screen, params);
      }
    },
    goBack: () => navigation?.goBack?.(),
  };

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safeArea}>
        <View style={s.navBar}>
          <View style={s.navInner}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.navItem, isActive && s.navItemActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={s.navEmoji}>{tab.emoji}</Text>
                  {isActive && (
                    <Text style={s.navLabel}>{t(tab.labelKey)}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>

      <View style={s.content}>
        <ActiveScreen navigation={navObj} />
      </View>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    ...(Platform.OS === 'web' ? { display: 'flex', flexDirection: 'column', height: '100vh' } : {}),
  },
  safeArea: {
    backgroundColor: theme.background,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
    flexShrink: 0,
  },
  navBar: {
    backgroundColor: theme.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  navInner: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 50,
    padding: 4,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  navItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 50,
    gap: 4,
  },
  navItemActive: {
    backgroundColor: theme.primary,
  },
  navEmoji: {
    fontSize: 16,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    ...(Platform.OS === 'web' ? { overflow: 'auto', minHeight: 0 } : {}),
  },
});
