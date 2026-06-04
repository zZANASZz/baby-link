import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import ModalWithKeyboard from '../../components/ModalWithKeyboard';
import Avatar from '../../components/Avatar';
import { useRealtime } from '../../lib/useRealtime';

export default function MyChildrenScreen({ navigation }) {
  const { theme, t } = useTheme();
  const [enfants, setEnfants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalCode, setModalCode] = useState(false);
  const [codeEnfant, setCodeEnfant] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadData(); }, []);
  useRealtime(['enfants', 'enfants_parents', 'rapports'], loadData);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: liens } = await supabase
        .from('enfants_parents').select('enfant_id').eq('parent_id', user.id);

      if (liens && liens.length > 0) {
        const ids = liens.map(l => l.enfant_id);
        const { data: enf } = await supabase
          .from('enfants').select('*').in('id', ids).order('prenom');
        setEnfants(enf || []);
      } else {
        setEnfants([]);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function rejoindreEnfant() {
    if (!codeEnfant.trim()) return;
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: enfant, error } = await supabase
        .from('enfants').select('*')
        .eq('code_enfant', codeEnfant.trim().toUpperCase()).single();

      if (error || !enfant) {
        Alert.alert(t('error'), 'Code enfant invalide');
        setAdding(false); return;
      }

      const { data: existant } = await supabase
        .from('enfants_parents').select('*')
        .eq('enfant_id', enfant.id).eq('parent_id', user.id).maybeSingle();

      if (existant) {
        Alert.alert('Info', 'Vous êtes déjà lié(e) à cet enfant !');
        setModalCode(false); setCodeEnfant(''); setAdding(false); return;
      }

      await supabase.from('enfants_parents').insert({
        enfant_id: enfant.id, parent_id: user.id
      });

      Alert.alert('✅', `${enfant.prenom} a été ajouté(e) !`);
      setModalCode(false); setCodeEnfant('');
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
    setAdding(false);
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
        <Text style={s.title}>{t('myChildren')}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalCode(true)}>
          <Text style={s.addBtnText}>{t('addChild')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {enfants.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👶</Text>
            <Text style={s.emptyText}>{t('addChildWithCode')}</Text>
          </View>
        ) : (
          <View style={s.list}>
            {enfants.map(enfant => (
              <TouchableOpacity
                key={enfant.id}
                style={s.enfantCard}
                onPress={() => navigation.navigate('ChildReports', { enfant })}
              >
                <Avatar enfant={enfant} size={48} />
                <View style={s.enfantInfo}>
                  <Text style={s.enfantNom}>{enfant.prenom} {enfant.nom}</Text>
                  {enfant.date_naissance && (
                    <Text style={s.enfantAge}>
                      Né(e) le {new Date(enfant.date_naissance).toLocaleDateString('fr-FR')}
                    </Text>
                  )}
                </View>
                <Text style={s.arrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <ModalWithKeyboard
        visible={modalCode}
        onClose={() => { setModalCode(false); setCodeEnfant(''); }}
        title={t('addChildTitle')}
      >
        <Text style={s.inputLabel}>{t('childCode')}</Text>
        <TextInput
          style={s.input}
          placeholder="Code fourni par la crèche"
          placeholderTextColor={theme.placeholder}
          value={codeEnfant}
          onChangeText={setCodeEnfant}
          autoCapitalize="characters"
          textAlign="center"
          autoFocus
        />
        <TouchableOpacity
          style={[s.modalBtn, !codeEnfant.trim() && s.modalBtnDisabled]}
          onPress={rejoindreEnfant}
          disabled={adding || !codeEnfant.trim()}
        >
          {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.modalBtnText}>{t('join')}</Text>}
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
  empty: { alignItems: 'center', padding: 32, marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.4 },
  emptyText: { color: theme.textSecondary, fontSize: 15, textAlign: 'center' },
  list: { padding: 16 },
  enfantCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border
  },
  enfantInfo: { flex: 1, marginLeft: 12 },
  enfantNom: { color: theme.text, fontSize: 15, fontWeight: '600' },
  enfantAge: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
  arrow: { color: theme.textSecondary, fontSize: 18 },
  inputLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 18,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, letterSpacing: 4
  },
  modalBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    padding: 16, alignItems: 'center'
  },
  modalBtnDisabled: { backgroundColor: theme.border },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});