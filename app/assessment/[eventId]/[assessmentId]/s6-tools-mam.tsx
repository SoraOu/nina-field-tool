/**
 * S6 — Anthropometric Tools & MAM Commodities
 * Two sub-sections:
 *   A) Tools inventory (MUAC tapes, scales, length/height board, WFL table)
 *   B) MAM/SAM commodities (RUSF, RUTF, F75, F100, ReSoMal, HEB)
 */
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import FormLayout from '@/components/nina/FormLayout';
import SectionHeader from '@/components/nina/SectionHeader';
import NumericInput from '@/components/nina/NumericInput';
import { Colors } from '@/constants/colors';
import {
  getTools, upsertTools,
  getMam, upsertMam,
  NinaTools, NinaMam,
} from '@/db/queries/nina';

const ZERO_TOOLS: Omit<NinaTools, 'assessment_id'> = {
  muac_children: 0, muac_adults: 0, infant_scale: 0,
  adult_scale: 0, length_height_board: 0, wfl_reference_table: 0,
};

const ZERO_MAM: Omit<NinaMam, 'assessment_id'> = {
  rusf_tubs: 0, rusf_sachets: 0, rutf_sachets: 0,
  f75_sachets_cans: 0, f100_sachets_cans: 0,
  resomal_sachets: 0, heb_sachets: 0, other_commodities: null,
};

export default function S6ToolsMamScreen() {
  const { eventId, assessmentId } = useLocalSearchParams<{ eventId: string; assessmentId: string }>();
  const router = useRouter();

  const navigation = useNavigation();

  // Review button in header — lets user jump to review from any section
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push(`/assessment/${eventId}/${assessmentId}/review`)}
          style={{ paddingHorizontal: 4, paddingVertical: 2, marginRight: 4 }}
          accessibilityLabel="Go to Review"
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Review</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, router, eventId, assessmentId]);

  const [tools, setTools] = useState(ZERO_TOOLS);
  const [mam, setMam] = useState(ZERO_MAM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = Number(assessmentId);
    Promise.all([getTools(id), getMam(id)]).then(([t, m]) => {
      if (t) { const { assessment_id: _, ...rest } = t; setTools(rest); }
      if (m) { const { assessment_id: _, ...rest } = m; setMam(rest); }
    });
  }, [assessmentId]);

  const setToolField = (field: keyof typeof tools, value: number) =>
    setTools((prev) => ({ ...prev, [field]: value }));
  const setMamField = (field: keyof typeof mam, value: number | string | null) =>
    setMam((prev) => ({ ...prev, [field]: value }));

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const id = Number(assessmentId);
      await upsertTools({ assessment_id: id, ...tools });
      await upsertMam({ assessment_id: id, ...mam });
    } finally {
      setSaving(false);
    }
  }, [assessmentId, tools, mam]);

  const handleNext = async () => {
    await save();
    router.push(`/assessment/${eventId}/${assessmentId}/s7-relief-notes`);
  };

  const handleNavigate = (section: number) => {
    const routes = ['s1-disaster','s2-geo-team','s3-respondents',
      's4-demographics','s5-iycf','s6-tools-mam','s7-relief-notes'];
    router.push(`/assessment/${eventId}/${assessmentId}/${routes[section - 1]}`);
  };

  return (
    <FormLayout currentSection={6} onNavigate={handleNavigate}
      onNext={handleNext} onSaveDraft={save} saving={saving}>

      <SectionHeader sectionNumber={6} title="Tools & MAM Commodities"
        subtitle="Anthropometric equipment and therapeutic food stocks." />

      {/* ── A: Anthropometric Tools ─────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Anthropometric Tools</Text>
        {[
          { label: 'MUAC Tape (Children)', field: 'muac_children' as const },
          { label: 'MUAC Tape (Adults/PLW)', field: 'muac_adults' as const },
          { label: 'Infant Scale', field: 'infant_scale' as const },
          { label: 'Adult / Mother Scale', field: 'adult_scale' as const },
          { label: 'Length / Height Board', field: 'length_height_board' as const },
          { label: 'WFL Reference Table', field: 'wfl_reference_table' as const },
        ].map(({ label, field }) => (
          <View key={field} style={styles.toolRow}>
            <Text style={styles.toolLabel}>{label}</Text>
            <NumericInput mode="stepper" value={tools[field]}
              onChange={(v) => setToolField(field, v)} label={label} />
          </View>
        ))}
      </View>

      {/* ── B: MAM / SAM Commodities ────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>MAM / SAM Commodities</Text>
        {[
          { label: 'RUSF (tubs / 90g)', field: 'rusf_tubs' as const },
          { label: 'RUSF (sachets / 92g)', field: 'rusf_sachets' as const },
          { label: 'RUTF Sachets (92g)', field: 'rutf_sachets' as const },
          { label: 'F-75 (sachets / cans)', field: 'f75_sachets_cans' as const },
          { label: 'F-100 (sachets / cans)', field: 'f100_sachets_cans' as const },
          { label: 'ReSoMal Sachets', field: 'resomal_sachets' as const },
          { label: 'HEB Sachets', field: 'heb_sachets' as const },
        ].map(({ label, field }) => (
          <View key={field} style={styles.supplyRow}>
            <Text style={styles.supplyLabel}>{label}</Text>
            <NumericInput mode="freeform" value={mam[field] as number}
              onChange={(v) => setMamField(field, v)} label={label} />
          </View>
        ))}

        <View style={styles.otherRow}>
          <Text style={styles.fieldLabel}>Other Commodities</Text>
          <TextInput
            style={[styles.textInput, styles.multiline]}
            value={mam.other_commodities ?? ''}
            onChangeText={(t) => setMamField('other_commodities', t || null)}
            placeholder="Describe any other therapeutic foods or commodities..."
            placeholderTextColor={Colors.textSecondary}
            multiline numberOfLines={3}
          />
        </View>
      </View>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, marginHorizontal: 16, marginBottom: 14,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  toolRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  toolLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingRight: 12 },
  supplyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  supplyLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingRight: 12 },
  otherRow: { padding: 14 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
  },
  textInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.card,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
});
