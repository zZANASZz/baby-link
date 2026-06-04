import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function ParentAgendaScreen() {
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('creche_id').eq('id', user.id).single();

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
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {events.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyText}>Aucun événement</Text>
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
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.3 },
  emptyText: { color: theme.textSecondary, fontSize: 15 },
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
    paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-start', marginBottom: 4
  },
  eventTypeText: { color: theme.primary, fontSize: 11, fontWeight: '600' },
  eventDesc: { color: theme.textSecondary, fontSize: 13 },
});