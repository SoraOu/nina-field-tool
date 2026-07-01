/**
 * S5 — IYCF Services & Supplies
 * Two sub-sections:
 *   A) IYCF Services: BF area, community kitchen, support group, milk bank, BMS donations
 *   B) Supplies inventory: counselling cards, flipcharts, posters, kits, micronutrients
 */
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import FormLayout from '@/components/nina/FormLayout';
import SectionHeader from '@/components/nina/SectionHeader';
import YesNoToggle from '@/components/nina/YesNoToggle';
import NumericInput from '@/components/nina/NumericInput';
import { Colors } from '@/constants/colors';
import {
  getIycfServices, upsertIycfServices,
  getSupplies, upsertSupplies,
  NinaIycfServices, NinaSupplies,
} from '@/db/queries/nina';

const ZERO_SERVICES: Omit<NinaIycfServices, 'assessment_id'> = {
  has_bf_area: 0, bf_area_count: 0,
  has_comm_kitchen: 0, comm_kitchen_count: 0,
  has_iycf_support_group: 0, iycf_support_group_count: 0,
  has_milk_bank: 0, milk_bank_count: 0,
  has_bms_donations: 0, bms_donor_name: null, bms_actions_done: null,
};

const ZERO_SUPPLIES: Omit<NinaSupplies, 'assessment_id'> = {
  iycf_counselling_cards: 0, bf_flipcharts: 0, eo51_posters: 0, bf_iycf_kits: 0,
  vita_100iu: 0, vita_200iu: 0, mnp_sachets: 0, iron_drops: 0,
  iron_200mg_fa400: 0, iron_60mg_fa28: 0, iron_syrup: 0,
  ors_sachets: 0, zinc_drops_syrup: 0, other_supplies: null,
};

export default function S5IycfScreen() {
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

  const [svc, setSvc] = useState(ZERO_SERVICES);
  const [sup, setSup] = useState(ZERO_SUPPLIES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = Number(assessmentId);
    Promise.all([getIycfServices(id), getSupplies(id)]).then(([s, p]) => {
      if (s) { const { assessment_id: _, ...rest } = s; setSvc(rest); }
      if (p) { const { assessment_id: _, ...rest } = p; setSup(rest); }
    });
  }, [assessmentId]);

  const setSvcField = (field: keyof typeof svc, value: number | string | null) =>
    setSvc((prev) => ({ ...prev, [field]: value }));
  const setSupField = (field: keyof typeof sup, value: number | string | null) =>
    setSup((prev) => ({ ...prev, [field]: value }));

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const id = Number(assessmentId);
      await upsertIycfServices({ assessment_id: id, ...svc });
      await upsertSupplies({ assessment_id: id, ...sup });
    } finally {
      setSaving(false);
    }
  }, [assessmentId, svc, sup]);

  const handleNext = async () => {
    await save();
    router.push(`/assessment/${eventId}/${assessmentId}/s6-tools-mam`);
  };

  const handleNavigate = (section: number) => {
    const routes = ['s1-disaster','s2-geo-team','s3-respondents',
      's4-demographics','s5-iycf','s6-tools-mam','s7-relief-notes'];
    router.push(`/assessment/${eventId}/${assessmentId}/${routes[section - 1]}`);
  };

  return (
    <FormLayout currentSection={5} onNavigate={handleNavigate}
      onNext={handleNext} onSaveDraft={save} saving={saving}>

      <SectionHeader sectionNumber={5} title="IYCF Services & Supplies"
        subtitle="Infant & Young Child Feeding services and commodity stocks." />

      {/* ── A: Services ─────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>IYCF Services</Text>

        <YesNoToggle label="Breastfeeding / IYCF Area"
          value={!!svc.has_bf_area} onChange={(v) => setSvcField('has_bf_area', v ? 1 : 0)}>
          <CountRow label="Number of areas" value={svc.bf_area_count}
            onChange={(v) => setSvcField('bf_area_count', v)} />
        </YesNoToggle>

        <Divider />
        <YesNoToggle label="Community Kitchen"
          value={!!svc.has_comm_kitchen} onChange={(v) => setSvcField('has_comm_kitchen', v ? 1 : 0)}>
          <CountRow label="Number of kitchens" value={svc.comm_kitchen_count}
            onChange={(v) => setSvcField('comm_kitchen_count', v)} />
        </YesNoToggle>

        <Divider />
        <YesNoToggle label="IYCF Support Group"
          value={!!svc.has_iycf_support_group} onChange={(v) => setSvcField('has_iycf_support_group', v ? 1 : 0)}>
          <CountRow label="Number of groups" value={svc.iycf_support_group_count}
            onChange={(v) => setSvcField('iycf_support_group_count', v)} />
        </YesNoToggle>

        <Divider />
        <YesNoToggle label="Milk Bank"
          value={!!svc.has_milk_bank} onChange={(v) => setSvcField('has_milk_bank', v ? 1 : 0)}>
          <CountRow label="Number of milk banks" value={svc.milk_bank_count}
            onChange={(v) => setSvcField('milk_bank_count', v)} />
        </YesNoToggle>

        <Divider />
        <YesNoToggle label="BMS Donations Received"
          value={!!svc.has_bms_donations} onChange={(v) => setSvcField('has_bms_donations', v ? 1 : 0)}>
          <View style={styles.conditionalFields}>
            <Text style={styles.subLabel}>Donor Name / Organization</Text>
            <TextInput style={styles.subInput}
              value={svc.bms_donor_name ?? ''}
              onChangeText={(t) => setSvcField('bms_donor_name', t || null)}
              placeholder="Name of donor" placeholderTextColor={Colors.textSecondary} />
            <Text style={[styles.subLabel, { marginTop: 10 }]}>Actions Taken</Text>
            <TextInput style={[styles.subInput, styles.multiline]}
              value={svc.bms_actions_done ?? ''}
              onChangeText={(t) => setSvcField('bms_actions_done', t || null)}
              placeholder="e.g. Returned to donor, stored separately..."
              placeholderTextColor={Colors.textSecondary}
              multiline numberOfLines={3} />
          </View>
        </YesNoToggle>
      </View>

      {/* ── B: IEC Materials ────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>IEC Materials & Kits</Text>
        {[
          { label: 'IYCF Counselling Cards', field: 'iycf_counselling_cards' as const },
          { label: 'BF Flipcharts', field: 'bf_flipcharts' as const },
          { label: 'EO 51 Posters', field: 'eo51_posters' as const },
          { label: 'BF/IYCF Kits', field: 'bf_iycf_kits' as const },
        ].map(({ label, field }) => (
          <SupplyRow key={field} label={label} value={sup[field] as number}
            onChange={(v) => setSupField(field, v)} />
        ))}
      </View>

      {/* ── C: Micronutrients ───────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Micronutrients & Medicines</Text>
        {[
          { label: 'Vitamin A 100,000 IU', field: 'vita_100iu' as const },
          { label: 'Vitamin A 200,000 IU', field: 'vita_200iu' as const },
          { label: 'MNP Sachets', field: 'mnp_sachets' as const },
          { label: 'Iron Drops', field: 'iron_drops' as const },
          { label: 'Iron 200mg + FA 400mcg', field: 'iron_200mg_fa400' as const },
          { label: 'Iron 60mg + FA 28 tabs', field: 'iron_60mg_fa28' as const },
          { label: 'Iron Syrup', field: 'iron_syrup' as const },
          { label: 'ORS Sachets', field: 'ors_sachets' as const },
          { label: 'Zinc Drops / Syrup', field: 'zinc_drops_syrup' as const },
        ].map(({ label, field }) => (
          <SupplyRow key={field} label={label} value={sup[field] as number}
            onChange={(v) => setSupField(field, v)} />
        ))}
        <View style={styles.otherRow}>
          <Text style={styles.fieldLabel}>Other Supplies</Text>
          <TextInput style={[styles.subInput, styles.multiline]}
            value={sup.other_supplies ?? ''}
            onChangeText={(t) => setSupField('other_supplies', t || null)}
            placeholder="Describe any other supplies received..."
            placeholderTextColor={Colors.textSecondary}
            multiline numberOfLines={3} />
        </View>
      </View>
    </FormLayout>
  );
}

function CountRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.countRow}>
      <Text style={styles.countLabel}>{label}</Text>
      <NumericInput mode="stepper" value={value} onChange={onChange} label={label} />
    </View>
  );
}

function SupplyRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.supplyRow}>
      <Text style={styles.supplyLabel}>{label}</Text>
      <NumericInput mode="freeform" value={value} onChange={onChange} label={label} />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
  divider: { height: 1, backgroundColor: Colors.border },
  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingVertical: 8,
  },
  countLabel: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  supplyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  supplyLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingRight: 12 },
  conditionalFields: { gap: 4 },
  subLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4 },
  subInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.card,
    marginTop: 4,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  otherRow: { padding: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
});
