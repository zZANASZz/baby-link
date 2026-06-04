import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

function StarRating({ value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onChange(value === star ? 0 : star)}>
          <Text style={{ fontSize: 28, opacity: star <= value ? 1 : 0.2 }}>⭐</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function WriteReportScreen({ route, navigation }) {
  const { theme, t } = useTheme();
  const { enfant } = route.params;

  const [repasMidiStars, setRepasMidiStars] = useState(0);
  const [repasMidiNote, setRepasMidiNote] = useState('');
  const [repasApremStars, setRepasApremStars] = useState(0);
  const [repasApremNote, setRepasApremNote] = useState('');
  const [humeurStars, setHumeurStars] = useState(0);
  const [humeurNote, setHumeurNote] = useState('');
  const [siesteStars, setSiesteStars] = useState(0);
  const [siesteNote, setSiesteNote] = useState('');
  const [sante, setSante] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBrouillon, setLoadingBrouillon] = useState(false);
  const [brouillonId, setBrouillonId] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Stock mensuel
  const [stockId, setStockId] = useState(null);
  const [langes, setLanges] = useState('');
  const [lingettes, setLingettes] = useState('');
  const [mouchoirs, setMouchoirs] = useState('');

  useEffect(() => { loadBrouillon(); loadStock(); }, []);

  function getMoisActuel() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async function loadStock() {
    try {
      const mois = getMoisActuel();
      const { data } = await supabase
        .from('stock_mensuel')
        .select('*')
        .eq('enfant_id', enfant.id)
        .eq('mois', mois)
        .maybeSingle();

      if (data) {
        setStockId(data.id);
        setLanges(String(data.langes || ''));
        setLingettes(String(data.lingettes || ''));
        setMouchoirs(String(data.mouchoirs || ''));
      }
    } catch (e) { console.log(e); }
  }

  async function loadBrouillon() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('rapports')
        .select('*')
        .eq('enfant_id', enfant.id)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        setBrouillonId(existing.id);
        setRepasMidiStars(existing.repas_midi_stars || 0);
        setRepasMidiNote(existing.repas_midi_note || '');
        setRepasApremStars(existing.repas_aprem_stars || 0);
        setRepasApremNote(existing.repas_aprem_note || '');
        setHumeurStars(existing.humeur_stars || 0);
        setHumeurNote(existing.humeur_note || '');
        setSiesteStars(existing.sieste_stars || 0);
        setSiesteNote(existing.sommeil || '');
        setSante(existing.sante || '');
        setNotes(existing.commentaire || '');
      }
    } catch (e) { console.log(e); }
    setLoadingData(false);
  }

  async function saveStock() {
    try {
      const mois = getMoisActuel();
      const data = {
        enfant_id: enfant.id,
        mois,
        langes: parseInt(langes) || 0,
        lingettes: parseInt(lingettes) || 0,
        mouchoirs: parseInt(mouchoirs) || 0,
        updated_at: new Date().toISOString()
      };

      if (stockId) {
        await supabase.from('stock_mensuel').update(data).eq('id', stockId);
      } else {
        const { data: newStock } = await supabase.from('stock_mensuel').insert(data).select().single();
        if (newStock) setStockId(newStock.id);
      }
    } catch (e) { console.log(e); }
  }

  async function handleSave(publier) {
    if (publier) setLoading(true);
    else setLoadingBrouillon(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      const data = {
        enfant_id: enfant.id,
        auteur_id: user.id,
        date: today,
        repas_midi_stars: repasMidiStars,
        repas_midi_note: repasMidiNote || null,
        repas_aprem_stars: repasApremStars,
        repas_aprem_note: repasApremNote || null,
        humeur_stars: humeurStars,
        humeur_note: humeurNote || null,
        sieste_stars: siesteStars,
        sommeil: siesteNote || null,
        sante: sante || null,
        commentaire: notes || null,
        brouillon: !publier,
      };

      let error;
      if (brouillonId) {
        const { error: updateError } = await supabase
          .from('rapports').update(data).eq('id', brouillonId);
        error = updateError;
      } else {
        const { data: newRapport, error: insertError } = await supabase
          .from('rapports').insert(data).select().single();
        error = insertError;
        if (newRapport) setBrouillonId(newRapport.id);
      }

      if (error) { Alert.alert(t('error'), error.message); return; }

      // Sauvegarder le stock en même temps
      await saveStock();

      if (publier) {
        Alert.alert('✅ ' + t('reportPublished'), t('parentsCanSee'));
        navigation.goBack();
      } else {
        Alert.alert('💾 ' + t('draftSaved'), t('draftNotVisible'));
      }
    } catch (e) { Alert.alert(t('error'), e.message); }

    setLoading(false);
    setLoadingBrouillon(false);
  }

  const s = styles(theme);

  if (loadingData) return (
    <View style={s.center}>
      <Text style={s.loadingText}>{t('loading')}</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{t('back')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.inner}>
        <Text style={s.title}>{t('dailyReport')}</Text>
        <Text style={s.subtitle}>{enfant.prenom} {enfant.nom}</Text>

        {brouillonId && (
          <View style={s.brouillonBanner}>
            <Text style={s.brouillonBannerText}>
              💾 {t('draftSaved')} — {t('draftNotVisible')}
            </Text>
          </View>
        )}

        {/* Repas midi */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('lunchMeal')}</Text>
          <StarRating value={repasMidiStars} onChange={setRepasMidiStars} />
          <TextInput
            style={s.textInput}
            placeholder="Note optionnelle..."
            placeholderTextColor={theme.placeholder}
            value={repasMidiNote}
            onChangeText={setRepasMidiNote}
            multiline
          />
        </View>

        {/* Repas après-midi */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('afternoonMeal')}</Text>
          <StarRating value={repasApremStars} onChange={setRepasApremStars} />
          <TextInput
            style={s.textInput}
            placeholder="Note optionnelle..."
            placeholderTextColor={theme.placeholder}
            value={repasApremNote}
            onChangeText={setRepasApremNote}
            multiline
          />
        </View>

        {/* Humeur */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('mood')}</Text>
          <StarRating value={humeurStars} onChange={setHumeurStars} />
          <TextInput
            style={s.textInput}
            placeholder="Note optionnelle..."
            placeholderTextColor={theme.placeholder}
            value={humeurNote}
            onChangeText={setHumeurNote}
            multiline
          />
        </View>

        {/* Sieste */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('nap')}</Text>
          <StarRating value={siesteStars} onChange={setSiesteStars} />
          <TextInput
            style={s.textInput}
            placeholder="Note optionnelle... Ex: 1h30"
            placeholderTextColor={theme.placeholder}
            value={siesteNote}
            onChangeText={setSiesteNote}
            multiline
          />
        </View>

        {/* Santé */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('healthNotes')}</Text>
          <TextInput
            style={s.textInput}
            placeholder="Température, bobos..."
            placeholderTextColor={theme.placeholder}
            value={sante}
            onChangeText={setSante}
            multiline
          />
        </View>

        {/* Notes générales */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('generalNotes')}</Text>
          <TextInput
            style={s.textInput}
            placeholder="Observations, progrès..."
            placeholderTextColor={theme.placeholder}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Stock mensuel */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📦 Stock mensuel</Text>
          <Text style={s.stockSubtitle}>
            {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
          </Text>

          <View style={s.stockRow}>
            <Text style={s.stockLabel}>🩲 Langes</Text>
            <TextInput
              style={s.stockInput}
              placeholder="0"
              placeholderTextColor={theme.placeholder}
              value={langes}
              onChangeText={setLanges}
              keyboardType="numeric"
            />
          </View>

          <View style={s.stockRow}>
            <Text style={s.stockLabel}>🧻 Lingettes</Text>
            <TextInput
              style={s.stockInput}
              placeholder="0"
              placeholderTextColor={theme.placeholder}
              value={lingettes}
              onChangeText={setLingettes}
              keyboardType="numeric"
            />
          </View>

          <View style={s.stockRow}>
            <Text style={s.stockLabel}>🤧 Mouchoirs</Text>
            <TextInput
              style={s.stockInput}
              placeholder="0"
              placeholderTextColor={theme.placeholder}
              value={mouchoirs}
              onChangeText={setMouchoirs}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Boutons */}
        <TouchableOpacity
          style={s.brouillonBtn}
          onPress={() => handleSave(false)}
          disabled={loadingBrouillon}
        >
          {loadingBrouillon ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={s.brouillonBtnText}>{t('saveDraft')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.saveBtn}
          onPress={() => handleSave(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>{t('publishReport')}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { color: theme.text },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  backText: { color: theme.text, fontSize: 15 },
  inner: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: theme.textSecondary, marginBottom: 16 },
  brouillonBanner: {
    backgroundColor: theme.primaryLight, borderRadius: 10,
    padding: 10, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: theme.primary
  },
  brouillonBannerText: { color: theme.primary, fontSize: 13 },
  section: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 },
  stockSubtitle: { fontSize: 12, color: theme.textSecondary, marginBottom: 12, marginTop: -8 },
  textInput: {
    backgroundColor: theme.inputBg, borderRadius: 12, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 10,
    minHeight: 44, textAlignVertical: 'top'
  },
  stockRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12
  },
  stockLabel: { color: theme.text, fontSize: 15, fontWeight: '500' },
  stockInput: {
    backgroundColor: theme.inputBg, borderRadius: 10, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 10, width: 100, textAlign: 'center'
  },
  brouillonBtn: {
    borderRadius: 12, padding: 16, alignItems: 'center',
    marginTop: 8, marginBottom: 8,
    borderWidth: 2, borderColor: theme.primary,
    backgroundColor: 'transparent'
  },
  brouillonBtnText: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  saveBtn: {
    backgroundColor: theme.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 8
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});