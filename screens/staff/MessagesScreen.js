import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import ModalWithKeyboard from '../../components/ModalWithKeyboard';
import { useRealtime } from '../../lib/useRealtime';

export default function MessagesScreen() {
  const { theme, t } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConv, setSelectedConv] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMenu, setModalMenu] = useState(false);
  const [reponse, setReponse] = useState('');
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState(null);
  const [menuDuJour, setMenuDuJour] = useState(null);
  const [menuText, setMenuText] = useState('');
  const [savingMenu, setSavingMenu] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => { loadData(); }, []);
  useRealtime(['messages_parents', 'message_replies', 'menu_jour', 'messages_archives'], loadData);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user.id);

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      if (prof?.creche_id) {
        const today = new Date().toISOString().split('T')[0];
        const { data: menu } = await supabase
          .from('menu_jour').select('*')
          .eq('creche_id', prof.creche_id).eq('date', today).maybeSingle();
        setMenuDuJour(menu);
        if (menu) setMenuText(menu.menu);

        const { data: enfants } = await supabase
          .from('enfants').select('id').eq('creche_id', prof.creche_id);
        const enfantIds = (enfants || []).map(e => e.id);

        const { data: parentsDeLaCreche } = await supabase
          .from('profiles').select('id')
          .eq('creche_id', prof.creche_id).eq('role', 'parent');
        const parentIds = (parentsDeLaCreche || []).map(p => p.id);

        let msgs = [];
        if (enfantIds.length > 0) {
          const { data: msgsEnfants } = await supabase
            .from('messages_parents')
            .select('*, profiles(prenom, nom), enfants(prenom, nom)')
            .in('enfant_id', enfantIds)
            .order('created_at', { ascending: false });
          msgs = [...msgs, ...(msgsEnfants || [])];
        }
        if (parentIds.length > 0) {
          const { data: msgsParents } = await supabase
            .from('messages_parents')
            .select('*, profiles(prenom, nom), enfants(prenom, nom)')
            .in('parent_id', parentIds)
            .is('enfant_id', null)
            .order('created_at', { ascending: false });
          msgs = [...msgs, ...(msgsParents || [])];
        }

        const uniqueMsgs = msgs.filter((msg, index, self) =>
          index === self.findIndex(m => m.id === msg.id)
        );

        const { data: replies } = await supabase
          .from('message_replies')
          .select('*, profiles(prenom, nom)')
          .order('created_at', { ascending: true });

        // Récupérer les archives de cet utilisateur
        const { data: archives } = await supabase
          .from('messages_archives')
          .select('message_id')
          .eq('user_id', user.id);
        const archivedIds = new Set((archives || []).map(a => a.message_id));

        const grouped = uniqueMsgs.map(msg => ({
          ...msg,
          replies: (replies || []).filter(r => r.message_id === msg.id),
          isArchived: archivedIds.has(msg.id)
        }));
        setConversations(grouped);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function archiverMessage(conv) {
    try {
      await supabase.from('messages_archives').insert({
        message_id: conv.id,
        user_id: currentUserId
      });
      await supabase.from('messages_parents').update({ lu: true }).eq('id', conv.id);
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
  }

  async function desarchiverMessage(conv) {
    try {
      await supabase.from('messages_archives')
        .delete()
        .eq('message_id', conv.id)
        .eq('user_id', currentUserId);
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
  }

  async function sauvegarderMenu() {
    if (!menuText.trim()) return;
    setSavingMenu(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      if (menuDuJour) {
        await supabase.from('menu_jour').update({ menu: menuText.trim() }).eq('id', menuDuJour.id);
      } else {
        await supabase.from('menu_jour').insert({
          creche_id: profile.creche_id,
          menu: menuText.trim(),
          date: today
        });
      }
      Alert.alert('✅', t('menuSaved'));
      setModalMenu(false);
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
    setSavingMenu(false);
  }

  async function supprimerMenu() {
    await supabase.from('menu_jour').delete().eq('id', menuDuJour.id);
    setMenuDuJour(null);
    setMenuText('');
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
      await supabase.from('messages_parents').update({ lu: true }).eq('id', selectedConv.id);
      const newReply = {
        contenu: reponse.trim(),
        profiles: { prenom: profile?.prenom, nom: profile?.nom },
        created_at: new Date().toISOString()
      };
      setSelectedConv(prev => ({ ...prev, replies: [...(prev.replies || []), newReply] }));
      setReponse('');
      loadData();
    } catch (e) { Alert.alert(t('error'), e.message); }
    setSending(false);
  }

  const actifs = conversations.filter(c => !c.isArchived);
  const archives = conversations.filter(c => c.isArchived);
  const s = styles(theme);

  if (loading) return (
    <View style={s.center}><Text style={s.loadingText}>{t('loading')}</Text></View>
  );

  return (
    <View style={s.container} nativeID="tab-body">
      <View style={s.header}>
        <Text style={s.title}>{t('messages')}</Text>
      </View>

      <ScrollView
        style={s.scrollArea}
        refreshControl={Platform.OS === 'web' ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        <View style={s.menuSection}>
          <View style={s.menuHeader}>
            <Text style={s.menuTitle}>{t('menuOfDay')}</Text>
            <TouchableOpacity
              style={s.menuEditBtn}
              onPress={() => { setMenuText(menuDuJour?.menu || ''); setModalMenu(true); }}
            >
              <Text style={s.menuEditBtnText}>{menuDuJour ? '✏️' : '+'}</Text>
            </TouchableOpacity>
          </View>
          {menuDuJour ? (
            <View style={s.menuContent}>
              <Text style={s.menuText}>{menuDuJour.menu}</Text>
              <TouchableOpacity onPress={supprimerMenu}>
                <Text style={s.menuDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.menuEmpty} onPress={() => setModalMenu(true)}>
              <Text style={s.menuEmptyText}>{t('addMenu')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.separator}>
          <Text style={s.separatorText}>💬 {t('messages')}</Text>
        </View>

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
                  style={[s.convCard, !conv.lu && s.convCardUnread]}
                  onPress={() => { setSelectedConv(conv); setModalVisible(true); }}
                >
                  <View style={s.convHeader}>
                    <Text style={s.convParent}>
                      {conv.profiles?.prenom} {conv.profiles?.nom}
                      {conv.enfants ? ` — à propos de ${conv.enfants.prenom}` : ''}
                    </Text>
                    <Text style={s.convDate}>
                      {new Date(conv.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <Text style={s.convMessage} numberOfLines={2}>{conv.message}</Text>
                  {conv.replies?.length > 0 && (
                    <Text style={s.convReplies}>{conv.replies.length} réponse(s)</Text>
                  )}
                  {!conv.lu && <View style={s.unreadDot} />}
                </TouchableOpacity>
                <TouchableOpacity style={s.archiveBtn} onPress={() => archiverMessage(conv)}>
                  <Text style={s.archiveBtnText}>Archiver</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {archives.length > 0 && (
          <TouchableOpacity
            style={s.showArchivesBtn}
            onPress={() => setShowArchives(!showArchives)}
          >
            <Text style={s.showArchivesBtnText}>
              {showArchives ? '🔼 Cacher les archivés' : `🔽 Voir les archivés (${archives.length})`}
            </Text>
          </TouchableOpacity>
        )}

        {showArchives && archives.length > 0 && (
          <View style={s.list}>
            {archives.map(conv => (
              <View key={conv.id} style={s.convWrapper}>
                <TouchableOpacity
                  style={[s.convCard, s.convCardArchived]}
                  onPress={() => { setSelectedConv(conv); setModalVisible(true); }}
                >
                  <View style={s.convHeader}>
                    <Text style={s.convParent}>
                      {conv.profiles?.prenom} {conv.profiles?.nom}
                      {conv.enfants ? ` — à propos de ${conv.enfants.prenom}` : ''}
                    </Text>
                    <Text style={s.convDate}>
                      {new Date(conv.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <Text style={s.convMessage} numberOfLines={2}>{conv.message}</Text>
                  {conv.replies?.length > 0 && (
                    <Text style={s.convReplies}>{conv.replies.length} réponse(s)</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={s.desarchiveBtn} onPress={() => desarchiverMessage(conv)}>
                  <Text style={s.desarchiveBtnText}>Désarchiver</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <ModalWithKeyboard
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={`${selectedConv?.profiles?.prenom || ''} ${selectedConv?.profiles?.nom || ''}`}
      >
        <ScrollView style={s.convThread} nestedScrollEnabled>
          <View style={s.messageParent}>
            <Text style={s.messageParentName}>
              {selectedConv?.profiles?.prenom} {selectedConv?.profiles?.nom}
              {selectedConv?.enfants ? ` — à propos de ${selectedConv.enfants.prenom}` : ''}
            </Text>
            <Text style={s.messageParentText}>{selectedConv?.message}</Text>
            <Text style={s.messageDate}>
              {selectedConv && new Date(selectedConv.created_at).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          {(selectedConv?.replies || []).map((reply, i) => (
            <View key={i} style={s.messageReply}>
              <Text style={s.messageReplyName}>
                {reply.profiles?.prenom} {reply.profiles?.nom}
              </Text>
              <Text style={s.messageReplyText}>{reply.contenu}</Text>
              <Text style={s.messageDate}>
                {new Date(reply.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          ))}
        </ScrollView>
        <View style={s.replyContainer}>
          <TextInput
            style={s.replyInput}
            placeholder={t('writeReply')}
            placeholderTextColor={theme.placeholder}
            value={reponse}
            onChangeText={setReponse}
            multiline
            autoFocus
          />
          <TouchableOpacity style={s.sendBtn} onPress={envoyerReponse} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendBtnText}>→</Text>}
          </TouchableOpacity>
        </View>
      </ModalWithKeyboard>

      <ModalWithKeyboard
        visible={modalMenu}
        onClose={() => setModalMenu(false)}
        title={t('menuOfDay')}
      >
        <TextInput
          style={[s.input, { minHeight: 150, textAlignVertical: 'top' }]}
          placeholder="Ex: Entrée: Salade&#10;Plat: Poulet rôti&#10;Dessert: Compote"
          placeholderTextColor={theme.placeholder}
          value={menuText}
          onChangeText={setMenuText}
          multiline
          autoFocus
        />
        <TouchableOpacity
          style={[s.saveMenuBtn, !menuText.trim() && s.saveMenuBtnDisabled]}
          onPress={sauvegarderMenu}
          disabled={savingMenu || !menuText.trim()}
        >
          {savingMenu ? <ActivityIndicator color="#fff" /> : <Text style={s.saveMenuBtnText}>{t('saveMenu')}</Text>}
        </TouchableOpacity>
      </ModalWithKeyboard>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  scrollArea: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } : {}),
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  menuSection: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border
  },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  menuEditBtn: {
    backgroundColor: theme.primaryLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4
  },
  menuEditBtnText: { color: theme.primary, fontWeight: '600', fontSize: 16 },
  menuContent: {},
  menuText: { color: theme.textSecondary, fontSize: 14, lineHeight: 22 },
  menuDeleteText: { color: theme.danger, fontSize: 12, marginTop: 8 },
  menuEmpty: {
    backgroundColor: theme.background, borderRadius: 10,
    padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed'
  },
  menuEmptyText: { color: theme.textSecondary, fontSize: 13 },
  separator: { paddingHorizontal: 16, paddingVertical: 12 },
  separatorText: { color: theme.text, fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.3 },
  emptyText: { color: theme.textSecondary, fontSize: 15 },
  list: { paddingHorizontal: 16 },
  convWrapper: { marginBottom: 10 },
  convCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border
  },
  convCardUnread: { borderColor: theme.primary },
  convCardArchived: { opacity: 0.6 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  convParent: { color: theme.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  convDate: { color: theme.textSecondary, fontSize: 12 },
  convMessage: { color: theme.textSecondary, fontSize: 14 },
  convReplies: { color: theme.primary, fontSize: 12, marginTop: 8 },
  unreadDot: {
    position: 'absolute', top: 16, right: 16,
    width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary
  },
  archiveBtn: {
    backgroundColor: theme.border, borderRadius: 10,
    padding: 8, alignItems: 'center', marginTop: 4
  },
  archiveBtnText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  desarchiveBtn: {
    backgroundColor: theme.primaryLight, borderRadius: 10,
    padding: 8, alignItems: 'center', marginTop: 4
  },
  desarchiveBtnText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
  showArchivesBtn: {
    marginHorizontal: 16, marginBottom: 8,
    padding: 12, alignItems: 'center',
    backgroundColor: theme.card, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border
  },
  showArchivesBtnText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  convThread: { maxHeight: 250, marginBottom: 12 },
  messageParent: { backgroundColor: theme.background, borderRadius: 12, padding: 12, marginBottom: 8 },
  messageParentName: { color: theme.primary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  messageParentText: { color: theme.text, fontSize: 14 },
  messageDate: { color: theme.textSecondary, fontSize: 11, marginTop: 4 },
  messageReply: { backgroundColor: theme.primaryLight, borderRadius: 12, padding: 12, marginBottom: 8, marginLeft: 16 },
  messageReplyName: { color: theme.primary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  messageReplyText: { color: theme.text, fontSize: 14 },
  replyContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  replyInput: {
    flex: 1, backgroundColor: theme.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: theme.inputBorder, color: theme.text,
    fontSize: 15, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100
  },
  sendBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center'
  },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  input: {
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16
  },
  saveMenuBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveMenuBtnDisabled: { backgroundColor: theme.border },
  saveMenuBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});