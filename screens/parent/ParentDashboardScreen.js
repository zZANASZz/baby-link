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

export default function ParentDashboardScreen({ navigation }) {
  const { theme, t } = useTheme();
  const [profile, setProfile] = useState(null);
  const [creche, setCreche] = useState(null);
  const [enfants, setEnfants] = useState([]);
  const [stats, setStats] = useState({ enfants: 0, rapports: 0 });
  const [menuDuJour, setMenuDuJour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalMessage, setModalMessage] = useState(false);
  const [modalCodeEnfant, setModalCodeEnfant] = useState(false);
  const [message, setMessage] = useState('');
  const [codeEnfant, setCodeEnfant] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadData(); }, []);
  useRealtime(['rapports', 'enfants', 'menu_jour', 'enfants_parents'], loadData);

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

        const today = new Date().toISOString().split('T')[0];
        const { data: menu } = await supabase
          .from('menu_jour').select('*')
          .eq('creche_id', prof.creche_id).eq('date', today).maybeSingle();
        setMenuDuJour(menu);
      }

      const { data: liens } = await supabase
        .from('enfants_parents').select('enfant_id').eq('parent_id', user.id);

      if (liens && liens.length > 0) {
        const ids = liens.map(l => l.enfant_id);
        const { data: enf } = await supabase
          .from('enfants').select('*').in('id', ids);
        setEnfants(enf || []);

        const today = new Date().toISOString().split('T')[0];
        const { data: rapports } = await supabase
          .from('rapports').select('id')
          .in('enfant_id', ids).eq('date', today).eq('brouillon', false);

        setStats({ enfants: enf?.length || 0, rapports: rapports?.length || 0 });
      } else {
        setStats({ enfants: 0, rapports: 0 });
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function rejoindreEnfant() {
    if (!codeEnfant.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: enfant, error } = await supabase
        .from('enfants').select('*')
        .eq('code_enfant', codeEnfant.trim().toUpperCase()).single();

      if (error || !enfant) { Alert.alert(t('error'), 'Code enfant invalide'); setSending(false); return; }

      const { data: existant } = await supabase
        .from('enfants_parents').select('*')
        .eq('enfant_id', enfant.id).eq('parent_id', user.id).maybeSingle();

      if (existant) {
        Alert.alert('Info', 'Vous êtes déjà lié(e) à cet enfant !');
        setModalCodeEnfant(false); setCodeEnfant(''); setSending(false); return;
      }

      const { error: lienError } = await supabase
        .from('enfants_parents').insert({ enfant_id: enfant.id, parent_id: user.id });

      if (lienError) { Alert.alert(t('error'), lienError.message); setSending(false); return; }

      Alert.alert('✅', `Vous êtes maintenant lié(e) à ${enfant.prenom} !`);
      setModalCodeEnfant(false); setCodeEnfant('');
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
    setSending(false);
  }

  async function envoyerMessage() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const enfantId = enfants.length > 0 ? enfants[0].id : null;
      const { error } = await supabase.from('messages_parents').insert({
        parent_id: user.id, enfant_id: enfantId, message: message.trim()
      });
      if (error) { Alert.alert(t('error'), error.message); setSending(false); return; }
      Alert.alert('✅', 'Message envoyé !');
      setMessage(''); setModalMessage(false);
    } catch (e) { Alert.alert(t('error'), e.message); }
    setSending(false);
  }

  function formatToday() {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).replace(/^\w/, c => c.toUpperCase());
  }

  const s = styles(theme);

  if (loading) return (
    <View style={s.center}><Text style={s.loadingText}>{t('loading')}</Text></View>
  );

  return (
    <View style={s.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        <View style={s.header}>
          <Text style={s.date}>{formatToday()}</Text>
          <Text style={s.crecheName}>{creche?.nom || 'Ma crèche'}</Text>
        </View>

        <View style={s.statsGrid}>
          <TouchableOpacity
            style={[s.statCard, { backgroundColor: theme.cardStat1 }]}
            onPress={() => { if (enfants.length === 0) setModalCodeEnfant(true); else navigation.navigate('MyChildren'); }}
          >
            <View style={[s.statIcon, { backgroundColor: theme.primary + '30' }]}>
              <Text style={s.statEmoji}>👶</Text>
            </View>
            <Text style={s.statNumber}>{stats.enfants}</Text>
            <Text style={s.statLabel}>{enfants.length === 0 ? t('addChildArrow') : t('myChildren')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.statCard, { backgroundColor: theme.cardStat2 }]}
            onPress={() => { if (enfants.length === 0) Alert.alert('Info', 'Ajoutez d\'abord un enfant.'); else navigation.navigate('MyChildren'); }}
          >
            <View style={[s.statIcon, { backgroundColor: '#10b98130' }]}>
              <Text style={s.statEmoji}>📋</Text>
            </View>
            <Text style={s.statNumber}>{stats.rapports}</Text>
            <Text style={s.statLabel}>Rapports du jour</Text>
          </TouchableOpacity>
        </View>

        {menuDuJour && (
          <View style={s.menuCard}>
            <Text style={s.menuTitle}>{t('menuOfDay')}</Text>
            <Text style={s.menuText}>{menuDuJour.menu}</Text>
          </View>
        )}

        {enfants.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>👶</Text>
            <Text style={s.emptyTitle}>{t('noChildLinked')}</Text>
            <Text style={s.emptyText}>{t('addChildWithCode')}</Text>
            <TouchableOpacity style={s.addChildLink} onPress={() => setModalCodeEnfant(true)}>
              <Text style={s.addChildLinkText}>{t('addChildArrow')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.childrenList}>
            {enfants.map(enfant => (
              <TouchableOpacity
                key={enfant.id}
                style={s.enfantCard}
                onPress={() => navigation.navigate('MyChildren')}
              >
                <Avatar enfant={enfant} size={44} />
                <Text style={s.enfantNom}>{enfant.prenom} {enfant.nom}</Text>
                <Text style={s.arrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={s.messageBtn} onPress={() => setModalMessage(true)}>
          <Text style={s.messageBtnIcon}>✉️</Text>
          <View>
            <Text style={s.messageBtnTitle}>{t('sendMessage')}</Text>
            <Text style={s.messageBtnSubtitle}>{t('sendMessageSubtitle')}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <ModalWithKeyboard
        visible={modalCodeEnfant}
        onClose={() => { setModalCodeEnfant(false); setCodeEnfant(''); }}
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
          disabled={sending || !codeEnfant.trim()}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.modalBtnText}>{t('join')}</Text>}
        </TouchableOpacity>
      </ModalWithKeyboard>

      <ModalWithKeyboard
        visible={modalMessage}
        onClose={() => setModalMessage(false)}
        title={t('sendMessage')}
      >
        <TextInput
          style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
          placeholder="Ex: Mon enfant a mal dormi cette nuit..."
          placeholderTextColor={theme.placeholder}
          value={message}
          onChangeText={setMessage}
          multiline
          autoFocus
        />
        <TouchableOpacity
          style={[s.modalBtn, !message.trim() && s.modalBtnDisabled]}
          onPress={envoyerMessage}
          disabled={sending || !message.trim()}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.modalBtnText}>{t('send')}</Text>}
        </TouchableOpacity>
      </ModalWithKeyboard>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: { padding: 20, paddingTop: 60 },
  date: { fontSize: 13, color: theme.textSecondary, marginBottom: 4 },
  crecheName: { fontSize: 22, fontWeight: 'bold', color: theme.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 8, marginTop: 8 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, minHeight: 110, justifyContent: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statEmoji: { fontSize: 20 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: theme.text },
  statLabel: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  menuCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border,
    borderLeftWidth: 4, borderLeftColor: theme.primary
  },
  menuTitle: { fontSize: 15, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
  menuText: { color: theme.textSecondary, fontSize: 14, lineHeight: 22 },
  emptyContainer: { alignItems: 'center', padding: 32, marginTop: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.4 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 16 },
  addChildLink: { padding: 8 },
  addChildLinkText: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  childrenList: { padding: 16 },
  enfantCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border
  },
  enfantNom: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '600', marginLeft: 12 },
  arrow: { color: theme.textSecondary, fontSize: 18 },
  messageBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.primary, borderRadius: 16,
    margin: 16, padding: 18, gap: 14
  },
  messageBtnIcon: { fontSize: 24 },
  messageBtnTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  messageBtnSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  inputLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16
  },
  modalBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  modalBtnDisabled: { backgroundColor: theme.border },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});