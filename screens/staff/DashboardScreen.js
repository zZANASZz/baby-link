import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../lib/useRealtime';

export default function DashboardScreen({ navigation }) {
  const { theme, t } = useTheme();
  const [profile, setProfile] = useState(null);
  const [creche, setCreche] = useState(null);
  const [stats, setStats] = useState({ enfants: 0, rapports: 0, messages: 0, membres: 0 });
  const [rapportsDates, setRapportsDates] = useState({});
  const [totalEnfants, setTotalEnfants] = useState(0);
  const [enfantsARapporter, setEnfantsARapporter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => { loadData(); }, []);
  useRealtime(['rapports', 'enfants', 'messages_parents', 'profiles'], loadData);

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
          .from('rapports').select('*').eq('date', today).eq('brouillon', false);

        const rapportsDuJour = (rapportsAujourdhui || []).filter(r =>
          enfantIds.includes(r.enfant_id)
        );

        const { data: parentsDeLaCreche } = await supabase
          .from('profiles').select('id')
          .eq('creche_id', prof.creche_id).eq('role', 'parent');
        const parentIds = (parentsDeLaCreche || []).map(p => p.id);

        let messagesNonLus = 0;
        if (parentIds.length > 0) {
          const { data: msgs } = await supabase
            .from('messages_parents').select('id')
            .in('parent_id', parentIds).eq('lu', false);
          messagesNonLus = msgs?.length || 0;
        }

        const { data: membres } = await supabase
          .from('profiles').select('id').eq('creche_id', prof.creche_id);

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
          messages: messagesNonLus,
          membres: membres?.length || 0,
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
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const s = styles(theme);

  if (loading) return (
    <View style={s.center}>
      <Text style={s.loadingText}>{t('loading')}</Text>
    </View>
  );

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      <View style={s.header}>
        <Text style={s.date}>{formatToday()}</Text>
        <Text style={s.creche}>{creche?.nom || 'Ma crèche'}</Text>
        <Text style={s.role}>
          {profile?.role === 'directrice' ? t('director') : t('nurseryWorker')}
        </Text>
      </View>

      <View style={s.statsGrid}>
        <TouchableOpacity
          style={[s.statCard, { backgroundColor: theme.cardStat1 }]}
          onPress={() => navigation.navigate('Children')}
        >
          <View style={[s.statIcon, { backgroundColor: theme.primary + '30' }]}>
            <Text style={s.statEmoji}>👶</Text>
          </View>
          <Text style={s.statNumber}>{stats.enfants}</Text>
          <Text style={s.statLabel}>{t('children')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.statCard, { backgroundColor: theme.cardStat2 }]}
          onPress={() => navigation.navigate('Children')}
        >
          <View style={[s.statIcon, { backgroundColor: '#10b98130' }]}>
            <Text style={s.statEmoji}>📋</Text>
          </View>
          <Text style={s.statNumber}>{stats.rapports}</Text>
          <Text style={s.statLabel}>Rapports du jour</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.statCard, { backgroundColor: theme.cardStat3 }]}
          onPress={() => navigation.navigate('Messages')}
        >
          <View style={[s.statIcon, { backgroundColor: '#f59e0b30' }]}>
            <Text style={s.statEmoji}>💬</Text>
          </View>
          <Text style={s.statNumber}>{stats.messages}</Text>
          <Text style={s.statLabel}>Messages non lus</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.statCard, { backgroundColor: theme.cardStat4 }]}
          onPress={() => navigation.navigate('Members')}
        >
          <View style={[s.statIcon, { backgroundColor: '#ec489930' }]}>
            <Text style={s.statEmoji}>👥</Text>
          </View>
          <Text style={s.statNumber}>{stats.membres}</Text>
          <Text style={s.statLabel}>{t('membersTitle')}</Text>
        </TouchableOpacity>
      </View>

      {enfantsARapporter.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{t('reportsToWrite')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Children')}>
              <Text style={s.seeAll}>{t('seeAll')}</Text>
            </TouchableOpacity>
          </View>
          {enfantsARapporter.slice(0, 3).map(enfant => (
            <TouchableOpacity
              key={enfant.id}
              style={s.enfantRow}
              onPress={() => navigation.navigate('Children')}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>{enfant.prenom?.charAt(0).toLowerCase()}</Text>
              </View>
              <Text style={s.enfantNom}>{enfant.prenom} {enfant.nom}</Text>
              <Text style={s.plusIcon}>+</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('reportCalendar')}</Text>

        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={s.legendText}>{t('allReports')}</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#f59e0b' }]} />
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
          {weekDays.map(d => (
            <Text key={d} style={s.weekDay}>{d}</Text>
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
                <View style={[s.day, isToday && s.dayToday]}>
                  <Text style={[s.dayText, isToday && s.dayTodayText]}>{day}</Text>
                </View>
                {status === 'complete' && <View style={[s.statusDot, { backgroundColor: '#10b981' }]} />}
                {status === 'partial' && <View style={[s.statusDot, { backgroundColor: '#f59e0b' }]} />}
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: { padding: 20, paddingTop: 60 },
  date: { fontSize: 13, color: theme.textSecondary, marginBottom: 4 },
  creche: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  role: { fontSize: 14, color: theme.textSecondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, minHeight: 110, justifyContent: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statEmoji: { fontSize: 20 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: theme.text },
  statLabel: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  section: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: theme.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: theme.border
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 12 },
  seeAll: { fontSize: 13, color: theme.primary },
  enfantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
  enfantNom: { flex: 1, color: theme.text, fontSize: 15 },
  plusIcon: { color: theme.primary, fontSize: 20, fontWeight: 'bold' },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: theme.textSecondary, fontSize: 11 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calNavBtn: { color: theme.text, fontSize: 24, paddingHorizontal: 8 },
  calMonth: { fontSize: 16, fontWeight: '600', color: theme.text },
  weekDays: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', color: theme.textSecondary, fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayContainer: { width: '14.28%', alignItems: 'center', marginBottom: 8 },
  emptyDay: { width: '14.28%' },
  day: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayToday: { backgroundColor: theme.text },
  dayText: { color: theme.text, fontSize: 13 },
  dayTodayText: { color: theme.background, fontWeight: 'bold' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
});