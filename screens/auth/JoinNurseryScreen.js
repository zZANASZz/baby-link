import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function JoinNurseryScreen({ navigation }) {
  const { theme, isDark, toggleTheme, t } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!code.trim()) {
      Alert.alert(t('error'), 'Veuillez entrer un code');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const upperCode = code.trim().toUpperCase();

      const { data: crechePersonnel } = await supabase
        .from('creches')
        .select('id')
        .eq('code_invitation', upperCode)
        .single();

      if (crechePersonnel) {
        await supabase.from('profiles')
          .update({ creche_id: crechePersonnel.id, role: 'puericultrice' })
          .eq('id', user.id);
        Alert.alert('✅', 'Vous avez rejoint la crèche comme puéricultrice !');
        setLoading(false);
        return;
      }

      const { data: crecheParents } = await supabase
        .from('creches')
        .select('id')
        .eq('code_parents', upperCode)
        .single();

      if (crecheParents) {
        await supabase.from('profiles')
          .update({ creche_id: crecheParents.id, role: 'parent' })
          .eq('id', user.id);
        Alert.alert('✅', 'Vous avez rejoint la crèche comme parent !');
        setLoading(false);
        return;
      }

      Alert.alert(t('error'), 'Code invalide. Vérifiez le code fourni par la directrice.');
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