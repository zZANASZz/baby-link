import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen({ navigation }) {
  const { theme, isDark, toggleTheme, language, setLanguage, t } = useTheme();
  const [profile, setProfile] = useState(null);
  const [creche, setCreche] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      if (prof?.creche_id) {
        const { data: cr } = await supabase
          .from('creches').select('*').eq('id', prof.creche_id).single();
        setCreche(cr);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
  }

  async function copierCode(code, label) {
    await Clipboard.setStringAsync(code);
    Alert.alert('✅ Copié !', `${label} copié dans le presse-papier :\n\n${code}`);
  }

  async function renouvelerCodePersonnel() {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: cr } = await supabase
        .from('creches').update({ code_invitation: code })
        .eq('id', creche.id).select().single();
      setCreche(cr);
      Alert.alert('✅', `Nouveau code personnel :\n${code}`);
    } catch (e) { Alert.alert(t('error'), e.message); }
  }

  async function renouvelerCodeParents() {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: cr } = await supabase
        .from('creches').update({ code_parents: code })
        .eq('id', creche.id).select().single();
      setCreche(cr);
      Alert.alert('✅', `Nouveau code parents :\n${code}`);
    } catch (e) { Alert.alert(t('error'), e.message); }
  }

  async function supprimerCompte() {
    Alert.alert(
      '⚠️ ' + t('deleteAccount'),
      'Attention, vous vous apprêtez à supprimer votre compte et quitter la crèche définitivement.\n\nSi vous souhaitez simplement vous déconnecter, utilisez le bouton Déconnexion en bas.',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'), style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              await supabase.from('enfants_parents').delete().eq('parent_id', user.id);
              await supabase.from('profiles').delete().eq('id', user.id);
              await supabase.auth.signOut();
            } catch (e) { Alert.alert(t('error'), e.message); }
          }
        }
      ]
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const isDirectrice = profile?.role === 'directrice';
  const s = styles(theme);

  const languages = [
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  ];

  if (loading) return (
    <View style={s.center}><Text style={s.loadingText}>{t('loading')}</Text></View>
  );

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('settingsTitle')}</Text>
      </View>

      {creche && (
        <View style={s.card}>
          <Text style={s.crecheName}>{creche.nom}</Text>
          {creche.adresse && <Text style={s.checheAddress}>{creche.adresse}</Text>}
          <Text style={s.roleText}>
            {profile?.role === 'directrice' ? t('director') : t('nurseryWorker')}
          </Text>
        </View>
      )}

      {creche && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('invitationCodes')}</Text>

          <View style={s.codeCard}>
            <Text style={s.codeCardLabel}>{t('staffCode')}</Text>
            <View style={s.codeRow}>
              <Text style={s.codeValue}>{creche.code_invitation}</Text>
              <TouchableOpacity
                style={s.copyBtn}
                onPress={() => copierCode(creche.code_invitation, 'Code personnel')}
              >
                <Text style={s.copyBtnText}>📋 Copier</Text>
              </TouchableOpacity>
              {isDirectrice && (
                <TouchableOpacity onPress={renouvelerCodePersonnel}>
                  <Text style={s.codeAction}>🔄</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={s.codeCard}>
            <Text style={s.codeCardLabel}>{t('parentCode')}</Text>
            <View style={s.codeRow}>
              <Text style={s.codeValue}>{creche.code_parents}</Text>
              <TouchableOpacity
                style={s.copyBtn}
                onPress={() => copierCode(creche.code_parents, 'Code parents')}
              >
                <Text style={s.copyBtnText}>📋 Copier</Text>
              </TouchableOpacity>
              {isDirectrice && (
                <TouchableOpacity onPress={renouvelerCodeParents}>
                  <Text style={s.codeAction}>🔄</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {isDirectrice && (
        <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('Members')}>
          <Text style={s.menuItemText}>{t('manageMembers')}</Text>
          <Text style={s.menuItemArrow}>→</Text>
        </TouchableOpacity>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('language')}</Text>
        <View style={s.langRow}>
          {languages.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[s.langBtn, language === lang.code && s.langBtnActive]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={s.langFlag}>{lang.flag}</Text>
              <Text style={[s.langName, language === lang.code && s.langNameActive]}>
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={s.menuItem} onPress={toggleTheme}>
        <Text style={s.menuItemText}>{isDark ? t('lightMode') : t('darkMode')}</Text>
        <Text style={s.menuItemArrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.dangerBtn} onPress={supprimerCompte}>
        <Text style={s.dangerBtnText}>{t('deleteAccount')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutBtnText}>{t('logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  card: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border
  },
  crecheName: { fontSize: 17, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  checheAddress: { fontSize: 14, color: theme.textSecondary, marginBottom: 4 },
  roleText: { fontSize: 13, color: theme.primary, fontWeight: '600' },
  section: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 12 },
  codeCard: {
    backgroundColor: theme.background, borderRadius: 12,
    padding: 12, marginBottom: 10
  },
  codeCardLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 6 },
  codeRow: { flexDirection: 'row', alignItems: 'center' },
  codeValue: { fontSize: 20, fontWeight: 'bold', color: theme.text, letterSpacing: 2, flex: 1 },
  copyBtn: {
    backgroundColor: theme.primaryLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8
  },
  copyBtnText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
  codeAction: { fontSize: 20, marginLeft: 12 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, alignItems: 'center', padding: 12,
    borderRadius: 12, borderWidth: 2, borderColor: theme.border,
    backgroundColor: theme.background
  },
  langBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
  langFlag: { fontSize: 24, marginBottom: 4 },
  langName: { fontSize: 11, color: theme.textSecondary },
  langNameActive: { color: theme.primary, fontWeight: '600' },
  menuItem: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: theme.border
  },
  menuItemText: { color: theme.text, fontSize: 15 },
  menuItemArrow: { color: theme.textSecondary, fontSize: 18 },
  dangerBtn: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.danger
  },
  dangerBtnText: { color: theme.danger, fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    marginHorizontal: 16, marginBottom: 10,
    padding: 16, alignItems: 'center'
  },
  logoutBtnText: { color: theme.textSecondary, fontSize: 15 },
});