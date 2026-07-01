/**
 * S2 — Geographic & Team Info
 * Cascading geo dropdowns + evacuation center + date of assessment + team leader + alt contact
 * Pre-fills from Settings defaults on new assessments.
 */
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FormLayout from '@/components/nina/FormLayout';
import SectionHeader from '@/components/nina/SectionHeader';
import GeoDropdown, { GeoSelection } from '@/components/nina/GeoDropdown';
import { Colors } from '@/constants/colors';
import { getGeoTeam, upsertGeoTeam } from '@/db/queries/nina';

const DEFAULT_GEO: GeoSelection = {
  region: 'MIMAROPA',
  province: 'Marinduque',
  municipality: 'Mogpog',
  barangay: '',
};

export default function S2GeoTeamScreen() {
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

  const [geo, setGeo] = useState<GeoSelection>(DEFAULT_GEO);
  const [evacuationCenter, setEvacuationCenter] = useState('');
  const [assessmentDate, setAssessmentDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [leaderName, setLeaderName] = useState('');
  const [leaderDesig, setLeaderDesig] = useState('');
  const [leaderAgency, setLeaderAgency] = useState('');
  const [leaderContact, setLeaderContact] = useState('');
  const [altName, setAltName] = useState('');
  const [altContact, setAltContact] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const existing = await getGeoTeam(Number(assessmentId));
      if (existing && existing.region) {
        // Has saved data — use it
        setGeo({
          region: existing.region ?? '',
          province: existing.province ?? '',
          municipality: existing.municipality ?? '',
          barangay: existing.barangay ?? '',
        });
        setEvacuationCenter(existing.evacuation_center ?? '');
        if (existing.date_of_assessment)
          setAssessmentDate(new Date(existing.date_of_assessment));
        setLeaderName(existing.team_leader_name ?? '');
        setLeaderDesig(existing.team_leader_desig ?? '');
        setLeaderAgency(existing.team_leader_agency ?? '');
        setLeaderContact(existing.team_leader_contact ?? '');
        setAltName(existing.alt_contact_name ?? '');
        setAltContact(existing.alt_contact_number ?? '');
      } else {
        // New assessment — pre-fill from Settings
        try {
          const s = await AsyncStorage.getItem('settings');
          if (s) {
            const settings = JSON.parse(s);
            setGeo({
              region: settings.defaultRegion || DEFAULT_GEO.region,
              province: settings.defaultProvince || DEFAULT_GEO.province,
              municipality: settings.defaultMunicipality || DEFAULT_GEO.municipality,
              barangay: '',
            });
            setLeaderName(settings.defaultLeaderName || '');
            setLeaderDesig(settings.defaultLeaderDesig || '');
            setLeaderAgency(settings.defaultLeaderAgency || '');
            setLeaderContact(settings.defaultLeaderContact || '');
          }
        } catch (_) {}
      }
    };
    load();
  }, [assessmentId]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await upsertGeoTeam({
        assessment_id: Number(assessmentId),
        region: geo.region,
        province: geo.province,
        municipality: geo.municipality,
        barangay: geo.barangay,
        evacuation_center: evacuationCenter,
        date_of_assessment: assessmentDate
          ? assessmentDate.toISOString().split('T')[0]
          : null,
        team_leader_name: leaderName,
        team_leader_desig: leaderDesig,
        team_leader_agency: leaderAgency,
        team_leader_contact: leaderContact,
        alt_contact_name: altName,
        alt_contact_number: altContact,
      });
    } finally {
      setSaving(false);
    }
  }, [assessmentId, geo, evacuationCenter, assessmentDate,
      leaderName, leaderDesig, leaderAgency, leaderContact, altName, altContact]);

  const handleNext = async () => {
    await save();
    router.push(`/assessment/${eventId}/${assessmentId}/s3-respondents`);
  };

  const handleNavigate = (section: number) => {
    const routes = ['s1-disaster','s2-geo-team','s3-respondents',
      's4-demographics','s5-iycf','s6-tools-mam','s7-relief-notes'];
    router.push(`/assessment/${eventId}/${assessmentId}/${routes[section - 1]}`);
  };

  const formattedDate = assessmentDate
    ? assessmentDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Select date';

  return (
    <FormLayout
      currentSection={2}
      onNavigate={handleNavigate}
      onNext={handleNext}
      onSaveDraft={save}
      saving={saving}
    >
      <SectionHeader
        sectionNumber={2}
        title="Geographic & Team Info"
        required
        subtitle="Location defaults to Mogpog, Marinduque. Change in Settings."
      />

      {/* Location */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Location</Text>
        <GeoDropdown value={geo} onChange={setGeo} />

        <View style={styles.field}>
          <Text style={styles.label}>Evacuation Center</Text>
          <TextInput
            style={styles.input}
            value={evacuationCenter}
            onChangeText={setEvacuationCenter}
            placeholder="Name of evacuation center"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date of Assessment</Text>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.dateText, !assessmentDate && styles.placeholder]}>
              {formattedDate}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Team Leader */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Team Leader</Text>
        <Field label="Name" value={leaderName} onChange={setLeaderName} placeholder="Full name" />
        <Field label="Designation" value={leaderDesig} onChange={setLeaderDesig} placeholder="e.g. Nutritionist-Dietitian" />
        <Field label="Agency" value={leaderAgency} onChange={setLeaderAgency} placeholder="e.g. Mogpog RHU" />
        <Field label="Contact Number" value={leaderContact} onChange={setLeaderContact}
          placeholder="09xx xxx xxxx" keyboardType="phone-pad" />
      </View>

      {/* Alternate Contact */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Alternate Contact</Text>
        <Field label="Name" value={altName} onChange={setAltName} placeholder="Full name" />
        <Field label="Contact Number" value={altContact} onChange={setAltContact}
          placeholder="09xx xxx xxxx" keyboardType="phone-pad" />
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Date of Assessment</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={assessmentDate ?? new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_, d) => d && setAssessmentDate(d)}
                  maximumDate={new Date()}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={assessmentDate ?? new Date()}
            mode="date"
            display="default"
            onChange={(_, d) => { setShowDatePicker(false); if (d) setAssessmentDate(d); }}
            maximumDate={new Date()}
          />
        )
      )}
    </FormLayout>
  );
}

// ── Reusable inline field ──────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, keyboardType = 'default',
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={keyboardType}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  field: { gap: 4 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateText: { fontSize: 15, color: Colors.textPrimary },
  placeholder: { color: Colors.textSecondary },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerCard: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pickerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  pickerDone: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
});
