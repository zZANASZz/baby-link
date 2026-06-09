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

      await supabase.from('enfants_parents').insert({ enfant_id: enfant.id, parent_id: user.id });
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
    <View style={s.center}><ActivityIndicator color={theme.primary} size="large" /></View>
  );

  return (
    <View style={s.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.date}>{formatToday()}</Text>
            <Text style={s.bonjour}>Bonjour {profile?.prenom} 👋</Text>
            <Text style={s.crecheName}>{creche?.nom || 'Ma crèche'}</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile?.prenom?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsGrid}>
          <TouchableOpacity
            style={[s.statCard, { backgroundColor: theme.cardStat1 }]}
            onPress={() => enfants.length === 0 ? setModalCodeEnfant(true) : navigation.navigate('MyChildren')}
          >
            <Text style={s.statEmoji}>👶</Text>
            <Text style={[s.statNumber, { color: theme.primary }]}>{stats.enfants}</Text>
            <Text style={s.statLabel}>{enfants.length === 0 ? 'Ajouter un enfant' : t('myChildren')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.statCard, { backgroundColor: theme.cardStat2 }]}
            onPress={() => enfants.length > 0 && navigation.navigate('MyChildren')}
          >
            <Text style={s.statEmoji}>📋</Text>
            <Text style={[s.statNumber, { color: theme.success }]}>{stats.rapports}</Text>
            <Text style={s.statLabel}>Rapports du jour</Text>
          </TouchableOpacity>
        </View>

        {/* Menu du jour */}
        {menuDuJour && (
          <View style={s.menuCard}>
            <Text style={s.menuTitle}>{t('menuOfDay')}</Text>
            <Text style={s.menuText}>{menuDuJour.menu}</Text>
          </View>
        )}

        {/* Enfants */}
        {enfants.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>👶</Text>
            <Text style={s.emptyTitle}>{t('noChildLinked')}</Text>
            <Text style={s.emptyText}>{t('addChildWithCode')}</Text>
            <TouchableOpacity style={s.addChildBtn} onPress={() => setModalCodeEnfant(true)}>
              <Text style={s.addChildBtnText}>{t('addChildArrow')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.childrenList}>
            <Text style={s.sectionTitle}>Mes enfants</Text>
            {enfants.map(enfant => (
              <TouchableOpacity
                key={enfant.id}
                style={s.enfantCard}
                onPress={() => navigation.navigate('MyChildren')}
              >
                <Avatar enfant={enfant} size={44} />
                <View style={s.enfantInfo}>
                  <Text style={s.enfantNom}>{enfant.prenom} {enfant.nom}</Text>
                  <Text style={s.enfantSection}>
                    {enfant.section === 'grande' ? t('grandeSection') : t('petiteSection')}
                  </Text>
                </View>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bouton message */}
        <TouchableOpacity style={s.messageBtn} onPress={() => setModalMessage(true)}>
          <Text style={s.messageBtnIcon}>✉️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.messageBtnTitle}>{t('sendMessage')}</Text>
            <Text style={s.messageBtnSubtitle}>{t('sendMessageSubtitle')}</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal ajouter enfant */}
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

      {/* Modal message */}
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

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  date: { fontSize: 12, color: theme.textSecondary, marginBottom: 2 },
  bonjour: { fontSize: 20, fontWeight: '700', color: theme.text },
  crecheName: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: theme.primary },

  statsGrid: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 14,
  },
  statCard: {
    flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', minHeight: 100,
  },
  statEmoji: { fontSize: 22, marginBottom: 6 },
  statNumber: { fontSize: 28, fontWeight: '700', lineHeight: 32 },
  statLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 3, fontWeight: '500', textAlign: 'center' },

  menuCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border,
    borderLeftWidth: 4, borderLeftColor: theme.primary,
  },
  menuTitle: { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 8 },
  menuText: { color: theme.textSecondary, fontSize: 14, lineHeight: 22 },

  emptyContainer: { alignItems: 'center', padding: 32, marginTop: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 },
  addChildBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  addChildBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  childrenList: { paddingHorizontal: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 10 },
  enfantCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.card, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  enfantInfo: { flex: 1 },
  enfantNom: { color: theme.text, fontSize: 14, fontWeight: '600' },
  enfantSection: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  arrow: { color: theme.textSecondary, fontSize: 20 },

  messageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.primary, borderRadius: 16,
    marginHorizontal: 16, padding: 18,
  },
  messageBtnIcon: { fontSize: 22 },
  messageBtnTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  messageBtnSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  inputLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: theme.inputBg, borderRadius: 10, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  modalBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  modalBtnDisabled: { backgroundColor: theme.border },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
