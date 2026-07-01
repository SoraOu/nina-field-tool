/**
 * S4 — Demographics
 * Grid of age/sex groups + special populations.
 * Live column totals (male total, female total, grand total) update on every keystroke.
 * All inputs are freeform numeric (values can exceed 99).
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import FormLayout from '@/components/nina/FormLayout';
import SectionHeader from '@/components/nina/SectionHeader';
import NumericInput from '@/components/nina/NumericInput';
import { Colors } from '@/constants/colors';
import { getDemographics, upsertDemographics, NinaDemographics } from '@/db/queries/nina';

type DemoField = Omit<NinaDemographics, 'assessment_id'>;

const ZERO: DemoField = {
  all_ages_male: 0, all_ages_female: 0,
  u6mo_male: 0, u6mo_female: 0,
  m6to23_male: 0, m6to23_female: 0,
  m24to59_male: 0, m24to59_female: 0,
  y60up_male: 0, y60up_female: 0,
  pwd_male: 0, pwd_female: 0,
  pregnant_total: 0, pregnant_tri1_2: 0, pregnant_tri3: 0,
  lactating: 0, female_adolescents: 0,
};

// Age/sex rows (male + female pair)
const AGE_SEX_ROWS: Array<{
  label: string;
  male: keyof DemoField;
  female: keyof DemoField;
}> = [
  { label: 'All Ages', male: 'all_ages_male', female: 'all_ages_female' },
  { label: 'Under 6 months', male: 'u6mo_male', female: 'u6mo_female' },
  { label: '6–23 months', male: 'm6to23_male', female: 'm6to23_female' },
  { label: '24–59 months', male: 'm24to59_male', female: 'm24to59_female' },
  { label: '60+ years', male: 'y60up_male', female: 'y60up_female' },
  { label: 'PWD', male: 'pwd_male', female: 'pwd_female' },
];

// Single-value special population rows
const SPECIAL_ROWS: Array<{ label: string; field: keyof DemoField }> = [
  { label: 'Pregnant (total)', field: 'pregnant_total' },
  { label: '  1st–2nd trimester', field: 'pregnant_tri1_2' },
  { label: '  3rd trimester', field: 'pregnant_tri3' },
  { label: 'Lactating Women', field: 'lactating' },
  { label: 'Female Adolescents (10–19)', field: 'female_adolescents' },
];

export default function S4DemographicsScreen() {
  const { eventId, assessmentId } = useLocalSearchParams<{
    eventId: string;
    assessmentId: string;
  }>();
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

  const [data, setData] = useState<DemoField>(ZERO);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDemographics(Number(assessmentId)).then((d) => {
      if (d) {
        const { assessment_id: _, ...rest } = d;
        setData(rest);
      }
    });
  }, [assessmentId]);

  const set = (field: keyof DemoField, value: number) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Live totals from age/sex rows only (All Ages row is the authoritative total)
  const maleTotal = data.all_ages_male;
  const femaleTotal = data.all_ages_female;
  const grandTotal = maleTotal + femaleTotal;

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await upsertDemographics({ assessment_id: Number(assessmentId), ...data });
    } finally {
      setSaving(false);
    }
  }, [assessmentId, data]);

  const handleNext = async () => {
    await save();
    router.push(`/assessment/${eventId}/${assessmentId}/s5-iycf`);
  };

  const handleNavigate = (section: number) => {
    const routes = ['s1-disaster','s2-geo-team','s3-respondents',
      's4-demographics','s5-iycf','s6-tools-mam','s7-relief-notes'];
    router.push(`/assessment/${eventId}/${assessmentId}/${routes[section - 1]}`);
  };

  return (
    <FormLayout
      currentSection={4}
      onNavigate={handleNavigate}
      onNext={handleNext}
      onSaveDraft={save}
      saving={saving}
    >
      <SectionHeader
        sectionNumber={4}
        title="Demographics"
        required
        subtitle="Number of affected individuals by age group and sex."
      />

      {/* Totals banner */}
      <View style={styles.banner}>
        <TotalChip label="Male" value={maleTotal} color="#2563EB" />
        <TotalChip label="Female" value={femaleTotal} color="#DB2777" />
        <TotalChip label="Total" value={grandTotal} color={Colors.primary} bold />
      </View>

      {/* Age × Sex grid */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Population by Age Group</Text>

        {/* Column headers */}
        <View style={styles.gridHeader}>
          <Text style={[styles.gridHeaderCell, styles.gridLabelCol]}>Age Group</Text>
          <Text style={styles.gridHeaderCell}>Male</Text>
          <Text style={styles.gridHeaderCell}>Female</Text>
          <Text style={styles.gridHeaderCell}>Total</Text>
        </View>

        {AGE_SEX_ROWS.map((row, i) => {
          const rowTotal = (data[row.male] as number) + (data[row.female] as number);
          const isFirst = i === 0;
          return (
            <View
              key={row.label}
              style={[styles.gridRow, isFirst && styles.gridRowHighlight]}
            >
              <Text style={[styles.gridLabelCell, isFirst && styles.gridLabelBold]}>
                {row.label}
              </Text>
              <View style={styles.gridInputCell}>
                <NumericInput
                  mode="freeform"
                  value={data[row.male] as number}
                  onChange={(v) => set(row.male, v)}
                  label={`${row.label} male`}
                />
              </View>
              <View style={styles.gridInputCell}>
                <NumericInput
                  mode="freeform"
                  value={data[row.female] as number}
                  onChange={(v) => set(row.female, v)}
                  label={`${row.label} female`}
                />
              </View>
              <View style={styles.gridTotalCell}>
                <Text style={styles.gridTotalText}>{rowTotal}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Special populations */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Special Populations</Text>
        {SPECIAL_ROWS.map((row) => (
          <View key={row.field} style={styles.specialRow}>
            <Text style={styles.specialLabel}>{row.label}</Text>
            <NumericInput
              mode="freeform"
              value={data[row.field] as number}
              onChange={(v) => set(row.field, v)}
              label={row.label}
            />
          </View>
        ))}
      </View>
    </FormLayout>
  );
}

function TotalChip({
  label, value, color, bold,
}: {
  label: string; value: number; color: string; bold?: boolean;
}) {
  return (
    <View style={[styles.chip, { borderColor: color + '40', backgroundColor: color + '12' }]}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
      <Text style={[styles.chipValue, { color }, bold && styles.chipValueBold]}>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  chip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipValue: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  chipValueBold: { fontSize: 22 },
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  // Grid
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  gridHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  gridLabelCol: { flex: 2, paddingLeft: 14, textAlign: 'left' },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 52,
  },
  gridRowHighlight: { backgroundColor: '#F0FAF7' },
  gridLabelCell: {
    flex: 2,
    paddingLeft: 14,
    fontSize: 13,
    color: Colors.textPrimary,
    paddingRight: 4,
  },
  gridLabelBold: { fontWeight: '700' },
  gridInputCell: {
    flex: 1,
    alignItems: 'center',
  },
  gridTotalCell: {
    flex: 1,
    alignItems: 'center',
  },
  gridTotalText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Special populations
  specialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  specialLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingRight: 12,
  },
});
