import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useTheme } from '../../lib/theme';

export default function OnboardingScreen({ navigation }) {
  const { theme, isDark, toggleTheme, t } = useTheme();
  const s = styles(theme);

  return (
    <View style={s.container}>
      <View style={s.content}>
        <View style={s.logoBox}>
          <Text style={s.logoEmoji}>🍼</Text>
        </View>
        <Text style={s.appName}>Baby-link</Text>

        <Text style={s.title}>{t('welcomeTo')}</Text>
        <Text style={s.subtitle}>{t('onboardingSubtitle')}</Text>

        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => navigation.navigate('CreateNursery')}
        >
          <Text style={s.primaryBtnText}>{t('createNursery')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => navigation.navigate('JoinNursery')}
        >
          <Text style={s.secondaryBtnText}>{t('joinNursery')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.themeBtn} onPress={toggleTheme}>
        <Text style={s.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', padding: 32
  },
  logoBox: {
    width: 100, height: 100, borderRadius: 25,
    backgroundColor: theme.primary, justifyContent: 'center',
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#7c3aed', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8
  },
  logoEmoji: { fontSize: 50 },
  appName: { fontSize: 32, fontWeight: 'bold', color: theme.primary, marginBottom: 24 },
  title: {
    fontSize: 22, fontWeight: 'bold',
    color: theme.text, textAlign: 'center', marginBottom: 12
  },
  subtitle: {
    fontSize: 15, color: theme.textSecondary,
    textAlign: 'center', marginBottom: 48
  },
  primaryBtn: {
    backgroundColor: theme.primary, borderRadius: 12, padding: 16,
    width: '100%', alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: 'transparent', borderRadius: 12, padding: 16,
    width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: theme.border
  },
  secondaryBtnText: { color: theme.text, fontSize: 16, fontWeight: '500' },
  themeBtn: {
    position: 'absolute', bottom: 32, left: 24,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.card, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: theme.border
  },
  themeIcon: { fontSize: 18 },
});