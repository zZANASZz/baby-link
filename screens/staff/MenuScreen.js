import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
  ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import ModalWithKeyboard from '../../components/ModalWithKeyboard';

export default function MenuScreen() {
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [menuDuJour, setMenuDuJour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuText, setMenuText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      if (prof?.creche_id) {
        const today = new Date().toISOString().split('T')[0];
        const { data: menu } = await supabase
          .from('menu_jour')
          .select('*')
          .eq('creche_id', prof.creche_id)
          .eq('date', today)
          .maybeSingle();
        setMenuDuJour(menu);
        if (menu) setMenuText(menu.menu);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function sauvegarderMenu() {
    if (!menuText.trim()) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      if (menuDuJour) {
        await supabase.from('menu_jour')
          .update({ menu: menuText.trim() })
          .eq('id', menuDuJour.id);
      } else {
        await supabase.from('menu_jour').insert({
          creche_id: profile.creche_id,
          menu: menuText.trim(),
          date: today
        });
      }

      Alert.alert('✅ Menu sauvegardé !', 'Les parents peuvent voir le menu du jour.');
      setModalVisible(false);
      loadData();
    } catch (e) { Alert.alert('Erreur', e.message); }
    setSaving(false);
  }

  async function supprimerMenu() {
    Alert.alert('Supprimer', 'Supprimer le menu du jour ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          await supabase.from('menu_jour').delete().eq('id', menuDuJour.id);
          setMenuDuJour(null);
          setMenuText('');
        }
      }
    ]);
  }

  function formatToday() {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).replace(/^\w/, c => c.toUpperCase());
  }

  const s = styles(theme);

  if (loading) return (
    <View style={s.center}><Text style={s.loadingText}>Chargement...</Text></View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Menu du jour</Text>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => { setMenuText(menuDuJour?.menu || ''); setModalVisible(true); }}
        >
          <Text style={s.editBtnText}>{menuDuJour ? '✏️ Modifier' : '+ Ajouter'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={Platform.OS === 'web' ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        <View style={s.dateCard}>
          <Text style={s.dateText}>{formatToday()}</Text>
        </View>

        {menuDuJour ? (
          <View style={s.menuCard}>
            <Text style={s.menuEmoji}>🍽️</Text>
            <Text style={s.menuText}>{menuDuJour.menu}</Text>
            <TouchableOpacity style={s.deleteBtn} onPress={supprimerMenu}>
              <Text style={s.deleteBtnText}>Supprimer le menu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🍽️</Text>
            <Text style={s.emptyText}>Aucun menu pour aujourd'hui</Text>
            <Text style={s.emptySubtext}>
              Ajoutez le menu du jour pour que les parents puissent le consulter
            </Text>
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={s.addBtnText}>Écrire le menu du jour</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.infoCard}>
          <Text style={s.infoText}>
            ℹ️ Le menu se renouvelle automatiquement chaque jour à minuit.
          </Text>
        </View>
      </ScrollView>

      <ModalWithKeyboard
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Menu du jour"
      >
        <Text style={s.inputLabel}>Décrivez le menu d'aujourd'hui</Text>
        <TextInput
          style={[s.input, { minHeight: 150, textAlignVertical: 'top' }]}
          placeholder="Ex: Entrée: Salade de tomates&#10;Plat: Poulet rôti avec purée&#10;Dessert: Compote de pommes"
          placeholderTextColor={theme.placeholder}
          value={menuText}
          onChangeText={setMenuText}
          multiline
          autoFocus
        />
        <TouchableOpacity
          style={[s.saveBtn, !menuText.trim() && s.saveBtnDisabled]}
          onPress={sauvegarderMenu}
          disabled={saving || !menuText.trim()}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>Sauvegarder</Text>
          )}
        </TouchableOpacity>
      </ModalWithKeyboard>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingTop: 60
  },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  editBtn: {
    backgroundColor: theme.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8
  },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  dateCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: theme.primaryLight, borderRadius: 16, padding: 16
  },
  dateText: { color: theme.primary, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  menuCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: theme.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: theme.border, alignItems: 'center'
  },
  menuEmoji: { fontSize: 48, marginBottom: 16 },
  menuText: { color: theme.text, fontSize: 16, lineHeight: 26, textAlign: 'center', marginBottom: 20 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { color: theme.danger, fontSize: 14 },
  empty: { alignItems: 'center', padding: 32, marginTop: 20 },
  emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.3 },
  emptyText: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtext: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  addBtn: {
    backgroundColor: theme.primary, borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 12
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  infoCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border
  },
  infoText: { color: theme.textSecondary, fontSize: 13 },
  inputLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16
  },
  saveBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    padding: 16, alignItems: 'center'
  },
  saveBtnDisabled: { backgroundColor: theme.border },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});