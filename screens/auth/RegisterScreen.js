import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen({ navigation }) {
  const { theme, isDark, toggleTheme, t } = useTheme();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!nom || !prenom || !email || !password) {
      Alert.alert(t('error'), 'Veuillez remplir tous les champs');
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error'), 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom, prenom, role: 'staff' } }
    });
    if (error) {
      Alert.alert(t('error'), error.message);
    } else {
      Alert.alert(t('success'), 'Compte créé ! Vous pouvez vous connecter.');
      navigation.navigate('Login');
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

        <View style={s.logoContainer}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>🍼</Text>
          </View>
          <Text style={s.appName}>Baby-link</Text>
        </View>

        <Text style={s.title}>{t('createAccount')}</Text>
        <Text style={s.subtitle}>{t('joinApp')}</Text>

        <Text style={s.label}>{t('firstName')}</Text>
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder={t('firstName')}
            placeholderTextColor={theme.placeholder}
            value={prenom}
            onChangeText={setPrenom}
          />
        </View>

        <Text style={s.label}>{t('lastName')}</Text>
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder={t('lastName')}
            placeholderTextColor={theme.placeholder}
            value={nom}
            onChangeText={setNom}
          />
        </View>

        <Text style={s.label}>{t('email')}</Text>
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor={theme.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={s.label}>{t('password')}</Text>
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={theme.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={s.registerBtn} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.registerBtnText}>{t('createAccount')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={s.loginText}>
            {t('noAccount')}{' '}
            <Text style={s.loginLink}>{t('login')}</Text>
          </Text>
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
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#7c3aed', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 28, fontWeight: 'bold', color: theme.primary },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 32 },
  label: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputContainer: {
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, marginBottom: 16, paddingHorizontal: 14
  },
  input: { color: theme.text, fontSize: 15, paddingVertical: 14 },
  registerBtn: {
    backgroundColor: theme.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 24
  },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginText: { textAlign: 'center', color: theme.textSecondary, fontSize: 14 },
  loginLink: { color: theme.primary, fontWeight: 'bold' },
  themeBtn: {
    position: 'absolute', bottom: 32, left: 24,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.card, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: theme.border
  },
  themeIcon: { fontSize: 18 },
});