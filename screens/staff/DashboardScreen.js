import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Platform
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../lib/useRealtime';

export default function DashboardScreen({ navigation }) {
  const { theme, t } = useTheme();
  const [profile, setProfile] = useState(null);
  const [creche, setCreche] = useState(null);
  const [stats, setStats] = useState({ enfants: 0, rapports: 0, absents: 0, presents: 0 });
  const [rapportsDates, setRapportsDates] = useState({});
  const [totalEnfants, setTotalEnfants] = useState(0);
  const [enfantsARapporter, setEnfantsARapporter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => { loadData(); }, []);
  useRealtime(['rapports', 'enfants', 'messages_parents', 'profiles', 'presences_journalieres'], loadData);

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

        const { data: enfants } = await supabase
          .from('enfants').select('*').eq('creche_id', prof.creche_id);
        const enfantIds = (enfants || []).map(e => e.id);
        const nbEnfants = enfants?.length || 0;
        setTotalEnfants(nbEnfants);

        const today = new Date().toISOString().split('T')[0];

        const { data: rapportsAujourdhui } = await supabase
          .from('rapports').select('*').eq('date', today).eq('brouillon', false)
          .in('enfant_id', enfantIds);
        const rapportsDuJour = rapportsAujourdhui || [];

        const { data: presData } = await supabase
          .from('presences_journalieres')
          .select('*').eq('date', today)
          .in('enfant_id', enfantIds);
        const nbPresents = (presData || []).filter(p => p.present === true).length;
        const nbAbsents = nbEnfants - nbPresents;

        const rapportesIds = rapportsDuJour.map(r => r.enfant_id);
        const nonRaportes = (enfants || []).filter(e => !rapportesIds.includes(e.id));
        setEnfantsARapporter(nonRaportes);

        if (enfantIds.length > 0) {
          const { data: tousRapports } = await supabase
            .from('rapports').select('date, enfant_id')
            .in('enfant_id', enfantIds).eq('brouillon', false);

          const rapportsParDate = {};
          (tousRapports || []).forEach(r => {
            if (!rapportsParDate[r.date]) rapportsParDate[r.date] = new Set();
            rapportsParDate[r.date].add(r.enfant_id);
          });

          const counts = {};
          Object.keys(rapportsParDate).forEach(date => {
            counts[date] = rapportsParDate[date].size;
          });
          setRapportsDates(counts);
        }

        setStats({
          enfants: nbEnfants,
          rapports: rapportsDuJour.length,
          presents: nbPresents,
          absents: nbAbsents,
        });
      }
    } catch (e) { console.log('Erreur dashboard:', e); }
    setLoading(false);
    setRefreshing(false);
  }

  function getDaysInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirst; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }

  function formatMonthYear(date) {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase());
  }

  function formatToday() {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).replace(/^\w/, c => c.toUpperCase());
  }

  function getDayStatus(dateStr) {
    const count = rapportsDates[dateStr];
    if (!count) return 'none';
    if (count >= totalEnfants && totalEnfants > 0) return 'complete';
    return 'partial';
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const days = getDaysInMonth(currentMonth);
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const s = styles(theme);

  if (loading) return (
    <View style={s.center}>
      <Text style={s.loadingText}>{t('loading')}</Text>
    </View>
  );

  return (
    <ScrollView
      style={s.container}
      nativeID="tab-scroll"
      refreshControl={Platform.OS === 'web' ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.date}>{formatToday()}</Text>
          <Text style={s.creche}>{creche?.nom || 'Ma crèche'}</Text>
          <Text style={s.role}>
            {profile?.role === 'directrice' ? t('director') : t('nurseryWorker')}
          </Text>
        </View>
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>
            {profile?.prenom?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      </View>

      {/* Stats — enfants cliquable, reste juste compteurs */}
      <View style={s.statsGrid}>
        <TouchableOpacity
          style={[s.statCard, { backgroundColor: theme.cardStat1 }]}
          onPress={() => navigation.navigate('Children')}
          activeOpacity={0.7}
        >
          <Text style={s.statEmoji}>👶</Text>
          <Text style={[s.statNumber, { color: theme.primary }]}>{stats.enfants}</Text>
          <Text style={s.statLabel}>{t('children')}</Text>
        </TouchableOpacity>

        <View style={[s.statCard, { backgroundColor: theme.cardStat2 }]}>
          <Text style={s.statEmoji}>✓</Text>
          <Text style={[s.statNumber, { color: theme.success }]}>{stats.presents}</Text>
          <Text style={s.statLabel}>Présents</Text>
        </View>

        <View style={[s.statCard, { backgroundColor: theme.cardStat3 }]}>
          <Text style={s.statEmoji}>📋</Text>
          <Text style={[s.statNumber, { color: theme.warning }]}>{stats.rapports}</Text>
          <Text style={s.statLabel}>Rapports</Text>
        </View>

        <View style={[s.statCard, { backgroundColor: theme.dangerLight }]}>
          <Text style={s.statEmoji}>✗</Text>
          <Text style={[s.statNumber, { color: theme.danger }]}>{stats.absents}</Text>
          <Text style={s.statLabel}>Absents</Text>
        </View>
      </View>

      {/* Rapports à rédiger */}
      {enfantsARapporter.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{t('reportsToWrite')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Children')}>
              <Text style={s.seeAll}>{t('seeAll')}</Text>
            </TouchableOpacity>
          </View>
          {enfantsARapporter.slice(0, 4).map((enfant, index) => (
            <TouchableOpacity
              key={enfant.id}
              style={[s.enfantRow, index === 0 && { borderTopWidth: 0 }]}
              onPress={() => navigation.navigate('WriteReport', { enfant })}
            >
              <View style={[s.avatar, { backgroundColor: theme.primarySoft }]}>
                <Text style={[s.avatarText, { color: theme.primary }]}>
                  {enfant.prenom?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.enfantNom}>{enfant.prenom} {enfant.nom}</Text>
                <Text style={s.enfantSection}>
                  {enfant.section === 'grande' ? t('grandeSection') : t('petiteSection')}
                </Text>
              </View>
              <View style={[s.todoTag, { backgroundColor: theme.warningLight }]}>
                <Text style={[s.todoTagText, { color: theme.warning }]}>À rédiger</Text>
              </View>
            </TouchableOpacity>
          ))}
          {enfantsARapporter.length > 4 && (
            <TouchableOpacity
              style={s.voirPlusBtn}
              onPress={() => navigation.navigate('Children')}
            >
              <Text style={s.voirPlusText}>+{enfantsARapporter.length - 4} autres enfants →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Calendrier */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('reportCalendar')}</Text>

        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: theme.success }]} />
            <Text style={s.legendText}>{t('allReports')}</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: theme.warning }]} />
            <Text style={s.legendText}>{t('partialReports')}</Text>
          </View>
        </View>

        <View style={s.calendarHeader}>
          <TouchableOpacity onPress={() => {
            const d = new Date(currentMonth);
            d.setMonth(d.getMonth() - 1);
            setCurrentMonth(d);
          }}>
            <Text style={s.calNavBtn}>‹</Text>
          </TouchableOpacity>
          <Text style={s.calMonth}>{formatMonthYear(currentMonth)}</Text>
          <TouchableOpacity onPress={() => {
            const d = new Date(currentMonth);
            d.setMonth(d.getMonth() + 1);
            setCurrentMonth(d);
          }}>
            <Text style={s.calNavBtn}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={s.weekDays}>
          {weekDays.map((d, i) => (
            <Text key={i} style={s.weekDay}>{d}</Text>
          ))}
        </View>

        <View style={s.daysGrid}>
          {days.map((day, i) => {
            if (!day) return <View key={i} style={s.emptyDay} />;
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const status = getDayStatus(dateStr);
            return (
              <View key={i} style={s.dayContainer}>
                <View style={[s.day, isToday && { backgroundColor: theme.primary }]}>
                  <Text style={[s.dayText, isToday && { color: '#fff', fontWeight: '700' }]}>{day}</Text>
                </View>
                {status === 'complete' && <View style={[s.statusDot, { backgroundColor: theme.success }]} />}
                {status === 'partial' && <View style={[s.statusDot, { backgroundColor: theme.warning }]} />}
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    ...(Platform.OS === 'web' ? { minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } : {}),
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16,
  },
  date: { fontSize: 12, color: theme.textSecondary, marginBottom: 2 },
  creche: { fontSize: 22, fontWeight: '700', color: theme.text },
  role: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { fontSize: 16, fontWeight: '700', color: theme.primary },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10, marginBottom: 6,
  },
  statCard: {
    width: '47%', borderRadius: 16, padding: 16,
    alignItems: 'center', minHeight: 100,
  },
  statEmoji: { fontSize: 22, marginBottom: 6 },
  statNumber: { fontSize: 28, fontWeight: '700', lineHeight: 32 },
  statLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 3, fontWeight: '500' },
  section: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: theme.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: theme.border,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
  seeAll: { fontSize: 12, color: theme.primary, fontWeight: '600' },
  enfantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  enfantNom: { fontSize: 14, fontWeight: '600', color: theme.text },
  enfantSection: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
  todoTag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  todoTagText: { fontSize: 10, fontWeight: '700' },
  voirPlusBtn: { paddingTop: 10, alignItems: 'center' },
  voirPlusText: { fontSize: 13, color: theme.primary, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: theme.textSecondary, fontSize: 11 },
  calendarHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  calNavBtn: { color: theme.text, fontSize: 26, paddingHorizontal: 8, fontWeight: '300' },
  calMonth: { fontSize: 15, fontWeight: '600', color: theme.text },
  weekDays: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center', color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayContainer: { width: '14.28%', alignItems: 'center', marginBottom: 6 },
  emptyDay: { width: '14.28%' },
  day: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  dayText: { color: theme.text, fontSize: 12 },
  statusDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});
