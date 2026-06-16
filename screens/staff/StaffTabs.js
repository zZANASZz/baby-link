import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

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
  const [messagesNonLus, setMessagesNonLus] = useState(0);
  const s = styles(theme);

  useEffect(() => {
    loadMessagesNonLus();
    const interval = setInterval(loadMessagesNonLus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadMessagesNonLus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('creche_id').eq('id', user.id).single();

      if (prof?.creche_id) {
        const { data: parents } = await supabase
          .from('profiles').select('id')
          .eq('creche_id', prof.creche_id).eq('role', 'parent');
        const parentIds = (parents || []).map(p => p.id);

        if (parentIds.length > 0) {
          const { data: msgs } = await supabase
            .from('messages_parents').select('id')
            .in('parent_id', parentIds).eq('lu', false);
          setMessagesNonLus(msgs?.length || 0);
        }
      }
    } catch (e) { console.log(e); }
  }

  const ActiveScreen = SCREENS[activeTab];

  const navObj = {
    navigate: (screen, params) => {
      if (SCREENS[screen]) {
        setActiveTab(screen);
        if (screen === 'Messages') loadMessagesNonLus();
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
              const showBadge = tab.key === 'Messages' && messagesNonLus > 0 && !isActive;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.navItem, isActive && s.navItemActive]}
                  onPress={() => {
                    setActiveTab(tab.key);
                    if (tab.key === 'Messages') loadMessagesNonLus();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={s.tabIconWrapper}>
                    <Text style={s.navEmoji}>{tab.emoji}</Text>
                    {showBadge && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>
                          {messagesNonLus > 9 ? '9+' : messagesNonLus}
                        </Text>
                      </View>
                    )}
                  </View>
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

const isWeb = Platform.OS === 'web';

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    ...(isWeb ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } : {}),
  },
  safeArea: {
    backgroundColor: theme.background,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
    flexShrink: 0,
  },
  navBar: {
    backgroundColor: theme.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 50,
  },
  navItemActive: {
    backgroundColor: theme.primary,
  },
  tabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navEmoji: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: theme.danger,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    ...(isWeb ? { overflowY: 'auto', overflowX: 'hidden', minHeight: 0, WebkitOverflowScrolling: 'touch' } : {}),
  },
});
