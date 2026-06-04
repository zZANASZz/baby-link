import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function CreateNurseryScreen({ navigation }) {
  const { theme, isDark, toggleTheme, t } = useTheme();
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!nom.trim()) {
      Alert.alert(t('error'), 'Veuillez entrer un nom de crèche');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

      if (errCreche) { Alert.alert(t('error'), errCreche.message); setLoading(false); return; }

      const { error: errProfile } = await supabase
        .from('profiles')
        .update({ creche_id: creche.id, role: 'directrice' })
        .eq('id', user.id);

      if (errProfile) { Alert.alert(t('error'), errProfile.message); setLoading(false); return; }

      Alert.alert(
        '🎉 Crèche créée !',
        `Code personnel :\n${codePersonnel}\n\nCode parents :\n${codeParents}\n\nNotez ces codes !`,
        [
          {
            text: 'OK',
            onPress: async () => {
              const { data: { session } } = await supabase.auth.getSession();
              await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token
              });
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert(t('error'), e.message);
    }
    setLoading(false);
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