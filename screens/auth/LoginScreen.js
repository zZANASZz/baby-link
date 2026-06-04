import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function LoginScreen({ navigation }) {
  const { theme, isDark, toggleTheme, t } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert(t('error'), 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert(t('error'), error.message);
    setLoading(false);
  }

  const s = styles(theme);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoContainer}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>🍼</Text>
          </View>
          <Text style={s.appName}>Baby-link</Text>
        </View>

        <Text style={s.title}>{t('welcomeBack')}</Text>
        <Text style={s.subtitle}>{t('loginSubtitle')}</Text>

        {/* Email */}
        <Text style={s.label}>{t('email')}</Text>
        <View style={s.inputContainer}>
          <Text style={s.inputIcon}>✉</Text>
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

        {/* Password */}
        <View style={s.passwordHeader}>
          <Text style={s.label}>{t('password')}</Text>
          <TouchableOpacity>
            <Text style={s.forgotText}>{t('forgotPassword')}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.inputContainer}>
          <Text style={s.inputIcon}>🔒</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={theme.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity style={s.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.loginBtnText}>{t('login')}</Text>
          )}
        </TouchableOpacity>

        {/* Register Link */}
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={s.registerText}>
            {t('noAccount')}{' '}
            <Text style={s.registerLink}>{t('createOne')}</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Theme Toggle */}
      <TouchableOpacity style={s.themeBtn} onPress={toggleTheme}>
        <Text style={s.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  inner: { padding: 24, paddingTop: 80, paddingBottom: 40 },
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, marginBottom: 16, paddingHorizontal: 14
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: theme.text, fontSize: 15, paddingVertical: 14 },
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgotText: { color: theme.primary, fontSize: 13, marginBottom: 8 },
  loginBtn: {
    backgroundColor: theme.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 24,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  registerText: { textAlign: 'center', color: theme.textSecondary, fontSize: 14 },
  registerLink: { color: theme.primary, fontWeight: 'bold' },
  themeBtn: {
    position: 'absolute', bottom: 32, left: 24,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.card, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: theme.border
  },
  themeIcon: { fontSize: 18 },
});