import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, Pressable,
  ActivityIndicator, RefreshControl, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import Avatar from '../../components/Avatar';
import { useRealtime } from '../../lib/useRealtime';

export default function PhotosScreen() {
  const { theme, t } = useTheme();
  const [profile, setProfile] = useState(null);
  const [enfants, setEnfants] = useState([]);
  const [selectedEnfant, setSelectedEnfant] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalSource, setModalSource] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!modalSource && pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      setTimeout(() => {
        if (action === 'camera') pickFromCamera();
        else pickFromGallery();
      }, 500);
    }
  }, [modalSource, pendingAction]);

  useRealtime(['photos_enfants', 'enfants'], () => {
    if (selectedEnfant) loadPhotos(selectedEnfant.id);
    loadData();
  });

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      if (prof?.creche_id) {
        const { data: enf } = await supabase
          .from('enfants').select('*').eq('creche_id', prof.creche_id).order('prenom');
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

  useEffect(() => {
    if (selectedEnfant) loadPhotos(selectedEnfant.id);
  }, [selectedEnfant]);

  async function pickFromCamera() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "Activez l'accès caméra dans les réglages.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
      if (!result.canceled) await handleUpload(result.assets[0].uri);
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  async function pickFromGallery() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "Activez l'accès aux photos dans les réglages.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, quality: 0.7,
      });
      if (!result.canceled) await handleUpload(result.assets[0].uri);
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  async function handleUpload(uri) {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `${selectedEnfant.id}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('creche-photos').upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) { Alert.alert('Erreur upload', uploadError.message); setUploading(false); return; }

      const { data: { publicUrl } } = supabase.storage.from('creche-photos').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('photos_enfants').insert({
        enfant_id: selectedEnfant.id, url: publicUrl, uploaded_by: user.id
      });
      if (dbError) { Alert.alert(t('error'), dbError.message); setUploading(false); return; }

      Alert.alert('✅ Photo ajoutée !');
      await loadPhotos(selectedEnfant.id);
    } catch (e) { Alert.alert(t('error'), e.message); }
    setUploading(false);
  }

  function supprimerPhoto(photo) {
    Alert.alert('Supprimer', 'Supprimer cette photo ?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => {
          await supabase.from('photos_enfants').delete().eq('id', photo.id);
          setPhotos(prev => prev.filter(p => p.id !== photo.id));
        }
      }
    ]);
  }

  async function setAsAvatar(photo) {
    try {
      await supabase.from('enfants').update({ photo_url: photo.url }).eq('id', selectedEnfant.id);
      const updated = { ...selectedEnfant, photo_url: photo.url };
      setSelectedEnfant(updated);
      setEnfants(prev => prev.map(e => e.id === selectedEnfant.id ? updated : e));
      Alert.alert('✅ Avatar mis à jour !');
    } catch (e) { Alert.alert(t('error'), e.message); }
  }

  const s = styles(theme);

  if (loading) return (
    <View style={s.center}><Text style={s.loadingText}>{t('loading')}</Text></View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('photosTitle')}</Text>
        <TouchableOpacity
          style={s.uploadBtn}
          onPress={() => setModalSource(true)}
          disabled={uploading || !selectedEnfant}
        >
          {uploading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.uploadBtnText}>{t('addPhoto')}</Text>
          }
        </TouchableOpacity>
      </View>

      {enfants.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📸</Text>
          <Text style={s.emptyText}>Aucun enfant dans la crèche</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.enfantSelector}>
            {enfants.map(enfant => (
              <TouchableOpacity
                key={enfant.id}
                style={[s.enfantChip, selectedEnfant?.id === enfant.id && s.enfantChipActive]}
                onPress={() => setSelectedEnfant(enfant)}
              >
                <Avatar enfant={enfant} size={44} />
                <Text style={[s.enfantChipText, selectedEnfant?.id === enfant.id && s.enfantChipTextActive]}>
                  {enfant.prenom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          >
            {photos.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📸</Text>
                <Text style={s.emptyText}>{t('noPhotos')} pour {selectedEnfant?.prenom}</Text>
                <TouchableOpacity style={s.addPhotoBtn} onPress={() => setModalSource(true)}>
                  <Text style={s.addPhotoBtnText}>{t('addPhoto')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.photosGrid}>
                {photos.map(photo => (
                  <View key={photo.id} style={s.photoContainer}>
                    <Image source={{ uri: photo.url }} style={s.photo} />
                    <View style={s.photoActions}>
                      <Pressable
                        style={({ pressed }) => [s.avatarBtn, pressed && { opacity: 0.6 }]}
                        onPress={() => setAsAvatar(photo)}
                      >
                        <Text style={s.avatarBtnText}>{t('setAvatar')}</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [s.deletePhotoBtn, pressed && { opacity: 0.5 }]}
                        onPress={() => supprimerPhoto(photo)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Text style={s.deletePhotoBtnText}>🗑️</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}

      <Modal
        visible={modalSource}
        transparent
        animationType="slide"
        onRequestClose={() => setModalSource(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Ajouter une photo</Text>
            <TouchableOpacity
              style={s.sourceBtn}
              onPress={() => { setPendingAction('camera'); setModalSource(false); }}
            >
              <Text style={s.sourceBtnText}>{t('takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.sourceBtn}
              onPress={() => { setPendingAction('gallery'); setModalSource(false); }}
            >
              <Text style={s.sourceBtnText}>{t('choosePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalSource(false)}>
              <Text style={s.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: theme.text },
  uploadBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  enfantSelector: { paddingHorizontal: 16, marginBottom: 16, maxHeight: 80 },
  enfantChip: { alignItems: 'center', marginRight: 16, opacity: 0.5 },
  enfantChipActive: { opacity: 1 },
  enfantChipText: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  enfantChipTextActive: { color: theme.primary, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.3 },
  emptyText: { color: theme.textSecondary, fontSize: 15, marginBottom: 16 },
  addPhotoBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  addPhotoBtnText: { color: '#fff', fontWeight: '600' },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },
  photoContainer: { width: '47%', marginBottom: 8 },
  photo: { width: '100%', height: 160, borderRadius: 12 },
  photoActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6 },
  avatarBtn: { backgroundColor: theme.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  avatarBtnText: { color: theme.primary, fontSize: 12, fontWeight: '600' },
  deletePhotoBtn: { padding: 8 },
  deletePhotoBtnText: { fontSize: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.card, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 20, textAlign: 'center' },
  sourceBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  sourceBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelText: { textAlign: 'center', color: theme.textSecondary, marginTop: 8, fontSize: 14 },
});
