import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import ModalWithKeyboard from '../../components/ModalWithKeyboard';

export default function ParentMessagesScreen() {
  const { theme, t } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConv, setSelectedConv] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNew, setModalNew] = useState(false);
  const [message, setMessage] = useState('');
  const [reponse, setReponse] = useState('');
  const [enfants, setEnfants] = useState([]);
  const [selectedEnfant, setSelectedEnfant] = useState(null);
  const [sending, setSending] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('parent-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_replies' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages_parents' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages_archives' }, () => loadData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user.id);

      const { data: msgs } = await supabase
        .from('messages_parents')
        .select('*, enfants(prenom, nom)')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false });

      const { data: replies } = await supabase
        .from('message_replies')
        .select('*, profiles(prenom, nom)')
        .order('created_at', { ascending: true });

      const { data: archives } = await supabase
        .from('messages_archives')
        .select('message_id')
        .eq('user_id', user.id);
      const archivedIds = new Set((archives || []).map(a => a.message_id));

      const convs = (msgs || []).map(msg => ({
        ...msg,
        replies: (replies || []).filter(r => r.message_id === msg.id),
        isArchived: archivedIds.has(msg.id)
      }));
      setConversations(convs);

      const { data: liens } = await supabase
        .from('enfants_parents').select('enfant_id').eq('parent_id', user.id);
      if (liens && liens.length > 0) {
        const ids = liens.map(l => l.enfant_id);
        const { data: enf } = await supabase.from('enfants').select('*').in('id', ids);
        setEnfants(enf || []);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function archiverMessage(conv) {
    try {
      await supabase.from('messages_archives').insert({ message_id: conv.id, user_id: currentUserId });
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
  }

  async function desarchiverMessage(conv) {
    try {
      await supabase.from('messages_archives').delete()
        .eq('message_id', conv.id).eq('user_id', currentUserId);
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
  }

  async function envoyerMessage() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('messages_parents').insert({
        parent_id: user.id,
        enfant_id: selectedEnfant?.id || null,
        message: message.trim()
      });
      if (error) { Alert.alert(t('error'), error.message); setSending(false); return; }
      Alert.alert('✅', 'Message envoyé !');
      setMessage(''); setSelectedEnfant(null); setModalNew(false);
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
    setSending(false);
  }

  async function envoyerReponse() {
    if (!reponse.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('message_replies').insert({
        message_id: selectedConv.id,
        auteur_id: user.id,
        contenu: reponse.trim()
      });
      if (error) { Alert.alert(t('error'), error.message); setSending(false); return; }
      setReponse('');
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
    setSending(false);
  }

  const actifs = conversations.filter(c => !c.isArchived);
  const archives = conversations.filter(c => c.isArchived);
  const s = styles(theme);

  if (loading) return (
    <View style={s.center}><ActivityIndicator color={theme.primary} size="large" /></View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('messages')}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalNew(true)}>
          <Text style={s.addBtnText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        showsVerticalScrollIndicator={false}
      >
        {actifs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyText}>{t('noMessages')}</Text>
          </View>
        ) : (
          <View style={s.list}>
            {actifs.map(conv => (
              <View key={conv.id} style={s.convWrapper}>
                <TouchableOpacity
                  style={[s.convCard, conv.replies?.length > 0 && s.convCardWithReply]}
                  onPress={() => { setSelectedConv(conv); setModalVisible(true); }}
                >
                  <View style={s.convHeader}>
                    <Text style={s.convEnfant}>
                      {conv.enfants ? `À propos de ${conv.enfants.prenom}` : 'Message général'}
                    </Text>
                    <Text style={s.convDate}>
                      {new Date(conv.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <Text style={s.convMessage} numberOfLines={2}>{conv.message}</Text>
                  {conv.replies?.length > 0 && (
                    <View style={s.replyBadge}>
                      <Text style={s.replyBadgeText}>💬 {conv.replies.length} réponse(s)</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={s.archiveBtn} onPress={() => archiverMessage(conv)}>
                  <Text style={s.archiveBtnText}>Archiver</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {archives.length > 0 && (
          <TouchableOpacity style={s.showArchivesBtn} onPress={() => setShowArchives(!showArchives)}>
            <Text style={s.showArchivesBtnText}>
              {showArchives ? '🔼 Cacher les archivés' : `🔽 Voir les archivés (${archives.length})`}
            </Text>
          </TouchableOpacity>
        )}

        {showArchives && archives.map(conv => (
          <View key={conv.id} style={[s.list, { paddingTop: 0 }]}>
            <View style={s.convWrapper}>
              <TouchableOpacity
                style={[s.convCard, { opacity: 0.6 }]}
                onPress={() => { setSelectedConv(conv); setModalVisible(true); }}
              >
                <View style={s.convHeader}>
                  <Text style={s.convEnfant}>
                    {conv.enfants ? `À propos de ${conv.enfants.prenom}` : 'Message général'}
                  </Text>
                  <Text style={s.convDate}>{new Date(conv.created_at).toLocaleDateString('fr-FR')}</Text>
                </View>
                <Text style={s.convMessage} numberOfLines={2}>{conv.message}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.desarchiveBtn} onPress={() => desarchiverMessage(conv)}>
                <Text style={s.desarchiveBtnText}>Désarchiver</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal conversation */}
      <ModalWithKeyboard
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setReponse(''); }}
        title={selectedConv?.enfants ? `À propos de ${selectedConv.enfants.prenom}` : 'Conversation'}
      >
        <ScrollView style={s.thread} nestedScrollEnabled>
          <View style={s.msgParent}>
            <Text style={s.msgParentLabel}>Vous</Text>
            <Text style={s.msgParentText}>{selectedConv?.message}</Text>
            <Text style={s.msgDate}>{selectedConv && new Date(selectedConv.created_at).toLocaleDateString('fr-FR')}</Text>
          </View>
          {(selectedConv?.replies || []).map((reply, i) => (
            <View key={i} style={s.msgReply}>
              <Text style={s.msgReplyLabel}>L'équipe</Text>
              <Text style={s.msgReplyText}>{reply.contenu}</Text>
              <Text style={s.msgDate}>{new Date(reply.created_at).toLocaleDateString('fr-FR')}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={s.replyContainer}>
          <TextInput
            style={s.replyInput}
            placeholder="Répondre..."
            placeholderTextColor={theme.placeholder}
            value={reponse}
            onChangeText={setReponse}
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, (!reponse.trim() || sending) && { opacity: 0.5 }]}
            onPress={envoyerReponse}
            disabled={sending || !reponse.trim()}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendBtnText}>→</Text>}
          </TouchableOpacity>
        </View>
      </ModalWithKeyboard>

      {/* Modal nouveau message */}
      <ModalWithKeyboard
        visible={modalNew}
        onClose={() => { setModalNew(false); setMessage(''); setSelectedEnfant(null); }}
        title="Nouveau message"
      >
        {enfants.length > 0 && (
          <>
            <Text style={s.inputLabel}>À propos de :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {enfants.map(enf => (
                <TouchableOpacity
                  key={enf.id}
                  style={[s.enfantChip, selectedEnfant?.id === enf.id && s.enfantChipActive]}
                  onPress={() => setSelectedEnfant(enf)}
                >
                  <Text style={[s.enfantChipText, selectedEnfant?.id === enf.id && s.enfantChipTextActive]}>
                    {enf.prenom}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
        <TextInput
          style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
          placeholder="Votre message..."
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: theme.text },
  addBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.3 },
  emptyText: { color: theme.textSecondary, fontSize: 15 },

  list: { paddingHorizontal: 16, paddingTop: 8 },
  convWrapper: { marginBottom: 10 },
  convCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  convCardWithReply: { borderColor: theme.primary },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  convEnfant: { color: theme.text, fontSize: 13, fontWeight: '700' },
  convDate: { color: theme.textSecondary, fontSize: 11 },
  convMessage: { color: theme.textSecondary, fontSize: 13 },
  replyBadge: {
    marginTop: 8, backgroundColor: theme.primarySoft,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  replyBadgeText: { color: theme.primary, fontSize: 11, fontWeight: '700' },

  archiveBtn: {
    backgroundColor: theme.background, borderRadius: 10, borderWidth: 1,
    borderColor: theme.border, padding: 8, alignItems: 'center', marginTop: 4,
  },
  archiveBtnText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  desarchiveBtn: {
    backgroundColor: theme.primarySoft, borderRadius: 10, borderWidth: 1,
    borderColor: theme.primaryLight, padding: 8, alignItems: 'center', marginTop: 4,
  },
  desarchiveBtnText: { color: theme.primary, fontSize: 12, fontWeight: '600' },

  showArchivesBtn: {
    marginHorizontal: 16, marginBottom: 8, padding: 12, alignItems: 'center',
    backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
  },
  showArchivesBtnText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },

  thread: { maxHeight: 280, marginBottom: 12 },
  msgParent: {
    backgroundColor: theme.primarySoft, borderRadius: 12,
    padding: 12, marginBottom: 8, marginLeft: 24,
  },
  msgParentLabel: { color: theme.primary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  msgParentText: { color: theme.text, fontSize: 13 },
  msgReply: {
    backgroundColor: theme.background, borderRadius: 12,
    padding: 12, marginBottom: 8, marginRight: 24,
    borderWidth: 1, borderColor: theme.border,
  },
  msgReplyLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  msgReplyText: { color: theme.text, fontSize: 13 },
  msgDate: { color: theme.textSecondary, fontSize: 10, marginTop: 4 },

  replyContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  replyInput: {
    flex: 1, backgroundColor: theme.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: theme.inputBorder, color: theme.text,
    fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  inputLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  enfantChip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.card, marginRight: 8,
  },
  enfantChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  enfantChipText: { color: theme.textSecondary, fontSize: 13 },
  enfantChipTextActive: { color: '#fff', fontWeight: '700' },
  input: {
    backgroundColor: theme.inputBg, borderRadius: 10, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  modalBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  modalBtnDisabled: { backgroundColor: theme.border },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
