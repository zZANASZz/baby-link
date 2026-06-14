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
  const [dateNaissance, setDateNaissance] = useState('');
  const [section, setSection] = useState('petite');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [presences, setPresences] = useState({});
  const [rapportsDuJour, setRapportsDuJour] = useState({});

  useEffect(() => { loadData(); }, []);
  useRealtime(['enfants', 'presences_journalieres', 'rapports'], loadData);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);
      if (prof?.creche_id) {
        const { data: enf } = await supabase.from('enfants').select('*').eq('creche_id', prof.creche_id).order('prenom');
        setEnfants(enf || []);
        const today = new Date().toISOString().split('T')[0];
        const { data: presData } = await supabase.from('presences_journalieres').select('*').eq('date', today).in('enfant_id', (enf || []).map(e => e.id));
        const presMap = {};
        (presData || []).forEach(p => { presMap[p.enfant_id] = p.present; });
        // Par défaut tous les enfants sont absents
        (enf || []).forEach(e => {
          if (presMap[e.id] === undefined) presMap[e.id] = false;
        });
        setPresences(presMap);
        const { data: rapData } = await supabase.from('rapports').select('enfant_id, brouillon').eq('date', today).in('enfant_id', (enf || []).map(e => e.id));
        const rapMap = {};
        (rapData || []).forEach(r => { rapMap[r.enfant_id] = r.brouillon ? 'brouillon' : 'publie'; });
        setRapportsDuJour(rapMap);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function togglePresence(enfantId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const actuel = presences[enfantId];
      const nouvelEtat = actuel === true ? false : true;
      setPresences(prev => ({ ...prev, [enfantId]: nouvelEtat }));
      const { data: existing } = await supabase.from('presences_journalieres').select('id').eq('enfant_id', enfantId).eq('date', today).maybeSingle();
      if (existing) {
        await supabase.from('presences_journalieres').update({ present: nouvelEtat }).eq('id', existing.id);
      } else {
        await supabase.from('presences_journalieres').insert({ enfant_id: enfantId, date: today, present: nouvelEtat });
      }
    } catch (e) { console.log(e); }
  }

  function normaliserDate(input) {
    if (!input || !input.trim()) return null;
    const val = input.trim();
    if (val.includes('-') && val.split('-')[0].length === 4) return val;
    const sep = val.includes('/') ? '/' : '-';
    const parts = val.split(sep);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
  }

  async function ajouterEnfant() {
    if (!prenom.trim()) { Alert.alert(t('error'), 'Le prénom est obligatoire'); return; }
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('creche_id').eq('id', user.id).single();
      const codeEnfant = Math.random().toString(36).substring(2, 8).toUpperCase();
      const dateNorm = normaliserDate(dateNaissance);
      const { error } = await supabase.from('enfants').insert({
        prenom: prenom.trim(), nom: '', date_naissance: dateNorm,
        creche_id: prof.creche_id, code_enfant: codeEnfant, section,
      }).select().single();
      if (error) { Alert.alert(t('error'), error.message); setAdding(false); return; }
      Alert.alert('✅ Enfant ajouté !', `Code : ${codeEnfant}`, [
        { text: '📋 Copier', onPress: async () => await Clipboard.setStringAsync(codeEnfant) },
        { text: 'OK' }
      ]);
      setModalAdd(false);
      setPrenom(''); setDateNaissance(''); setSection('petite');
    } catch (e) { Alert.alert(t('error'), e.message); }
    setAdding(false);
  }

  async function supprimerEnfant(enfant) {
    await supabase.from('rapports').delete().eq('enfant_id', enfant.id);
    await supabase.from('enfants_parents').delete().eq('enfant_id', enfant.id);
    await supabase.from('photos_enfants').delete().eq('enfant_id', enfant.id);
    await supabase.from('presences_journalieres').delete().eq('enfant_id', enfant.id);
    await supabase.from('enfants').delete().eq('id', enfant.id);
    setEnfants(prev => prev.filter(e => e.id !== enfant.id));
  }

  async function copierCode(code) {
    await Clipboard.setStringAsync(code);
    Alert.alert('✅ Copié !', code);
  }

  const enfantsFiltres = enfants.filter(e => `${e.prenom} ${e.nom || ''}`.toLowerCase().includes(search.toLowerCase()));
  const petiteSection = enfantsFiltres.filter(e => e.section === 'petite' || !e.section);
  const grandeSection = enfantsFiltres.filter(e => e.section === 'grande');
  const totalPresents = Object.values(presences).filter(v => v === true).length;
  const totalAbsents = Object.values(presences).filter(v => v === false).length;
  const totalARapporter = enfants.filter(e => !rapportsDuJour[e.id]).length;
  const s = styles(theme);

  if (loading) return <View style={s.center}><ActivityIndicator color={theme.primary} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('children')}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalAdd(true)}>
          <Text style={s.addBtnText}>{t('addChild')}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput style={s.searchInput} placeholder={t('searchChild')} placeholderTextColor={theme.placeholder} value={search} onChangeText={setSearch} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={s.searchClear}>✕</Text></TouchableOpacity>}
      </View>

      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: theme.successLight }]}>
          <Text style={[s.statNum, { color: theme.success }]}>{totalPresents}</Text>
          <Text style={[s.statLabel, { color: theme.success }]}>Présents</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: theme.dangerLight }]}>
          <Text style={[s.statNum, { color: theme.danger }]}>{totalAbsents}</Text>
          <Text style={[s.statLabel, { color: theme.danger }]}>Absents</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: theme.warningLight }]}>
          <Text style={[s.statNum, { color: theme.warning }]}>{totalARapporter}</Text>
          <Text style={[s.statLabel, { color: theme.warning }]}>À rédiger</Text>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />} showsVerticalScrollIndicator={false}>
        {enfants.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyIcon}>👶</Text><Text style={s.emptyText}>{t('noChildren')}</Text></View>
        ) : (
          <View style={s.listContainer}>
            <SectionBlock
              titre={t('petiteSection')} sousTitre="0–18 mois"
              enfants={petiteSection} couleurPill={theme.petiteSection} couleurPillText={theme.petiteSectionText}
              presences={presences} rapportsDuJour={rapportsDuJour}
              onPressEnfant={(enfant) => navigation.navigate('WriteReport', { enfant })}
              onSupprimerEnfant={supprimerEnfant}
              onTogglePresence={togglePresence} theme={theme} t={t}
            />
            <SectionBlock
              titre={t('grandeSection')} sousTitre="18–36 mois"
              enfants={grandeSection} couleurPill={theme.grandeSection} couleurPillText={theme.grandeSectionText}
              presences={presences} rapportsDuJour={rapportsDuJour}
              onPressEnfant={(enfant) => navigation.navigate('WriteReport', { enfant })}
              onSupprimerEnfant={supprimerEnfant}
              onTogglePresence={togglePresence} theme={theme} t={t}
            />
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      <ModalWithKeyboard visible={modalAdd} onClose={() => { setModalAdd(false); setPrenom(''); setDateNaissance(''); setSection('petite'); }} title={t('addChildTitle')}>
        <Text style={s.inputLabel}>{t('firstName')} *</Text>
        <TextInput style={s.input} placeholder={t('firstName')} placeholderTextColor={theme.placeholder} value={prenom} onChangeText={setPrenom} autoFocus />
        <Text style={s.inputLabel}>Date de naissance (optionnel)</Text>
        <TextInput style={s.input} placeholder="Ex: 15-03-2024" placeholderTextColor={theme.placeholder} value={dateNaissance} onChangeText={setDateNaissance} keyboardType="numbers-and-punctuation" />
        <Text style={s.inputLabel}>Section</Text>
        <View style={s.sectionToggle}>
          <TouchableOpacity style={[s.sectionToggleBtn, section === 'petite' && { backgroundColor: theme.petiteSection, borderColor: theme.petiteSectionText }]} onPress={() => setSection('petite')}>
            <Text style={[s.sectionToggleBtnText, section === 'petite' && { color: theme.petiteSectionText, fontWeight: '700' }]}>👶 {t('petiteSection')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.sectionToggleBtn, section === 'grande' && { backgroundColor: theme.grandeSection, borderColor: theme.grandeSectionText }]} onPress={() => setSection('grande')}>
            <Text style={[s.sectionToggleBtnText, section === 'grande' && { color: theme.grandeSectionText, fontWeight: '700' }]}>🧒 {t('grandeSection')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[s.modalBtn, !prenom.trim() && s.modalBtnDisabled]} onPress={ajouterEnfant} disabled={adding || !prenom.trim()}>
          {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.modalBtnText}>{t('add')}</Text>}
        </TouchableOpacity>
      </ModalWithKeyboard>
    </View>
  );
}

function SectionBlock({ titre, sousTitre, enfants, couleurPill, couleurPillText, presences, rapportsDuJour, onPressEnfant, onSupprimerEnfant, onTogglePresence, theme, t }) {
  if (enfants.length === 0) return null;
  const [confirmingId, setConfirmingId] = useState(null);
  const presents = enfants.filter(e => presences[e.id] === true).length;
  const s = styles(theme);

  // Auto-reset du bouton supprimer après 3 secondes
  useEffect(() => {
    if (confirmingId) {
      const timer = setTimeout(() => setConfirmingId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmingId]);

  return (
    <View style={s.sectionBlock}>
      <View style={s.sectionHeader}>
        <View style={s.sectionHeaderLeft}>
          <View style={[s.sectionPill, { backgroundColor: couleurPill }]}>
            <Text style={[s.sectionPillText, { color: couleurPillText }]}>{sousTitre}</Text>
          </View>
          <Text style={s.sectionTitre}>{titre}</Text>
        </View>
        <Text style={s.sectionCount}>
          <Text style={{ color: theme.success }}>● {presents} </Text>
          <Text style={{ color: theme.textSecondary }}>/ {enfants.length}</Text>
        </Text>
      </View>

      {enfants.map((enfant, index) => {
        const isPresent = presences[enfant.id];
        const rapportStatus = rapportsDuJour[enfant.id];
        const isConfirming = confirmingId === enfant.id;

        return (
          <View key={enfant.id} style={[s.enfantRow, index === 0 && s.enfantRowFirst]}>
            <TouchableOpacity style={s.enfantLeft} onPress={() => onPressEnfant(enfant)} activeOpacity={0.7}>
              <Avatar enfant={enfant} size={40} />
              <View style={s.enfantInfo}>
                <Text style={s.enfantNom}>{enfant.prenom} {enfant.nom || ''}</Text>
                <Text style={s.enfantCode}>#{enfant.code_enfant}</Text>
              </View>
            </TouchableOpacity>

            <View style={s.enfantRight}>
              {rapportStatus === 'publie' && <View style={[s.badge, { backgroundColor: theme.successLight }]}><Text style={[s.badgeText, { color: theme.success }]}>✓</Text></View>}
              {rapportStatus === 'brouillon' && <View style={[s.badge, { backgroundColor: theme.primarySoft }]}><Text style={[s.badgeText, { color: theme.primary }]}>✎</Text></View>}

              <TouchableOpacity
                style={[s.presenceBadge,
                  isPresent === true && { backgroundColor: theme.successLight, borderColor: theme.success },
                  isPresent === false && { backgroundColor: theme.dangerLight, borderColor: theme.danger },
                ]}
                onPress={() => onTogglePresence(enfant.id)}
              >
                <Text style={[s.presenceBadgeText,
                  isPresent === true && { color: theme.success },
                  isPresent === false && { color: theme.danger },
                ]}>
                  {isPresent === true ? '✓ Présent' : '✗ Absent'}
                </Text>
              </TouchableOpacity>

              {/* Double tap pour supprimer — 1er tap = rouge, 2e tap = supprime */}
              <TouchableOpacity
                style={[s.deleteBtn, isConfirming && s.deleteBtnConfirm]}
                onPress={() => {
                  if (isConfirming) {
                    onSupprimerEnfant(enfant);
                    setConfirmingId(null);
                  } else {
                    setConfirmingId(enfant.id);
                  }
                }}
              >
                <Text style={[s.deleteBtnText, isConfirming && s.deleteBtnTextConfirm]}>
                  {isConfirming ? 'Oui ?' : '🗑️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: theme.text },
  addBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: theme.text, fontSize: 14, padding: 0 },
  searchClear: { color: theme.textSecondary, fontSize: 14, paddingLeft: 8 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  listContainer: { paddingHorizontal: 16, gap: 14 },
  sectionBlock: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  sectionPillText: { fontSize: 11, fontWeight: '700' },
  sectionTitre: { fontSize: 14, fontWeight: '700', color: theme.text },
  sectionCount: { fontSize: 13 },
  enfantRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
  enfantRowFirst: { borderTopWidth: 1, borderTopColor: theme.border },
  enfantLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  enfantInfo: { flex: 1, minWidth: 0 },
  enfantNom: { fontSize: 14, fontWeight: '600', color: theme.text },
  enfantCode: { fontSize: 11, color: theme.primary, marginTop: 2 },
  enfantRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  presenceBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  presenceBadgeText: { fontSize: 10, fontWeight: '700' },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  deleteBtnConfirm: { backgroundColor: '#e05c5c' },
  deleteBtnText: { fontSize: 16 },
  deleteBtnTextConfirm: { fontSize: 11, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: theme.textSecondary, fontSize: 15 },
  inputLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: theme.inputBg, borderRadius: 10, borderWidth: 1, borderColor: theme.inputBorder, color: theme.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  sectionToggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sectionToggleBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, paddingVertical: 12, alignItems: 'center' },
  sectionToggleBtnText: { fontSize: 13, color: theme.textSecondary },
  modalBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  modalBtnDisabled: { backgroundColor: theme.border },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
