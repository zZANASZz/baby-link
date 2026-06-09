import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform
} from 'react-native';
import { useTheme } from '../../lib/theme';

import ParentDashboardScreen from './ParentDashboardScreen';
import MyChildrenScreen from './MyChildrenScreen';
import ParentPhotosScreen from './ParentPhotosScreen';
import ParentMessagesScreen from './ParentMessagesScreen';
import ParentSettingsScreen from './ParentSettingsScreen';

const TABS = [
  { key: 'ParentDashboard', emoji: '🏠', labelKey: 'home' },
  { key: 'MyChildren', emoji: '👶', labelKey: 'myChildren' },
  { key: 'ParentPhotos', emoji: '📸', labelKey: 'photos' },
  { key: 'ParentMessages', emoji: '💬', labelKey: 'messages' },
  { key: 'ParentSettings', emoji: '⚙️', labelKey: 'settings' },
];

const SCREENS = {
  ParentDashboard: ParentDashboardScreen,
  MyChildren: MyChildrenScreen,
  ParentPhotos: ParentPhotosScreen,
  ParentMessages: ParentMessagesScreen,
  ParentSettings: ParentSettingsScreen,
};

export default function ParentTabs({ navigation }) {
  const { theme, t } = useTheme();
  const [activeTab, setActiveTab] = useState('ParentDashboard');
  const s = styles(theme);

  const ActiveScreen = SCREENS[activeTab];

  return (
    <View style={s.container}>
      {/* Barre de navigation en haut */}
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

      {/* Contenu de l'écran actif */}
      <View style={s.content}>
        <ActiveScreen navigation={{
          navigate: (screen, params) => {
            if (SCREENS[screen]) {
              setActiveTab(screen);
            } else if (navigation) {
              navigation.navigate(screen, params);
            }
          },
          goBack: () => navigation?.goBack?.(),
          ...navigation,
        }} />
      </View>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: theme.background,
  ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'hidden' } : {}),
},
  safeArea: {
    backgroundColor: theme.background,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
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
  overflow: 'hidden',
  ...(Platform.OS === 'web' ? { overflowY: 'auto' } : {}),
},
});
