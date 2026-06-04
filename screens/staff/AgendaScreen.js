import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import ModalWithKeyboard from '../../components/ModalWithKeyboard';

const EVENT_TYPES = ['Fermeture', 'Sortie', 'Vaccination', 'Fête', 'Réunion', 'Autre'];

export default function AgendaScreen() {
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [profile, setProfile] = useState(null);
  const [titre, setTitre] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      if (prof?.creche_id) {
        const { data: evts } = await supabase
          .from('nursery_events')
          .select('*')
          .eq('creche_id', prof.creche_id)
          .order('date', { ascending: true });
        setEvents(evts || []);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function ajouterEvent() {
    if (!titre.trim() || !date.trim()) {
      Alert.alert('Erreur', 'Titre et date sont obligatoires');
      return;
    }
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('creche_id').eq('id', user.id).single();

      const { data: newEvent, error } = await supabase
        .from('nursery_events').insert({
          creche_id: prof.creche_id,
          titre: titre.trim(),
          type: type || 'Autre',
          date: date.trim(),
          description: description.trim() || null
        }).select().single();

      if (error) { Alert.alert('Erreur', error.message); setAdding(false); return; }

      setEvents(prev => [...prev, newEvent].sort((a, b) => a.date.localeCompare(b.date)));
      setModalVisible(false);
      setTitre(''); setType(''); setDate(''); setDescription('');
    } catch (e) { Alert.alert('Erreur', e.message); }
    setAdding(false);
  }

  async function supprimerEvent(event) {
    Alert.alert(
      'Supprimer',
      `Supprimer l'événement "${event.titre}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            await supabase.from('nursery_events').delete().eq('id', event.id);
            setEvents(prev => prev.filter(e => e.id !== event.id));
          }
        }
      ]
    );
  }

  const isDirectrice = profile?.role === 'directrice';
  const s = styles(theme);

  if (loading) return (
    <View style={s.center}>
      <Text style={s.loadingText}>Chargement...</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Agenda</Text>
        {isDirectrice && (
          <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={s.addBtnText}>+ Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {events.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyText}>Aucun événement</Text>
            {isDirectrice && (
              <Text style={s.emptySubtext}>Publiez des événements pour informer les parents</Text>
            )}
          </View>
        ) : (
          <View style={s.list}>
            {events.map(event => (
              <View key={event.id} style={s.eventCard}>
                <View style={s.eventLeft}>
                  <View style={s.eventDateBox}>
                    <Text style={s.eventDay}>
                      {new Date(event.date).toLocaleDateString('fr-FR', { day: '2-digit' })}
                    </Text>
                    <Text style={s.eventMonth}>
                      {new Date(event.date).toLocaleDateString('fr-FR', { month: 'short' })}
                    </Text>
                  </View>
                </View>
                <View style={s.eventRight}>
                  <Text style={s.eventTitre}>{event.titre}</Text>
                  {event.type && (
                    <View style={s.eventTypeBadge}>
                      <Text style={s.eventTypeText}>{event.type}</Text>
                    </View>
                  )}
                  {event.description && (
                    <Text style={s.eventDesc}>{event.description}</Text>
                  )}
                </View>
                {isDirectrice && (
                  <TouchableOpacity onPress={() => supprimerEvent(event)}>
                    <Text style={s.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <ModalWithKeyboard
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setTitre(''); setType(''); setDate(''); setDescription(''); }}
        title="Nouvel événement"
      >
        <Text style={s.inputLabel}>Titre</Text>
        <TextInput
          style={s.input}
          placeholder="Ex: Fermeture exceptionnelle"
          placeholderTextColor={theme.placeholder}
          value={titre}
          onChangeText={setTitre}
          autoFocus
        />

        <Text style={s.inputLabel}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {EVENT_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[s.typeChip, type === t && s.typeChipActive]}
              onPress={() => setType(t)}
            >
              <Text style={[s.typeChipText, type === t && s.typeChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.inputLabel}>Date</Text>
        <TextInput
          style={s.input}
          placeholder="jj-mm-aaaa"
          placeholderTextColor={theme.placeholder}
          value={date}
          onChangeText={setDate}
        />

        <Text style={s.inputLabel}>Description (optionnel)</Text>
        <TextInput
          style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Détails supplémentaires..."
          placeholderTextColor={theme.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity
          style={[s.modalBtn, (!titre.trim() || !date.trim()) && s.modalBtnDisabled]}
          onPress={ajouterEvent}
          disabled={adding || !titre.trim() || !date.trim()}
        >
          {adding ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.modalBtnText}>Créer l'événement</Text>
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
  addBtn: {
    backgroundColor: theme.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.3 },
  emptyText: { color: theme.textSecondary, fontSize: 15, marginBottom: 8 },
  emptySubtext: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  list: { padding: 16 },
  eventCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border
  },
  eventLeft: { marginRight: 14 },
  eventDateBox: {
    backgroundColor: theme.primaryLight, borderRadius: 10,
    padding: 8, alignItems: 'center', minWidth: 44
  },
  eventDay: { color: theme.primary, fontSize: 18, fontWeight: 'bold' },
  eventMonth: { color: theme.primary, fontSize: 11, textTransform: 'uppercase' },
  eventRight: { flex: 1 },
  eventTitre: { color: theme.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  eventTypeBadge: {
    backgroundColor: theme.primaryLight, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4
  },
  eventTypeText: { color: theme.primary, fontSize: 11, fontWeight: '600' },
  eventDesc: { color: theme.textSecondary, fontSize: 13 },
  deleteIcon: { fontSize: 18, padding: 4 },
  inputLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16
  },
  typeChip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.card, marginRight: 8
  },
  typeChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  typeChipText: { color: theme.textSecondary, fontSize: 13 },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },
  modalBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8
  },
  modalBtnDisabled: { backgroundColor: theme.border },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});