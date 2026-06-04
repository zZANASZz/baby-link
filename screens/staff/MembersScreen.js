import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, RefreshControl
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function MembersScreen({ navigation }) {
  const { theme } = useTheme();
  const [membres, setMembres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      if (prof?.creche_id) {
        const { data: mems } = await supabase
          .from('profiles').select('*')
          .eq('creche_id', prof.creche_id)
          .order('role');
        setMembres(mems || []);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function supprimerMembre(membre) {
    if (membre.id === profile?.id) {
      Alert.alert('Erreur', 'Vous ne pouvez pas vous supprimer vous-même.');
      return;
    }
    Alert.alert(
      '⚠️ Supprimer ce membre',
      `Êtes-vous sûr(e) de vouloir supprimer ${membre.prenom} ${membre.nom} de la crèche ?\n\nNous vous conseillons de renouveler le code ${membre.role === 'puericultrice' ? 'puéricultrice' : 'parents'} pour que ce membre ne puisse pas rejoindre à nouveau.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('enfants_parents').delete().eq('parent_id', membre.id);
              await supabase.from('profiles').delete().eq('id', membre.id);
              setMembres(prev => prev.filter(m => m.id !== membre.id));
              Alert.alert('✅ Membre supprimé', `${membre.prenom} a été retiré(e) de la crèche.\n\nPensez à renouveler vos codes dans Réglages.`);
            } catch (e) { Alert.alert('Erreur', e.message); }
          }
        }
      ]
    );
  }

  function getRoleIcon(role) {
    switch (role) {
      case 'directrice': return '👑';
      case 'puericultrice': return '🏥';
      case 'parent': return '👨‍👩‍👧';
      default: return '👤';
    }
  }

  function getRoleLabel(role) {
    switch (role) {
      case 'directrice': return 'Directrice';
      case 'puericultrice': return 'Puéricultrice';
      case 'parent': return 'Parent';
      default: return role;
    }
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Membres</Text>
        <Text style={s.count}>{membres.length} membres</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {membres.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyText}>Aucun membre</Text>
          </View>
        ) : (
          <View style={s.list}>
            {membres.map(membre => (
              <View key={membre.id} style={s.membreCard}>
                <View style={s.membreIconContainer}>
                  <Text style={s.membreIcon}>{getRoleIcon(membre.role)}</Text>
                </View>
                <View style={s.membreInfo}>
                  <Text style={s.membreNom}>{membre.prenom} {membre.nom}</Text>
                  <Text style={s.membreRole}>{getRoleLabel(membre.role)}</Text>
                </View>
                {membre.id !== profile?.id && membre.role !== 'directrice' && (
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => supprimerMembre(membre)}
                  >
                    <Text style={s.deleteBtnIcon}>🗑️</Text>
                  </TouchableOpacity>
                )}
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
  backText: { color: theme.text, fontSize: 15, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  count: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.3 },
  emptyText: { color: theme.textSecondary, fontSize: 15 },
  list: { padding: 16 },
  membreCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border
  },
  membreIconContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.primaryLight, justifyContent: 'center',
    alignItems: 'center', marginRight: 12
  },
  membreIcon: { fontSize: 22 },
  membreInfo: { flex: 1 },
  membreNom: { color: theme.text, fontSize: 15, fontWeight: '600' },
  membreRole: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteBtnIcon: { fontSize: 20 },
});