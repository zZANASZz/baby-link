import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function JoinNurseryScreen({ navigation }) {
  const { theme, isDark, toggleTheme, t } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  async function handleJoin() {
    setErrorMsg('');
    setSuccessMsg('');
    if (!code.trim()) {
      setErrorMsg('Veuillez entrer un code');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErrorMsg('Session expirée, reconnectez-vous.'); return; }

      const upperCode = code.trim().toUpperCase();

      const { data: crechePersonnel } = await supabase
        .from('creches')
        .select('id')
        .eq('code_invitation', upperCode)
        .maybeSingle();

      if (crechePersonnel) {
        const { error: errUpdate } = await supabase.from('profiles')
          .update({ creche_id: crechePersonnel.id, role: 'puericultrice' })
          .eq('id', user.id);

        if (errUpdate) { setErrorMsg(errUpdate.message); return; }

        // Rafraîchit la session immédiatement, sans attendre un clic sur
        // une alerte native qui ne s'affiche pas de façon fiable en PWA.
        await refreshSession();
        setSuccessMsg('✅ Vous avez rejoint la crèche comme puéricultrice !');
        return;
      }

      const { data: crecheParents } = await supabase
        .from('creches')
        .select('id')
        .eq('code_parents', upperCode)
        .maybeSingle();

      if (crecheParents) {
        const { error: errUpdate } = await supabase.from('profiles')
          .update({ creche_id: crecheParents.id, role: 'parent' })
          .eq('id', user.id);

        if (errUpdate) { setErrorMsg(errUpdate.message); return; }

        await refreshSession();
        setSuccessMsg('✅ Vous avez rejoint la crèche comme parent !');
        return;
      }

      setErrorMsg('Code invalide. Vérifiez le code fourni par la directrice.');
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
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{t('back')}</Text>
        </TouchableOpacity>

        <Text style={s.title}>{t('joinNurseryTitle')}</Text>
        <Text style={s.subtitle}>{t('joinNurserySubtitle')}</Text>

        <Text style={s.label}>{t('invitationCode')}</Text>
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder="Ex: ABC123"
            placeholderTextColor={theme.placeholder}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            textAlign="center"
          />
        </View>

        {errorMsg ? (
          <View style={{ backgroundColor: '#ffe5e5', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#c0392b', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={{ backgroundColor: '#e8f5e9', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#2e7d32', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{successMsg}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[s.joinBtn, !code.trim() && s.joinBtnDisabled]}
          onPress={handleJoin}
          disabled={loading || !code.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.joinBtnText}>{t('join')}</Text>
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
  input: { color: theme.text, fontSize: 18, paddingVertical: 14, letterSpacing: 4 },
  joinBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8
  },
  joinBtnDisabled: { backgroundColor: theme.border },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  themeBtn: {
    position: 'absolute', bottom: 32, left: 24,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.card, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: theme.border
  },
  themeIcon: { fontSize: 18 },
});
