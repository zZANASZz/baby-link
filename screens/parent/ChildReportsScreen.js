import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Platform
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../lib/useRealtime';

const HUMEUR_MAP = {
  super: { emoji: '😄', label: 'Super', color: '#5caa8a' },
  bien: { emoji: '🙂', label: 'Bien', color: '#5b8fcf' },
  neutre: { emoji: '😐', label: 'Neutre', color: '#7a8fa8' },
  difficile: { emoji: '😢', label: 'Difficile', color: '#e05c5c' },
};

export default function ChildReportsScreen({ route, navigation }) {
  const { theme, t } = useTheme();
  const { enfant } = route.params;
  const isBebe = enfant.section === 'petite' || !enfant.section;
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
        .from('rapports').select('*')
        .eq('enfant_id', enfant.id).eq('brouillon', false)
        .order('date', { ascending: false }).limit(30);
      setRapports(raps || []);

      const mois = getMoisActuel();
      const { data: stockData } = await supabase
        .from('stock_mensuel').select('*')
        .eq('enfant_id', enfant.id).eq('mois', mois).maybeSingle();
      setStock(stockData);
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  const today = new Date().toISOString().split('T')[0];
  const rapportAujourdhui = rapports.find(r => r.date === today);
  const anciens = rapports.filter(r => r.date !== today);

  function RapportCard({ rapport }) {
    const humeurInfo = rapport.humeur ? HUMEUR_MAP[rapport.humeur] : null;
    let repasBebe = null;
    let siestesBebe = null;

    try {
      if (rapport.repas_bebe) repasBebe = JSON.parse(rapport.repas_bebe);
      if (rapport.siestes_bebe) siestesBebe = JSON.parse(rapport.siestes_bebe);
    } catch (e) {}

    return (
      <View style={s.rapportCard}>
        <Text style={s.rapportDate}>
          {new Date(rapport.date + 'T12:00:00').toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long'
          }).replace(/^\w/, c => c.toUpperCase())}
        </Text>

        {/* Humeur */}
        {humeurInfo && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('mood')}</Text>
            <View style={[s.humeurBadge, { backgroundColor: humeurInfo.color + '20' }]}>
              <Text style={s.humeurEmoji}>{humeurInfo.emoji}</Text>
              <Text style={[s.humeurLabel, { color: humeurInfo.color }]}>{humeurInfo.label}</Text>
            </View>
            {rapport.humeur_note && <Text style={s.itemNote}>{rapport.humeur_note}</Text>}
          </View>
        )}

        {/* Repas grands */}
        {!isBebe && (rapport.repas_midi_stars || rapport.repas_midi_note) && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('lunchMeal')}</Text>
            {rapport.repas_midi_stars && (
              <View style={[s.quantiteBadge, { backgroundColor: theme.successLight }]}>
                <Text style={[s.quantiteText, { color: theme.success }]}>{rapport.repas_midi_stars}</Text>
              </View>
            )}
            {rapport.repas_midi_note && <Text style={s.itemNote}>{rapport.repas_midi_note}</Text>}
          </View>
        )}

        {!isBebe && (rapport.repas_aprem_stars || rapport.repas_aprem_note) && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('afternoonMeal')}</Text>
            {rapport.repas_aprem_stars && (
              <View style={[s.quantiteBadge, { backgroundColor: theme.successLight }]}>
                <Text style={[s.quantiteText, { color: theme.success }]}>{rapport.repas_aprem_stars}</Text>
              </View>
            )}
            {rapport.repas_aprem_note && <Text style={s.itemNote}>{rapport.repas_aprem_note}</Text>}
          </View>
        )}

        {/* Sieste grands */}
        {!isBebe && (rapport.sieste_debut || rapport.sommeil) && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('nap')}</Text>
            {rapport.sieste_debut && (
              <View style={[s.siesteBadge, { backgroundColor: theme.primarySoft }]}>
                <Text style={[s.siesteTime, { color: theme.primary }]}>
                  {rapport.sieste_debut}{rapport.sieste_fin ? ` → ${rapport.sieste_fin}` : ''}
                </Text>
              </View>
            )}
            {rapport.sommeil && <Text style={s.itemNote}>{rapport.sommeil}</Text>}
          </View>
        )}

        {/* Repas bébé */}
        {isBebe && repasBebe && repasBebe.length > 0 && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>🍼 Repas ({repasBebe.length})</Text>
            {repasBebe.map((r, i) => (
              <View key={i} style={s.bebeItem}>
                <View style={s.bebeItemHeader}>
                  {r.heure ? <Text style={s.bebeItemTime}>{r.heure}</Text> : null}
                  <View style={[s.typeBadge, { backgroundColor: theme.primarySoft }]}>
                    <Text style={[s.typeBadgeText, { color: theme.primary }]}>{r.type}</Text>
                  </View>
                  {r.quantite ? <Text style={s.bebeItemQty}>{r.quantite} ml</Text> : null}
                </View>
                {r.note ? <Text style={s.itemNote}>{r.note}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* Siestes bébé */}
        {isBebe && siestesBebe && siestesBebe.length > 0 && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>😴 Siestes ({siestesBebe.length})</Text>
            {siestesBebe.map((si, i) => (
              <View key={i} style={s.bebeItem}>
                {(si.debut || si.fin) && (
                  <View style={[s.siesteBadge, { backgroundColor: theme.primarySoft }]}>
                    <Text style={[s.siesteTime, { color: theme.primary }]}>
                      {si.debut || '?'} → {si.fin || '?'}
                    </Text>
                  </View>
                )}
                {si.note ? <Text style={s.itemNote}>{si.note}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* Santé */}
        {rapport.sante && (
          <View style={s.itemSection}>
            <Text style={s.itemTitle}>{t('healthNotes')}</Text>
            <Text style={s.itemNote}>{rapport.sante}</Text>
          </View>
        )}

        {/* Notes générales */}
        {rapport.commentaire && (
          <View style={s.commentBox}>
            <Text style={s.commentTitle}>📝 {t('generalNotes')}</Text>
            <Text style={s.commentText}>{rapport.commentaire}</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.title}>{enfant.prenom} {enfant.nom}</Text>
          <View style={[s.sectionTag, {
            backgroundColor: isBebe ? theme.petiteSection : theme.grandeSection,
          }]}>
            <Text style={[s.sectionTagText, {
              color: isBebe ? theme.petiteSectionText : theme.grandeSectionText,
            }]}>
              {isBebe ? t('petiteSection') : t('grandeSection')}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={Platform.OS === 'web' ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        showsVerticalScrollIndicator={false}
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
              {[
                { emoji: '🩲', label: 'Langes', value: stock.langes },
                { emoji: '🧻', label: 'Lingettes', value: stock.lingettes },
                { emoji: '🤧', label: 'Mouchoirs', value: stock.mouchoirs },
              ].map((item, i) => (
                <View key={i} style={[s.stockRow, i === 2 && { borderBottomWidth: 0, marginBottom: 0 }]}>
                  <Text style={s.stockEmoji}>{item.emoji}</Text>
                  <Text style={s.stockLabel}>{item.label}</Text>
                  <View style={[s.stockBadge, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[s.stockValue, { color: theme.primary }]}>{item.value || 0}</Text>
                  </View>
                </View>
              ))}
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

  header: {
    backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border,
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: theme.primary, fontSize: 14, fontWeight: '600' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: theme.text },
  sectionTag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  sectionTagText: { fontSize: 11, fontWeight: '700' },

  section: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 4 },
  moisLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 12 },

  rapportCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  rapportDate: { fontSize: 13, fontWeight: '700', color: theme.primary, marginBottom: 14 },

  itemSection: {
    marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  itemTitle: { fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8 },
  itemNote: { color: theme.textSecondary, fontSize: 13, marginTop: 6, fontStyle: 'italic' },

  humeurBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start',
  },
  humeurEmoji: { fontSize: 18 },
  humeurLabel: { fontSize: 13, fontWeight: '700' },

  quantiteBadge: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start',
  },
  quantiteText: { fontSize: 12, fontWeight: '700' },

  siesteBadge: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start',
  },
  siesteTime: { fontSize: 13, fontWeight: '700' },

  bebeItem: {
    backgroundColor: theme.background, borderRadius: 10,
    padding: 10, marginBottom: 6, borderWidth: 1, borderColor: theme.border,
  },
  bebeItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  bebeItemTime: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
  bebeItemQty: { fontSize: 12, color: theme.text, fontWeight: '600' },
  typeBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  commentBox: {
    backgroundColor: theme.background, borderRadius: 10,
    padding: 12, borderLeftWidth: 3, borderLeftColor: theme.primary, marginTop: 4,
  },
  commentTitle: { fontSize: 12, fontWeight: '700', color: theme.text, marginBottom: 4 },
  commentText: { color: theme.textSecondary, fontSize: 13 },

  stockCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  stockRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  stockEmoji: { fontSize: 20, marginRight: 10 },
  stockLabel: { flex: 1, color: theme.text, fontSize: 14, fontWeight: '500' },
  stockBadge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  stockValue: { fontSize: 15, fontWeight: '700' },

  emptyCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
  },
  emptyText: { color: theme.textSecondary, fontSize: 14 },
});
