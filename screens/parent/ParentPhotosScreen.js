import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, RefreshControl, Platform
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import Avatar from '../../components/Avatar';
import { useRealtime } from '../../lib/useRealtime';

export default function ParentPhotosScreen() {
  const { theme, t } = useTheme();
  const [enfants, setEnfants] = useState([]);
  const [selectedEnfant, setSelectedEnfant] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);
  useRealtime(['photos_enfants', 'enfants'], () => {
    loadData();
    if (selectedEnfant) loadPhotos(selectedEnfant.id);
  });

  useEffect(() => {
    if (selectedEnfant) loadPhotos(selectedEnfant.id);
  }, [selectedEnfant]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: liens } = await supabase
        .from('enfants_parents').select('enfant_id').eq('parent_id', user.id);

      if (liens && liens.length > 0) {
        const ids = liens.map(l => l.enfant_id);
        const { data: enf } = await supabase
          .from('enfants').select('*').in('id', ids).order('prenom');
        setEnfants(enf || []);
        if (enf && enf.length > 0) {
          setSelectedEnfant(prev => {
            const updated = enf.find(e => e.id === prev?.id) || enf[0];
            return updated;
          });
        }
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }

  async function loadPhotos(enfantId) {
    try {
      const { data } = await supabase
        .from('photos_enfants').select('*')
        .eq('enfant_id', enfantId)
        .order('created_at', { ascending: false });
      setPhotos(data || []);
    } catch (e) { console.log(e); }
  }

  const s = styles(theme);

  if (loading) return (
    <View style={s.center}><Text style={s.loadingText}>{t('loading')}</Text></View>
  );

  return (
    <View style={s.container} nativeID="tab-body">
      <View style={s.header}>
        <Text style={s.title}>{t('photosTitle')}</Text>
      </View>

      {enfants.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📸</Text>
          <Text style={s.emptyText}>{t('noChildLinked')}</Text>
        </View>
      ) : (
        <>
          {/* Sélecteur enfant */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={s.enfantSelector}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {enfants.map(enfant => (
              <TouchableOpacity
                key={enfant.id}
                style={[s.enfantChip, selectedEnfant?.id === enfant.id && s.enfantChipActive]}
                onPress={() => setSelectedEnfant(enfant)}
              >
                <Avatar enfant={enfant} size={40} />
                <Text style={[s.enfantChipText, selectedEnfant?.id === enfant.id && s.enfantChipTextActive]}>
                  {enfant.prenom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            style={s.scrollArea}
            refreshControl={Platform.OS === 'web' ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
            showsVerticalScrollIndicator={false}
          >
            {photos.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📸</Text>
                <Text style={s.emptyText}>{t('noPhotos')} pour {selectedEnfant?.prenom}</Text>
              </View>
            ) : (
              <View style={s.photosGrid}>
                {photos.map(photo => (
                  <TouchableOpacity key={photo.id} style={s.photoContainer}>
                    <Image source={{ uri: photo.url }} style={s.photo} />
                    <Text style={s.photoDate}>
                      {new Date(photo.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </>
      )}
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
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: theme.text },

  enfantSelector: { marginBottom: 16, maxHeight: 80 },
  enfantChip: { alignItems: 'center', opacity: 0.5 },
  enfantChipActive: { opacity: 1 },
  enfantChipText: { color: theme.textSecondary, fontSize: 11, marginTop: 4 },
  enfantChipTextActive: { color: theme.primary, fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.3 },
  emptyText: { color: theme.textSecondary, fontSize: 15 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  photoContainer: { width: '47%' },
  photo: { width: '100%', height: 160, borderRadius: 12 },
  photoDate: { color: theme.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center' },
});
