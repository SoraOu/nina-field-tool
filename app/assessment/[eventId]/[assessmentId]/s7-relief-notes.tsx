/**
 * S7 — Relief, Gaps & Notes
 */
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
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
  getRelief, upsertRelief,
  getReliefItems, upsertReliefItem,
  getNotes, upsertNotes,
  NinaRelief, NinaReliefItem,
} from '@/db/queries/nina';

const RELIEF_ITEMS = [
  { type: 'food',     label: 'Food / Food Packs' },
  { type: 'water',    label: 'Potable Water' },
  { type: 'hygiene',  label: 'Hygiene Kits' },
  { type: 'toilet',   label: 'Toilet / Sanitation' },
  { type: 'utensils', label: 'Cooking Utensils' },
  { type: 'clothing', label: 'Clothing' },
  { type: 'shelter',  label: 'Shelter / NFI' },
];

export default function S7ReliefNotesScreen() {
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

  const [relief, setRelief] = useState<Omit<NinaRelief, 'assessment_id'>>({
    has_accessible_market: 0,
    diarrhea_children_count: 0,
  });
  const [items, setItems] = useState<NinaReliefItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = Number(assessmentId);
    Promise.all([getRelief(id), getReliefItems(id), getNotes(id)]).then(
      ([r, ri, n]) => {
        if (r) setRelief({ has_accessible_market: r.has_accessible_market, diarrhea_children_count: r.diarrhea_children_count });
        if (ri.length) setItems(ri);
        if (n) setNotes(n.overall_notes ?? '');
      }
    );
  }, [assessmentId]);

  const updateItem = (item_type: string, field: 'received' | 'has_gap' | 'org_name', value: number | string) => {
    setItems((prev) =>
      prev.map((i) => i.item_type === item_type ? { ...i, [field]: value } : i)
    );
  };

  const getItem = (type: string) => items.find((i) => i.item_type === type);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const id = Number(assessmentId);
      await upsertRelief({ assessment_id: id, ...relief });
      for (const item of items) {
        await upsertReliefItem(id, item.item_type, item.received, item.has_gap, item.org_name);
      }
      await upsertNotes(id, notes || null);
    } finally {
      setSaving(false);
    }
  }, [assessmentId, relief, items, notes]);

  const handleNext = async () => {
    await save();
    router.push(`/assessment/${eventId}/${assessmentId}/review`);
  };

  const handleNavigate = (section: number) => {
    const routes = ['s1-disaster','s2-geo-team','s3-respondents',
      's4-demographics','s5-iycf','s6-tools-mam','s7-relief-notes'];
    router.push(`/assessment/${eventId}/${assessmentId}/${routes[section - 1]}`);
  };

  return (
    <FormLayout currentSection={7} onNavigate={handleNavigate}
      onNext={handleNext} onSaveDraft={save} saving={saving} nextLabel="Review →">

      <SectionHeader sectionNumber={7} title="Relief, Gaps & Notes"
        subtitle="Relief items received, identified gaps, and overall observations." />

      {/* ── A: Relief Items ─────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Relief Items</Text>

        {/* Column headers */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, styles.colItem]}>Item</Text>
          <Text style={[styles.colHeader, styles.colToggle]}>Received</Text>
          <Text style={[styles.colHeader, styles.colToggle]}>Gap</Text>
        </View>

        {RELIEF_ITEMS.map(({ type, label }, idx) => {
          const item = getItem(type);
          const received = item?.received ?? 0;
          const hasGap = item?.has_gap ?? 0;
          const orgName = item?.org_name ?? '';
          const isLast = idx === RELIEF_ITEMS.length - 1;

          return (
            <View key={type}>
              <View style={[styles.tableRow, !isLast && styles.tableRowBorder]}>
                <Text style={[styles.itemLabel, styles.colItem]}>{label}</Text>

                {/* Received */}
                <View style={[styles.colToggle, styles.togglePair]}>
                  <MiniToggle active={!!received} which="yes"
                    onPress={() => updateItem(type, 'received', received ? 0 : 1)} />
                  <MiniToggle active={!received} which="no"
                    onPress={() => updateItem(type, 'received', received ? 0 : 1)} />
                </View>

                {/* Gap */}
                <View style={[styles.colToggle, styles.togglePair]}>
                  <MiniToggle active={!!hasGap} which="yes"
                    onPress={() => updateItem(type, 'has_gap', hasGap ? 0 : 1)} />
                  <MiniToggle active={!hasGap} which="no"
                    onPress={() => updateItem(type, 'has_gap', hasGap ? 0 : 1)} />
                </View>
              </View>

              {/* Org name slides in when received */}
              {!!received && (
                <View style={styles.orgRow}>
                  <Text style={styles.orgLabel}>Providing Organization</Text>
                  <TextInput
                    style={styles.orgInput}
                    value={orgName}
                    onChangeText={(t) => updateItem(type, 'org_name', t)}
                    placeholder="Name of organization / agency"
                    placeholderTextColor={Colors.textSecondary}
                    returnKeyType="done"
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── B: Market Access & Health ───────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Market & Health</Text>

        <YesNoToggle
          label="Accessible Market / Tindahan within evacuation area"
          value={!!relief.has_accessible_market}
          onChange={(v) => setRelief((prev) => ({ ...prev, has_accessible_market: v ? 1 : 0 }))}
        />

        <View style={styles.divider} />

        <View style={styles.countRow}>
          <Text style={styles.countLabel}>Children with Diarrhea (under 5)</Text>
          <NumericInput
            mode="freeform"
            value={relief.diarrhea_children_count}
            onChange={(v) => setRelief((prev) => ({ ...prev, diarrhea_children_count: v }))}
            label="Children with diarrhea"
          />
        </View>
      </View>

      {/* ── C: Notes ────────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Notes & Observations</Text>
        <View style={styles.notesContainer}>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Enter any additional observations, issues, or recommendations..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>
      </View>
    </FormLayout>
  );
}

// ── Mini YES/NO button for table cells ───────────────────────────────────────
function MiniToggle({ active, which, onPress }: {
  active: boolean; which: 'yes' | 'no'; onPress: () => void;
}) {
  const isYes = which === 'yes';
  const activeStyle = isYes
    ? { backgroundColor: Colors.primary, borderColor: Colors.primary }
    : { backgroundColor: '#FEF3C7', borderColor: Colors.required };
  const activeTextStyle = isYes
    ? { color: Colors.white }
    : { color: Colors.required };

  return (
    <TouchableOpacity
      style={[styles.miniBtn, active && activeStyle]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.miniBtnText, active && activeTextStyle]}>
        {isYes ? 'YES' : 'NO'}
      </Text>
    </TouchableOpacity>
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
  // Table
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, paddingVertical: 8, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  colHeader: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center',
  },
  colItem: { flex: 2, textAlign: 'left' },
  colToggle: { flex: 1 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 52,
  },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemLabel: { fontSize: 13, color: Colors.textPrimary },
  togglePair: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  miniBtn: {
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 36,
  },
  miniBtnText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3 },
  // Org name
  orgRow: {
    backgroundColor: '#F0FAF7', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 4,
  },
  orgLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  orgInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.card,
  },
  // Market & health
  divider: { height: 1, backgroundColor: Colors.border },
  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 14,
  },
  countLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingRight: 12 },
  // Notes
  notesContainer: { padding: 14 },
  notesInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary,
    minHeight: 120, textAlignVertical: 'top',
  },
});
