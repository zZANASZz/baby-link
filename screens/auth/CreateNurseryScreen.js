import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Modal,
  Platform, ScrollView, ActivityIndicator
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

function SuccessModal({ visible, codePersonnel, codeParents, onContinue, theme }) {
  const [copied, setCopied] = useState('');

  async function copier(code, label) {
    await Clipboard.setStringAsync(code);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 4 }}>🎉 Crèche créée !</Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }}>Notez bien ces codes, vous en aurez besoin</Text>

          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 }}>Code personnel</Text>
          <TouchableOpacity
            onPress={() => copier(codePersonnel, 'personnel')}
            style={{ backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.primary, letterSpacing: 2 }}>{codePersonnel}</Text>
            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>{copied === 'personnel' ? '✓ Copié' : '📋 Copier'}</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 }}>Code parents</Text>
          <TouchableOpacity
            onPress={() => copier(codeParents, 'parents')}
            style={{ backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.primary, letterSpacing: 2 }}>{codeParents}</Text>
            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>{copied === 'parents' ? '✓ Copié' : '📋 Copier'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onContinue}
            style={{ backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>J'ai noté, continuer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function CreateNurseryScreen({ navigation }) {
  const { theme, isDark, toggleTheme, t } = useTheme();
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  async function refreshSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        });
      }
    } catch (e) { console.log('refresh session:', e); }
  }

  async function handleCreate() {
    setErrorMsg('');
    if (!nom.trim()) {
      setErrorMsg('Veuillez entrer un nom de crèche');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErrorMsg('Session expirée, reconnectez-vous.'); return; }

      const codePersonnel = Math.random().toString(36).substring(2, 8).toUpperCase();
      const codeParents = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: creche, error: errCreche } = await supabase
        .from('creches')
        .insert({
          nom: nom.trim(),
          adresse: adresse.trim() || null,
          code_invitation: codePersonnel,
          code_parents: codeParents
        })
        .select().single();

      if (errCreche) { setErrorMsg(errCreche.message); return; }

      const { error: errProfile } = await supabase
        .from('profiles')
        .update({ creche_id: creche.id, role: 'directrice' })
        .eq('id', user.id);

      if (errProfile) { setErrorMsg(errProfile.message); return; }

      // On rafraîchit la session TOUT DE SUITE, sans attendre une interaction
      // avec une alerte qui pourrait ne jamais s'afficher (PWA standalone).
      await refreshSession();

      setSuccessData({ codePersonnel, codeParents });
    } catch (e) {
      setErrorMsg(e.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  const s = styles(theme);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SuccessModal
        visible={!!successData}
        codePersonnel={successData?.codePersonnel}
        codeParents={successData?.codeParents}
        onContinue={() => setSuccessData(null)}
        theme={theme}
      />

      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{t('back')}</Text>
        </TouchableOpacity>

        <Text style={s.title}>{t('createNurseryTitle')}</Text>
        <Text style={s.subtitle}>{t('createNurserySubtitle')}</Text>

        <Text style={s.label}>{t('nurseryName')}</Text>
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder={t('nurseryNamePlaceholder')}
            placeholderTextColor={theme.placeholder}
            value={nom}
            onChangeText={setNom}
          />
        </View>

        <Text style={s.label}>{t('address')}</Text>
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder={t('addressPlaceholder')}
            placeholderTextColor={theme.placeholder}
            value={adresse}
            onChangeText={setAdresse}
          />
        </View>

        {errorMsg ? (
          <View style={{ backgroundColor: '#ffe5e5', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#c0392b', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[s.createBtn, (!nom.trim()) && s.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading || !nom.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.createBtnText}>{t('create')}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      <TouchableOpacity style={s.themeBtn} onPress={toggleTheme}>
        <Text style={s.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  inner: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: 32 },
  backText: { color: theme.text, fontSize: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: theme.textSecondary, marginBottom: 32 },
  label: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputContainer: {
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, marginBottom: 20, paddingHorizontal: 14
  },
  input: { color: theme.text, fontSize: 15, paddingVertical: 14 },
  createBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8
  },
  createBtnDisabled: { backgroundColor: theme.border },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  themeBtn: {
    position: 'absolute', bottom: 32, left: 24,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.card, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: theme.border
  },
  themeIcon: { fontSize: 18 },
});
