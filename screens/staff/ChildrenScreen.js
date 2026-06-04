import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import ModalWithKeyboard from '../../components/ModalWithKeyboard';
import Avatar from '../../components/Avatar';
import { useRealtime } from '../../lib/useRealtime';

export default function ChildrenScreen({ navigation }) {
  const { theme, t } = useTheme();
  const [profile, setProfile] = useState(null);
  const [enfants, setEnfants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalAdd, setModalAdd] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadData(); }, []);
  useRealtime(['enfants'], loadData);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      if (prof?.creche_id) {
        const { data: enf } = await supabase
          .from('enfants').select('*').eq('creche_id', prof.creche_id).order('prenom');
        setEnfants(enf || []);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function ajouterEnfant() {
    if (!prenom.trim() || !nom.trim()) {
      Alert.alert(t('error'), 'Prénom et nom sont obligatoires');
      return;
    }
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('creche_id').eq('id', user.id).single();

      const codeEnfant = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: nouvelEnfant, error } = await supabase
        .from('enfants').insert({
          prenom: prenom.trim(),
          nom: nom.trim(),
          date_naissance: null,
          creche_id: prof.creche_id,
          code_enfant: codeEnfant
        }).select().single();

      if (error) { Alert.alert(t('error'), error.message); setAdding(false); return; }

      Alert.alert(
        '✅ Enfant ajouté !',
        `Code enfant pour les parents :\n\n${codeEnfant}\n\nDonnez ce code aux parents !`,
        [
          {
            text: '📋 Copier le code',
            onPress: async () => {
              await Clipboard.setStringAsync(codeEnfant);
              Alert.alert('✅ Copié !', 'Code copié dans le presse-papier');
            }
          },
          { text: 'OK' }
        ]
      );
      setModalAdd(false);
      setPrenom(''); setNom('');
    } catch (e) { Alert.alert(t('error'), e.message); }
    setAdding(false);
  }

  async function supprimerEnfant(enfant) {
    Alert.alert(
      t('delete'),
      `Supprimer ${enfant.prenom} ${enfant.nom} et tous ses rapports ?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'), style: 'destructive',
          onPress: async () => {
            await supabase.from('rapports').delete().eq('enfant_id', enfant.id);
            await supabase.from('enfants_parents').delete().eq('enfant_id', enfant.id);
            await supabase.from('photos_enfants').delete().eq('enfant_id', enfant.id);
            await supabase.from('enfants').delete().eq('id', enfant.id);
          }
        }
      ]
    );
  }

  async function copierCode(code) {
    await Clipboard.setStringAsync(code);
    Alert.alert('✅ Copié !', `Code copié dans le presse-papier :\n\n${code}`);
  }

  const s = styles(theme);

  if (loading) return (
    <View style={s.center}>
      <Text style={s.loadingText}>{t('loading')}</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('children')}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalAdd(true)}>
          <Text style={s.addBtnText}>{t('addChild')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {enfants.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👶</Text>
            <Text style={s.emptyText}>{t('noChildren')}</Text>
          </View>
        ) : (
          <View style={s.list}>
            {enfants.map(enfant => (
              <View key={enfant.id} style={s.enfantCard}>
                <Avatar enfant={enfant} size={44} />
                <View style={s.enfantInfo}>
                  <Text style={s.enfantNom}>{enfant.prenom} {enfant.nom}</Text>
                  <TouchableOpacity onPress={() => copierCode(enfant.code_enfant)}>
                    <Text style={s.enfantCode}>Code: {enfant.code_enfant} 📋</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={s.rapportBtn}
                  onPress={() => navigation.navigate('WriteReport', { enfant })}
                >
                  <Text style={s.rapportBtnIcon}>📄</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => supprimerEnfant(enfant)}
                >
                  <Text style={s.deleteBtnIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <ModalWithKeyboard
        visible={modalAdd}
        onClose={() => { setModalAdd(false); setPrenom(''); setNom(''); }}
        title={t('addChildTitle')}
      >
        <Text style={s.inputLabel}>{t('firstName')}</Text>
        <TextInput
          style={s.input}
          placeholder={t('firstName')}
          placeholderTextColor={theme.placeholder}
          value={prenom}
          onChangeText={setPrenom}
          autoFocus
        />
        <Text style={s.inputLabel}>{t('lastName')}</Text>
        <TextInput
          style={s.input}
          placeholder={t('lastName')}
          placeholderTextColor={theme.placeholder}
          value={nom}
          onChangeText={setNom}
        />
        <TouchableOpacity
          style={[s.modalBtn, (!prenom.trim() || !nom.trim()) && s.modalBtnDisabled]}
          onPress={ajouterEnfant}
          disabled={adding || !prenom.trim() || !nom.trim()}
        >
          {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.modalBtnText}>{t('add')}</Text>}
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
  addBtn: {
    backgroundColor: theme.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: theme.textSecondary, fontSize: 15 },
  list: { padding: 16 },
  enfantCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.card, borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: theme.border
  },
  enfantInfo: { flex: 1, marginLeft: 12 },
  enfantNom: { color: theme.text, fontSize: 15, fontWeight: '600' },
  enfantCode: { color: theme.primary, fontSize: 12, marginTop: 2 },
  rapportBtn: {
    backgroundColor: theme.card, borderRadius: 10, padding: 8,
    marginRight: 8, borderWidth: 1, borderColor: theme.border
  },
  rapportBtnIcon: { fontSize: 18 },
  deleteBtn: { padding: 8 },
  deleteBtnIcon: { fontSize: 18 },
  inputLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16
  },
  modalBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8
  },
  modalBtnDisabled: { backgroundColor: theme.border },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});