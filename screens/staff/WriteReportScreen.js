import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

function HumeurSelector({ value, onChange, theme }) {
  const options = [
    { key: 'super', emoji: '😄', label: 'Super' },
    { key: 'bien', emoji: '🙂', label: 'Bien' },
    { key: 'neutre', emoji: '😐', label: 'Neutre' },
    { key: 'difficile', emoji: '😕', label: 'Pas top' },
  ];
  const s = humeurStyles(theme);
  return (
    <View style={s.row}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.key}
          style={[s.option, value === opt.key && s.optionSelected]}
          onPress={() => onChange(value === opt.key ? null : opt.key)}
        >
          <Text style={s.emoji}>{opt.emoji}</Text>
          <Text style={[s.label, value === opt.key && s.labelSelected]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const humeurStyles = (theme) => StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.background,
  },
  optionSelected: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
  emoji: { fontSize: 22 },
  label: { fontSize: 10, color: theme.textSecondary, marginTop: 3, fontWeight: '600' },
  labelSelected: { color: theme.primary },
});

function QuantiteSelector({ value, onChange, theme }) {
  const options = [
    { key: 'rien', label: 'Rien', color: theme.danger },
    { key: 'peu', label: 'Peu', color: theme.warning },
    { key: 'moitie', label: 'Moitié', color: theme.warning },
    { key: 'bien', label: 'Bien', color: theme.success },
    { key: 'tout', label: 'Tout', color: theme.success },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onChange(value === opt.key ? null : opt.key)}
          style={{
            flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
            backgroundColor: value === opt.key ? opt.color + '25' : theme.background,
            borderWidth: 1,
            borderColor: value === opt.key ? opt.color : theme.border,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: value === opt.key ? opt.color : theme.textSecondary }}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ChampTexte({ placeholder, value, onChange, theme }) {
  return (
    <TextInput
      style={{
        backgroundColor: theme.inputBg, borderRadius: 10, borderWidth: 1,
        borderColor: theme.inputBorder, color: theme.text, fontSize: 14,
        paddingHorizontal: 12, paddingVertical: 10,
        minHeight: 44, textAlignVertical: 'top',
      }}
      placeholder={placeholder}
      placeholderTextColor={theme.placeholder}
      value={value}
      onChangeText={onChange}
      multiline
    />
  );
}

function SectionRapport({ titre, children, theme }) {
  return (
    <View style={{
      backgroundColor: theme.card, borderRadius: 16, padding: 16,
      marginBottom: 12, borderWidth: 1, borderColor: theme.border,
    }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 12 }}>{titre}</Text>
      {children}
    </View>
  );
}

export default function WriteReportScreen({ route, navigation }) {
  const { theme, t } = useTheme();
  const { enfant } = route.params;
  const isBebe = enfant.section === 'petite' || !enfant.section;

  const [humeur, setHumeur] = useState(null);
  const [humeurNote, setHumeurNote] = useState('');
  const [changes, setChanges] = useState('');
  const [notesGenerales, setNotesGenerales] = useState('');
  const [journalPrive, setJournalPrive] = useState('');
  const [brouillonId, setBrouillonId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingBrouillon, setLoadingBrouillon] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [stockId, setStockId] = useState(null);
  const [langes, setLanges] = useState('');
  const [lingettes, setLingettes] = useState('');
  const [mouchoirs, setMouchoirs] = useState('');
  const [repasMidiQuantite, setRepasMidiQuantite] = useState(null);
  const [repasMidiNote, setRepasMidiNote] = useState('');
  const [repasGoûterQuantite, setRepasGoûterQuantite] = useState(null);
  const [repasGoûterNote, setRepasGoûterNote] = useState('');
  const [siesteDebut, setSiesteDebut] = useState('');
  const [siesteFin, setSiesteFin] = useState('');
  const [siesteNote, setSiesteNote] = useState('');
  const [repas, setRepas] = useState([{ id: 1, heure: '', type: 'biberon', quantite: '', note: '' }]);
  const [siestes, setSiestes] = useState([{ id: 1, debut: '', fin: '', note: '' }]);

  useEffect(() => { loadBrouillon(); loadStock(); }, []);

  function getMoisActuel() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async function loadStock() {
    try {
      const mois = getMoisActuel();
      const { data } = await supabase.from('stock_mensuel').select('*')
        .eq('enfant_id', enfant.id).eq('mois', mois).maybeSingle();
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
      const { data } = await supabase.from('rapports').select('*')
        .eq('enfant_id', enfant.id).eq('date', today).maybeSingle();
      if (data) {
        setBrouillonId(data.id);
        setHumeur(data.humeur || null);
        setHumeurNote(data.humeur_note || '');
        setChanges(data.changes || '');
        setNotesGenerales(data.commentaire || '');
        setJournalPrive(data.journal_prive || '');
        if (isBebe) {
          if (data.repas_bebe) setRepas(JSON.parse(data.repas_bebe));
          if (data.siestes_bebe) setSiestes(JSON.parse(data.siestes_bebe));
        } else {
          setRepasMidiQuantite(data.repas_midi_stars ? ({ 1: 'rien', 2: 'peu', 3: 'moitie', 4: 'bien', 5: 'tout' }[data.repas_midi_stars] || null) : null);
          setRepasMidiNote(data.repas_midi_note || '');
          setRepasGoûterQuantite(data.repas_aprem_stars ? ({ 1: 'rien', 2: 'peu', 3: 'moitie', 4: 'bien', 5: 'tout' }[data.repas_aprem_stars] || null) : null);
          setRepasGoûterNote(data.repas_aprem_note || '');
          setSiesteDebut(data.sieste_debut || '');
          setSiesteFin(data.sieste_fin || '');
          setSiesteNote(data.sommeil || '');
        }
      }
    } catch (e) { console.log(e); }
    setLoadingData(false);
  }

  async function saveStock() {
    try {
      const mois = getMoisActuel();
      const data = {
        enfant_id: enfant.id, mois,
        langes: parseInt(langes) || 0,
        lingettes: parseInt(lingettes) || 0,
        mouchoirs: parseInt(mouchoirs) || 0,
        updated_at: new Date().toISOString()
      };
      if (stockId) {
        await supabase.from('stock_mensuel').update(data).eq('id', stockId);
      } else {
        const { data: ns } = await supabase.from('stock_mensuel').insert(data).select().single();
        if (ns) setStockId(ns.id);
      }
    } catch (e) { console.log(e); }
  }

  const [publishError, setPublishError] = useState('');
  const [brouillonSaved, setBrouillonSaved] = useState(false);

  async function handleSave(publier) {
    setPublishError('');
    setBrouillonSaved(false);

    // Validation : empêcher publication si rien rempli
    if (publier) {
      const champsBaseVides = !humeur && !humeurNote.trim() && !changes.trim() && !notesGenerales.trim();
      const champsGrandeVides = !repasMidiQuantite && !repasGoûterQuantite && !siesteDebut.trim();
      const rienRempli = isBebe ? champsBaseVides : (champsBaseVides && champsGrandeVides);
      if (rienRempli) {
        setPublishError('Remplissez au moins un champ avant de publier.');
        return;
      }
    }

    if (publier) setLoading(true);
    else setLoadingBrouillon(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];
      const data = {
        enfant_id: enfant.id, auteur_id: user.id, date: today,
        humeur: humeur || null, humeur_note: humeurNote || null,
        changes: changes || null, commentaire: notesGenerales || null,
        journal_prive: journalPrive || null, brouillon: !publier,
      };
      if (isBebe) {
        data.repas_bebe = JSON.stringify(repas);
        data.siestes_bebe = JSON.stringify(siestes);
        data.repas_midi_stars = null; data.repas_midi_note = null;
        data.repas_aprem_stars = null; data.repas_aprem_note = null;
        data.sieste_debut = null; data.sieste_fin = null; data.sommeil = null;
      } else {
        const QUANTITE_TO_INT = { rien: 1, peu: 2, moitie: 3, bien: 4, tout: 5 };
        data.repas_midi_stars = repasMidiQuantite ? (QUANTITE_TO_INT[repasMidiQuantite] || null) : null;
        data.repas_midi_note = repasMidiNote || null;
        data.repas_aprem_stars = repasGoûterQuantite ? (QUANTITE_TO_INT[repasGoûterQuantite] || null) : null;
        data.repas_aprem_note = repasGoûterNote || null;
        data.sieste_debut = siesteDebut || null;
        data.sieste_fin = siesteFin || null;
        data.sommeil = siesteNote || null;
        data.repas_bebe = null; data.siestes_bebe = null;
      }

      let error;
      if (brouillonId) {
        const { error: e } = await supabase.from('rapports').update(data).eq('id', brouillonId);
        error = e;
      } else {
        const { data: nr, error: e } = await supabase.from('rapports').insert(data).select().single();
        error = e;
        if (nr) setBrouillonId(nr.id);
      }

      if (error) {
        setPublishError(error.message);
        return;
      }

      await saveStock();

      if (publier) {
        navigation.goBack();
      } else {
        setBrouillonSaved(true);
      }
    } catch (e) {
      setPublishError(e.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
      setLoadingBrouillon(false);
    }
  }

  function addRepas() { setRepas(prev => [...prev, { id: Date.now(), heure: '', type: 'biberon', quantite: '', note: '' }]); }
  function updateRepas(id, field, value) { setRepas(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r)); }
  function removeRepas(id) { if (repas.length <= 1) return; setRepas(prev => prev.filter(r => r.id !== id)); }
  function addSieste() { setSiestes(prev => [...prev, { id: Date.now(), debut: '', fin: '', note: '' }]); }
  function updateSieste(id, field, value) { setSiestes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s)); }
  function removeSieste(id) { if (siestes.length <= 1) return; setSiestes(prev => prev.filter(s => s.id !== id)); }

  const s = styles(theme);

  if (loadingData) return (
    <View style={s.center}><ActivityIndicator color={theme.primary} size="large" /></View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerNom}>{enfant.prenom} {enfant.nom}</Text>
          <View style={[s.sectionTag, {
            backgroundColor: isBebe ? theme.petiteSection : theme.grandeSection,
          }]}>
            <Text style={[s.sectionTagText, {
              color: isBebe ? theme.petiteSectionText : theme.grandeSectionText,
            }]}>
              {isBebe ? t('petiteSection') : t('grandeSection')}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.inner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Text style={s.titre}>{t('dailyReport')}</Text>

        {brouillonId && (
          <View style={s.brouillonBanner}>
            <Text style={s.brouillonBannerText}>💾 Brouillon enregistré — non visible par les parents</Text>
          </View>
        )}

        {!isBebe && (
          <>
            <SectionRapport titre="🍽️ Repas midi" theme={theme}>
              <QuantiteSelector value={repasMidiQuantite} onChange={setRepasMidiQuantite} theme={theme} />
              <ChampTexte placeholder="Ex: A bien mangé les légumes..." value={repasMidiNote} onChange={setRepasMidiNote} theme={theme} />
            </SectionRapport>

            <SectionRapport titre="🍎 Repas goûter" theme={theme}>
              <QuantiteSelector value={repasGoûterQuantite} onChange={setRepasGoûterQuantite} theme={theme} />
              <ChampTexte placeholder="Ex: A mangé le fruit, bu le jus..." value={repasGoûterNote} onChange={setRepasGoûterNote} theme={theme} />
            </SectionRapport>

            <SectionRapport titre="😴 Sieste" theme={theme}>
              <View style={s.siesteRow}>
                <View style={s.siesteField}>
                  <Text style={s.siesteLabel}>Début</Text>
                  <TextInput style={s.siesteInput} placeholder="13:00" placeholderTextColor={theme.placeholder} value={siesteDebut} onChangeText={setSiesteDebut} />
                </View>
                <Text style={s.siesteArrow}>→</Text>
                <View style={s.siesteField}>
                  <Text style={s.siesteLabel}>Fin</Text>
                  <TextInput style={s.siesteInput} placeholder="14:30" placeholderTextColor={theme.placeholder} value={siesteFin} onChangeText={setSiesteFin} />
                </View>
              </View>
              <View style={{ marginTop: 10 }}>
                <ChampTexte placeholder="Ex: A eu du mal à s'endormir..." value={siesteNote} onChange={setSiesteNote} theme={theme} />
              </View>
            </SectionRapport>
          </>
        )}

        {isBebe && (
          <>
            <View style={s.blockCard}>
              <View style={s.blockHeader}>
                <Text style={s.blockTitre}>🍼 Repas</Text>
                <TouchableOpacity style={s.addItemBtn} onPress={addRepas}>
                  <Text style={s.addItemBtnText}>+ Ajouter</Text>
                </TouchableOpacity>
              </View>
              {repas.map((r, index) => (
                <View key={r.id} style={[s.itemCard, index > 0 && { marginTop: 10 }]}>
                  <View style={s.itemCardHeader}>
                    <Text style={s.itemCardNum}>Repas {index + 1}</Text>
                    {repas.length > 1 && <TouchableOpacity onPress={() => removeRepas(r.id)}><Text style={s.removeBtn}>✕</Text></TouchableOpacity>}
                  </View>
                  <View style={s.rowFields}>
                    <View style={s.fieldHalf}>
                      <Text style={s.fieldLabel}>Heure</Text>
                      <TextInput style={s.fieldInput} placeholder="08:30" placeholderTextColor={theme.placeholder} value={r.heure} onChangeText={v => updateRepas(r.id, 'heure', v)} />
                    </View>
                    <View style={s.fieldHalf}>
                      <Text style={s.fieldLabel}>Quantité (ml)</Text>
                      <TextInput style={s.fieldInput} placeholder="150" placeholderTextColor={theme.placeholder} value={r.quantite} onChangeText={v => updateRepas(r.id, 'quantite', v)} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={s.typeRow}>
                    {['biberon', 'purée', 'compote', 'goûter', 'autre'].map(type => (
                      <TouchableOpacity key={type} style={[s.typeBtn, r.type === type && { backgroundColor: theme.primarySoft, borderColor: theme.primary }]} onPress={() => updateRepas(r.id, 'type', type)}>
                        <Text style={[s.typeBtnText, r.type === type && { color: theme.primary, fontWeight: '700' }]}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <ChampTexte placeholder="Ex: A bien bu..." value={r.note} onChange={v => updateRepas(r.id, 'note', v)} theme={theme} />
                </View>
              ))}
            </View>

            <View style={s.blockCard}>
              <View style={s.blockHeader}>
                <Text style={s.blockTitre}>😴 Siestes</Text>
                <TouchableOpacity style={s.addItemBtn} onPress={addSieste}>
                  <Text style={s.addItemBtnText}>+ Ajouter</Text>
                </TouchableOpacity>
              </View>
              {siestes.map((si, index) => (
                <View key={si.id} style={[s.itemCard, index > 0 && { marginTop: 10 }]}>
                  <View style={s.itemCardHeader}>
                    <Text style={s.itemCardNum}>Sieste {index + 1}</Text>
                    {siestes.length > 1 && <TouchableOpacity onPress={() => removeSieste(si.id)}><Text style={s.removeBtn}>✕</Text></TouchableOpacity>}
                  </View>
                  <View style={s.siesteRow}>
                    <View style={s.siesteField}>
                      <Text style={s.siesteLabel}>Début</Text>
                      <TextInput style={s.siesteInput} placeholder="09:00" placeholderTextColor={theme.placeholder} value={si.debut} onChangeText={v => updateSieste(si.id, 'debut', v)} />
                    </View>
                    <Text style={s.siesteArrow}>→</Text>
                    <View style={s.siesteField}>
                      <Text style={s.siesteLabel}>Fin</Text>
                      <TextInput style={s.siesteInput} placeholder="10:30" placeholderTextColor={theme.placeholder} value={si.fin} onChangeText={v => updateSieste(si.id, 'fin', v)} />
                    </View>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <ChampTexte placeholder="Ex: A dormi d'un trait..." value={si.note} onChange={v => updateSieste(si.id, 'note', v)} theme={theme} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <SectionRapport titre="😊 Humeur" theme={theme}>
          <HumeurSelector value={humeur} onChange={setHumeur} theme={theme} />
          <View style={{ marginTop: 10 }}>
            <ChampTexte placeholder="Ex: Très souriant ce matin..." value={humeurNote} onChange={setHumeurNote} theme={theme} />
          </View>
        </SectionRapport>

        <SectionRapport titre="🧷 Changes" theme={theme}>
          <ChampTexte placeholder="Ex: 3 changes, une selle molle le matin..." value={changes} onChange={setChanges} theme={theme} />
        </SectionRapport>

        <SectionRapport titre="📝 Notes générales" theme={theme}>
          <ChampTexte placeholder="Ex: A adoré l'activité peinture..." value={notesGenerales} onChange={setNotesGenerales} theme={theme} />
        </SectionRapport>

        <View style={s.journalBlock}>
          <View style={s.journalHeader}>
            <Text style={s.journalTitre}>📓 Journal privé</Text>
            <View style={s.journalBadge}>
              <Text style={s.journalBadgeText}>🔒 Staff uniquement</Text>
            </View>
          </View>
          <Text style={s.journalSub}>Non visible par les parents</Text>
          <ChampTexte placeholder="Ex: Lucas a mordu un camarade..." value={journalPrive} onChange={setJournalPrive} theme={theme} />
        </View>

        <SectionRapport titre="📦 Stock mensuel" theme={theme}>
          <Text style={s.stockMois}>
            {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
          </Text>
          {[
            { label: '🩲 Langes', value: langes, onChange: setLanges },
            { label: '🧻 Lingettes', value: lingettes, onChange: setLingettes },
            { label: '🤧 Mouchoirs', value: mouchoirs, onChange: setMouchoirs },
          ].map((item, i) => (
            <View key={i} style={s.stockRow}>
              <Text style={s.stockLabel}>{item.label}</Text>
              <TextInput style={s.stockInput} placeholder="0" placeholderTextColor={theme.placeholder} value={item.value} onChangeText={item.onChange} keyboardType="numeric" />
            </View>
          ))}
        </SectionRapport>

        <View style={s.buttonsRow}>
          {publishError ? (
            <View style={{ width: '100%', backgroundColor: '#ffe5e5', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <Text style={{ color: '#c0392b', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>⚠️ {publishError}</Text>
            </View>
          ) : null}
          {brouillonSaved ? (
            <View style={{ width: '100%', backgroundColor: '#e8f5e9', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <Text style={{ color: '#2e7d32', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>💾 Brouillon enregistré</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <TouchableOpacity style={s.brouillonBtn} onPress={() => handleSave(false)} disabled={loadingBrouillon}>
            {loadingBrouillon ? <ActivityIndicator color={theme.primary} /> : <Text style={s.brouillonBtnText}>💾 Brouillon</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.publierBtn} onPress={() => handleSave(true)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.publierBtnText}>✓ Publier</Text>}
          </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'hidden' } : {}),
  },
  scroll: {
    flex: 1,
    ...(Platform.OS === 'web' ? { overflowY: 'scroll', WebkitOverflowScrolling: 'touch' } : {}),
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  header: {
    backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border,
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: theme.primary, fontSize: 14, fontWeight: '600' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerNom: { fontSize: 18, fontWeight: '700', color: theme.text },
  sectionTag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  sectionTagText: { fontSize: 11, fontWeight: '700' },
  inner: { padding: 16, paddingBottom: 40 },
  titre: { fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 14 },
  brouillonBanner: {
    backgroundColor: theme.primarySoft, borderRadius: 10,
    padding: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: theme.primary,
  },
  brouillonBannerText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
  siesteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  siesteField: { flex: 1 },
  siesteLabel: { fontSize: 12, color: theme.textSecondary, fontWeight: '600', marginBottom: 6 },
  siesteInput: {
    backgroundColor: theme.inputBg, borderRadius: 10, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 14,
    paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center',
  },
  siesteArrow: { color: theme.textSecondary, fontSize: 16, marginTop: 16 },
  blockCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  blockTitre: { fontSize: 15, fontWeight: '700', color: theme.text },
  addItemBtn: {
    backgroundColor: theme.primarySoft, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.primaryLight,
  },
  addItemBtnText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  itemCard: {
    backgroundColor: theme.background, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border, padding: 12,
  },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemCardNum: { fontSize: 13, fontWeight: '700', color: theme.text },
  removeBtn: { color: theme.danger, fontSize: 14, fontWeight: '700' },
  rowFields: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 11, color: theme.textSecondary, fontWeight: '600', marginBottom: 5 },
  fieldInput: {
    backgroundColor: theme.inputBg, borderRadius: 10, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 14,
    paddingHorizontal: 10, paddingVertical: 9, textAlign: 'center',
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  typeBtn: {
    borderRadius: 20, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.background,
  },
  typeBtnText: { fontSize: 11, color: theme.textSecondary },
  journalBlock: {
    backgroundColor: theme.warningLight, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#f0c08a',
  },
  journalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  journalTitre: { fontSize: 15, fontWeight: '700', color: theme.warning },
  journalBadge: {
    backgroundColor: theme.warningLight, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#f0c08a',
  },
  journalBadgeText: { fontSize: 10, fontWeight: '700', color: theme.warning },
  journalSub: { fontSize: 12, color: '#b3661f', marginBottom: 12 },
  stockMois: { fontSize: 12, color: theme.textSecondary, marginBottom: 12, marginTop: -4 },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  stockLabel: { color: theme.text, fontSize: 14, fontWeight: '600' },
  stockInput: {
    backgroundColor: theme.inputBg, borderRadius: 10, borderWidth: 1,
    borderColor: theme.inputBorder, color: theme.text, fontSize: 14,
    paddingHorizontal: 12, paddingVertical: 9, width: 90, textAlign: 'center',
  },
  buttonsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  brouillonBtn: {
    flex: 1, borderRadius: 12, padding: 15, alignItems: 'center',
    borderWidth: 2, borderColor: theme.primary, backgroundColor: 'transparent',
  },
  brouillonBtnText: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  publierBtn: { flex: 1, backgroundColor: theme.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  publierBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
