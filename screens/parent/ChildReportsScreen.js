import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../lib/useRealtime';

function StarDisplay({ value }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <Text key={star} style={{ fontSize: 16, opacity: star <= value ? 1 : 0.2 }}>⭐</Text>
      ))}
    </View>
  );
}

export default function ChildReportsScreen({ route, navigation }) {
  const { theme, t } = useTheme();
  const { enfant } = route.params;
  const [rapports, setRapports] = useState([]);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);
  useRealtime(['rapports', 'stock_mensuel'], loadData);

  function getMoisActuel() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function getMoisLabel() {
    return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase());
  }

  async function loadData() {
    try {
      const { data: raps } = await supabase
        .from('rapports')
        .select('*')
        .eq('enfant_id', enfant.id)
        .eq('brouillon', false)
        .order('date', { ascending: false })
        .limit(30);
      setRapports(raps || []);

      const mois = getMoisActuel();
      const { data: stockData } = await supabase
        .from('stock_mensuel')
        .select('*')
        .eq('enfant_id', enfant.id)
        .eq('mois', mois)
        .maybeSingle();
      setStock(stockData);
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  const today = new Date().toISOString().split('T')[0];
  const rapportAujourdhui = rapports.find(r => r.date === today);
  const anciens = rapports.filter(r => r.date !== today);

  function RapportCard({ rapport }) {
    return (
      <View style={s.rapportCard}>
        <Text style={s.rapportDate}>
          {new Date(rapport.date).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </Text>

        {(rapport.repas_midi_stars > 0 || rapport.repas_midi_note) && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('lunchMeal')}</Text>
            {rapport.repas_midi_stars > 0 && <StarDisplay value={rapport.repas_midi_stars} />}
            {rapport.repas_midi_note && <Text style={s.itemNote}>{rapport.repas_midi_note}</Text>}
          </View>
        )}

        {(rapport.repas_aprem_stars > 0 || rapport.repas_aprem_note) && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('afternoonMeal')}</Text>
            {rapport.repas_aprem_stars > 0 && <StarDisplay value={rapport.repas_aprem_stars} />}
            {rapport.repas_aprem_note && <Text style={s.itemNote}>{rapport.repas_aprem_note}</Text>}
          </View>
        )}

        {(rapport.humeur_stars > 0 || rapport.humeur_note) && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('mood')}</Text>
            {rapport.humeur_stars > 0 && <StarDisplay value={rapport.humeur_stars} />}
            {rapport.humeur_note && <Text style={s.itemNote}>{rapport.humeur_note}</Text>}
          </View>
        )}

        {(rapport.sieste_stars > 0 || rapport.sommeil) && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('nap')}</Text>
            {rapport.sieste_stars > 0 && <StarDisplay value={rapport.sieste_stars} />}
            {rapport.sommeil && <Text style={s.itemNote}>{rapport.sommeil}</Text>}
          </View>
        )}

        {rapport.sante && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('healthNotes')}</Text>
            <Text style={s.itemNote}>{rapport.sante}</Text>
          </View>
        )}

        {rapport.commentaire && (
          <View style={s.commentBox}>
            <Text style={s.commentText}>📝 {rapport.commentaire}</Text>
          </View>
        )}
      </View>
    );
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{t('back')}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{enfant.prenom} {enfant.nom}</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Rapport du jour */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('todayReport')}</Text>
          {rapportAujourdhui ? (
            <RapportCard rapport={rapportAujourdhui} />
          ) : (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>{t('noReportToday')}</Text>
            </View>
          )}
        </View>

        {/* Stock mensuel */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📦 Stock mensuel</Text>
          <Text style={s.moisLabel}>{getMoisLabel()}</Text>
          {stock ? (
            <View style={s.stockCard}>
              <View style={s.stockRow}>
                <Text style={s.stockEmoji}>🩲</Text>
                <Text style={s.stockLabel}>Langes</Text>
                <View style={s.stockBadge}>
                  <Text style={s.stockValue}>{stock.langes || 0}</Text>
                </View>
              </View>
              <View style={s.stockRow}>
                <Text style={s.stockEmoji}>🧻</Text>
                <Text style={s.stockLabel}>Lingettes</Text>
                <View style={s.stockBadge}>
                  <Text style={s.stockValue}>{stock.lingettes || 0}</Text>
                </View>
              </View>
              <View style={s.stockRow}>
                <Text style={s.stockEmoji}>🤧</Text>
                <Text style={s.stockLabel}>Mouchoirs</Text>
                <View style={s.stockBadge}>
                  <Text style={s.stockValue}>{stock.mouchoirs || 0}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>Aucun stock enregistré ce mois-ci</Text>
            </View>
          )}
        </View>

        {/* Historique */}
        {anciens.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('history')}</Text>
            {anciens.map(rapport => (
              <RapportCard key={rapport.id} rapport={rapport} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: { padding: 20, paddingTop: 60 },
  backText: { color: theme.text, fontSize: 15, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 4 },
  moisLabel: { fontSize: 13, color: theme.textSecondary, marginBottom: 12 },
  rapportCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border
  },
  rapportDate: { fontSize: 14, fontWeight: '600', color: theme.primary, marginBottom: 12 },
  itemSection: {
    marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border
  },
  itemTitle: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 6 },
  itemNote: { color: theme.textSecondary, fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  commentBox: {
    backgroundColor: theme.background, borderRadius: 10,
    padding: 10, borderLeftWidth: 3, borderLeftColor: theme.primary, marginTop: 4
  },
  commentText: { color: theme.textSecondary, fontSize: 13 },
  stockCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border
  },
  stockRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border
  },
  stockEmoji: { fontSize: 22, marginRight: 10 },
  stockLabel: { flex: 1, color: theme.text, fontSize: 15 },
  stockBadge: {
    backgroundColor: theme.primaryLight, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6
  },
  stockValue: { color: theme.primary, fontSize: 16, fontWeight: 'bold' },
  emptyCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border
  },
  emptyText: { color: theme.textSecondary, fontSize: 14 },
});