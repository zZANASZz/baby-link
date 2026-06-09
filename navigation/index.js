import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { ThemeContext, colors, translations } from '../lib/theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import CreateNurseryScreen from '../screens/auth/CreateNurseryScreen';
import JoinNurseryScreen from '../screens/auth/JoinNurseryScreen';

// Staff Screens
import StaffTabs from '../screens/staff/StaffTabs';
import WriteReportScreen from '../screens/staff/WriteReportScreen';
import MembersScreen from '../screens/staff/MembersScreen';

// Parent Screens
import ParentTabs from '../screens/parent/ParentTabs';
import ChildReportsScreen from '../screens/parent/ChildReportsScreen';
import ParentMessagesScreen from '../screens/parent/ParentMessagesScreen';
import ParentAgendaScreen from '../screens/parent/ParentAgendaScreen';
import ParentSettingsScreen from '../screens/parent/ParentSettingsScreen';

const Stack = createStackNavigator();

export default function Navigation() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState('fr');

  const toggleTheme = () => setIsDark(prev => !prev);
  const theme = isDark ? colors.dark : colors.light;
  const t = (key) => translations[language]?.[key] || translations['fr']?.[key] || key;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`
      }, (payload) => {
        setProfile(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  }

  if (loading) return null;

  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: colors.light.background }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme, language, setLanguage, t }}>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="CreateNursery" component={CreateNurseryScreen} />
              <Stack.Screen name="JoinNursery" component={JoinNurseryScreen} />
            </>
          ) : !profile?.creche_id && profile?.role !== 'parent' ? (
            <>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="CreateNursery" component={CreateNurseryScreen} />
              <Stack.Screen name="JoinNursery" component={JoinNurseryScreen} />
            </>
          ) : profile?.role === 'parent' ? (
            <>
              <Stack.Screen name="ParentTabs" component={ParentTabs} />
              <Stack.Screen name="ChildReports" component={ChildReportsScreen} />
              <Stack.Screen name="ParentMessages" component={ParentMessagesScreen} />
              <Stack.Screen name="ParentAgenda" component={ParentAgendaScreen} />
              <Stack.Screen name="ParentSettings" component={ParentSettingsScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="StaffTabs" component={StaffTabs} />
              <Stack.Screen name="WriteReport" component={WriteReportScreen} />
              <Stack.Screen name="Members" component={MembersScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}