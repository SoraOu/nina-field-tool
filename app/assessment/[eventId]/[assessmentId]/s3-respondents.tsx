/**
 * S3 — Respondents Profile
 * Dynamic add/remove rows. Each row: name, designation, office/agency, contact.
 * Minimum 1 row always shown. Rows auto-save on Next / Save Draft.
 */
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import FormLayout from '@/components/nina/FormLayout';
import SectionHeader from '@/components/nina/SectionHeader';
import { Colors } from '@/constants/colors';
import { getRespondents, upsertRespondent, deleteRespondent } from '@/db/queries/nina';

interface RespondentRow {
  seq: number;
  name: string;
  designation: string;
  office_agency: string;
  contact: string;
}

const emptyRow = (seq: number): RespondentRow => ({
  seq,
  name: '',
  designation: '',
  office_agency: '',
  contact: '',
});

export default function S3RespondentsScreen() {
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

  const [rows, setRows] = useState<RespondentRow[]>([emptyRow(1)]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRespondents(Number(assessmentId)).then((existing) => {
      if (existing.length > 0) {
        setRows(
          existing.map((r) => ({
            seq: r.seq,
            name: r.name ?? '',
            designation: r.designation ?? '',
            office_agency: r.office_agency ?? '',
            contact: r.contact ?? '',
          }))
        );
      }
    });
  }, [assessmentId]);

  const updateRow = (seq: number, field: keyof RespondentRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.seq === seq ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => {
    const nextSeq = Math.max(...rows.map((r) => r.seq)) + 1;
    setRows((prev) => [...prev, emptyRow(nextSeq)]);
  };

  const removeRow = (seq: number) => {
    if (rows.length <= 1) return;
    Alert.alert('Remove Respondent', 'Remove this row?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteRespondent(Number(assessmentId), seq);
          setRows((prev) => prev.filter((r) => r.seq !== seq));
        },
      },
    ]);
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      for (const row of rows) {
        await upsertRespondent(
          Number(assessmentId),
          row.seq,
          row.name || null,
          row.designation || null,
          row.office_agency || null,
          row.contact || null
        );
      }
    } finally {
      setSaving(false);
    }
  }, [assessmentId, rows]);

  const handleNext = async () => {
    await save();
    router.push(`/assessment/${eventId}/${assessmentId}/s4-demographics`);
  };

  const handleNavigate = (section: number) => {
    const routes = ['s1-disaster','s2-geo-team','s3-respondents',
      's4-demographics','s5-iycf','s6-tools-mam','s7-relief-notes'];
    router.push(`/assessment/${eventId}/${assessmentId}/${routes[section - 1]}`);
  };

  return (
    <FormLayout
      currentSection={3}
      onNavigate={handleNavigate}
      onNext={handleNext}
      onSaveDraft={save}
      saving={saving}
    >
      <SectionHeader
        sectionNumber={3}
        title="Respondents Profile"
        required
        subtitle="List all staff who participated in this assessment."
      />

      {rows.map((row, index) => (
        <View key={row.seq} style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.seqBadge}>
              <Text style={styles.seqText}>{index + 1}</Text>
            </View>
            <Text style={styles.cardTitle}>Respondent {index + 1}</Text>
            {rows.length > 1 && (
              <TouchableOpacity
                onPress={() => removeRow(row.seq)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Remove respondent"
              >
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              </TouchableOpacity>
            )}
          </View>

          <InlineField
            label="Name"
            value={row.name}
            onChange={(v) => updateRow(row.seq, 'name', v)}
            placeholder="Full name"
          />
          <InlineField
            label="Designation / Position"
            value={row.designation}
            onChange={(v) => updateRow(row.seq, 'designation', v)}
            placeholder="e.g. Nutritionist-Dietitian"
          />
          <InlineField
            label="Office / Agency"
            value={row.office_agency}
            onChange={(v) => updateRow(row.seq, 'office_agency', v)}
            placeholder="e.g. Mogpog RHU"
          />
          <InlineField
            label="Contact Number"
            value={row.contact}
            onChange={(v) => updateRow(row.seq, 'contact', v)}
            placeholder="09xx xxx xxxx"
            keyboardType="phone-pad"
            last
          />
        </View>
      ))}

      {/* Add row button */}
      <TouchableOpacity style={styles.addBtn} onPress={addRow} activeOpacity={0.75}>
        <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
        <Text style={styles.addBtnText}>Add Respondent</Text>
      </TouchableOpacity>
    </FormLayout>
  );
}

function InlineField({
  label, value, onChange, placeholder, keyboardType = 'default', last = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; last?: boolean;
}) {
  return (
    <View style={[styles.field, last && styles.fieldLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={keyboardType}
        returnKeyType="next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FAF7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  seqBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  field: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldLast: { borderBottomWidth: 0, paddingBottom: 12 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  fieldInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingBottom: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
});
