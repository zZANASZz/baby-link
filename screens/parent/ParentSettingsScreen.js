import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function ParentSettingsScreen() {
  const { theme, language, setLanguage, t } = useTheme();
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
          .from('creches').select('nom, adresse').eq('id', prof.creche_id).single();
        setCreche(cr);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
  }

  async function supprimerCompte() {
    Alert.alert(
      '⚠️ ' + t('deleteAccount'),
      'Attention, vous vous apprêtez à supprimer votre compte.\n\nSi vous souhaitez simplement vous déconnecter, utilisez le bouton Déconnexion en bas.',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'), style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              await supabase.from('enfants_parents').delete().eq('parent_id', user.id);
              await supabase.from('messages_parents').delete().eq('parent_id', user.id);
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

  const languages = [
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  ];

  const s = styles(theme);

  if (loading) return (
    <View style={s.center}><Text style={s.loadingText}>{t('loading')}</Text></View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Text style={s.title}>{t('settingsTitle')}</Text>
      </View>

      {/* Profil */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Mon profil</Text>
        <Text style={s.profileName}>{profile?.prenom} {profile?.nom}</Text>
        <Text style={s.roleTag}>{t('parent')}</Text>
      </View>

      {/* Crèche */}
      {creche && (
        <View style={s.card}>
          <Text style={s.cardLabel}>Ma crèche</Text>
          <Text style={s.crecheName}>{creche.nom}</Text>
          {creche.adresse && <Text style={s.crecheAddress}>{creche.adresse}</Text>}
        </View>
      )}

      {/* Langue */}
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

      {/* Supprimer compte */}
      <TouchableOpacity style={s.dangerBtn} onPress={supprimerCompte}>
        <Text style={s.dangerBtnText}>{t('deleteAccount')}</Text>
      </TouchableOpacity>

      {/* Déconnexion */}
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
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: theme.text },

  card: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  cardLabel: { fontSize: 11, color: theme.textSecondary, marginBottom: 6, fontWeight: '600', letterSpacing: 0.5 },
  profileName: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 4 },
  roleTag: { fontSize: 12, color: theme.primary, fontWeight: '700' },
  crecheName: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 },
  crecheAddress: { fontSize: 13, color: theme.textSecondary },

  section: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 12 },

  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, alignItems: 'center', padding: 12,
    borderRadius: 12, borderWidth: 2, borderColor: theme.border,
    backgroundColor: theme.background,
  },
  langBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
  langFlag: { fontSize: 24, marginBottom: 4 },
  langName: { fontSize: 11, color: theme.textSecondary },
  langNameActive: { color: theme.primary, fontWeight: '700' },

  dangerBtn: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.danger,
  },
  dangerBtnText: { color: theme.danger, fontSize: 15, fontWeight: '600' },

  logoutBtn: { marginHorizontal: 16, marginBottom: 10, padding: 16, alignItems: 'center' },
  logoutBtnText: { color: theme.textSecondary, fontSize: 15 },
});
