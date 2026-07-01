/**
 * Review & Export screen
 * Shows section status chips, assessment summary, and Export & Share button.
 */
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import SectionStatusBadge, { SectionStatus } from '@/components/nina/SectionStatusBadge';
import { Colors } from '@/constants/colors';
import {
  getEvent, getAssessment, getGeoTeam,
  getRespondents, getDemographics,
  getIycfServices, getSupplies,
  getTools, getMam,
  getRelief, getNotes,
  updateAssessmentStatus,
} from '@/db/queries/nina';
import { exportAssessment } from '@/lib/export/ninaExport';

interface SectionInfo {
  number: number;
  title: string;
  route: string;
  status: SectionStatus;
}

export default function ReviewScreen() {
  const { eventId, assessmentId } = useLocalSearchParams<{ eventId: string; assessmentId: string }>();
  const router = useRouter();

  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [eventName, setEventName] = useState('');
  const [teamNumber, setTeamNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const routes = ['s1-disaster','s2-geo-team','s3-respondents',
    's4-demographics','s5-iycf','s6-tools-mam','s7-relief-notes'];

  const computeStatus = useCallback(async () => {
    const id = Number(assessmentId);
    const [event, assessment, geoTeam, respondents, demographics,
      iycfSvc, supplies, tools, mam, relief, notes] = await Promise.all([
      getEvent(Number(eventId)),
      getAssessment(id),
      getGeoTeam(id),
      getRespondents(id),
      getDemographics(id),
      getIycfServices(id),
      getSupplies(id),
      getTools(id),
      getMam(id),
      getRelief(id),
      getNotes(id),
    ]);

    if (event) setEventName(`${event.disaster_type} — ${event.disaster_name}`);
    if (assessment) setTeamNumber(assessment.team_number);

    // S1: disaster type + name required
    const s1: SectionStatus = (event?.disaster_type && event?.disaster_name) ? 'complete' : 'incomplete';

    // S2: at least municipality + date required
    const s2: SectionStatus = (geoTeam?.municipality && geoTeam?.date_of_assessment) ? 'complete' : 'incomplete';

    // S3: at least one respondent with a name
    const s3: SectionStatus = respondents.some((r) => r.name) ? 'complete' : 'incomplete';

    // S4: all_ages total > 0
    const s4: SectionStatus = ((demographics?.all_ages_male ?? 0) + (demographics?.all_ages_female ?? 0)) > 0
      ? 'complete' : 'incomplete';

    // S5–S7: always complete once visited (optional fields)
    const s5: SectionStatus = iycfSvc ? 'complete' : 'empty';
    const s6: SectionStatus = tools ? 'complete' : 'empty';
    const s7: SectionStatus = relief ? 'complete' : 'empty';

    setSections([
      { number: 1, title: 'Disaster Setup', route: routes[0], status: s1 },
      { number: 2, title: 'Geographic & Team Info', route: routes[1], status: s2 },
      { number: 3, title: 'Respondents Profile', route: routes[2], status: s3 },
      { number: 4, title: 'Demographics', route: routes[3], status: s4 },
      { number: 5, title: 'IYCF Services & Supplies', route: routes[4], status: s5 },
      { number: 6, title: 'Tools & MAM Commodities', route: routes[5], status: s6 },
      { number: 7, title: 'Relief, Gaps & Notes', route: routes[6], status: s7 },
    ]);
  }, [assessmentId, eventId]);

  useEffect(() => {
    setLoading(true);
    computeStatus().finally(() => setLoading(false));
  }, [computeStatus]);

  const allRequiredComplete = sections
    .filter((s) => s.number <= 2)
    .every((s) => s.status === 'complete');

  const handleExport = async () => {
    if (!allRequiredComplete) {
      Alert.alert(
        'Incomplete Assessment',
        'Sections 1–2 are required before exporting.',
        [{ text: 'OK' }]
      );
      return;
    }
    setExporting(true);
    try {
      await exportAssessment(Number(assessmentId), Number(eventId));
      await updateAssessmentStatus(Number(assessmentId), 'complete');
      await computeStatus();
    } catch (e: any) {
      Alert.alert('Export Failed', e.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary header */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="document-text" size={22} color={Colors.primary} />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>{eventName}</Text>
            <Text style={styles.summarySubtitle}>Team {teamNumber} Assessment</Text>
          </View>
        </View>
      </View>

      {/* Section status list */}
      <Text style={styles.sectionListTitle}>Section Status</Text>
      <View style={styles.statusCard}>
        {sections.map((s, i) => (
          <TouchableOpacity
            key={s.number}
            style={[styles.statusRow, i < sections.length - 1 && styles.statusRowBorder]}
            onPress={() => router.push(`/assessment/${eventId}/${assessmentId}/${s.route}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.statusNumberBadge, s.status === 'incomplete' && styles.statusNumberBadgeWarn]}>
              <Text style={styles.statusNumberText}>{s.number}</Text>
            </View>
            <Text style={styles.statusTitle}>{s.title}</Text>
            <SectionStatusBadge status={s.status} />
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Required sections note */}
      {!allRequiredComplete && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={18} color="#92400E" />
          <Text style={styles.warningText}>
            Complete Sections 1–2 (required) before exporting.
          </Text>
        </View>
      )}

      {/* Export button */}
      <TouchableOpacity
        style={[styles.exportBtn, (!allRequiredComplete || exporting) && styles.exportBtnDisabled]}
        onPress={handleExport}
        disabled={!allRequiredComplete || exporting}
        activeOpacity={0.85}
      >
        {exporting ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="share-outline" size={20} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.exportBtnText}>Export & Share Excel</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Back to home */}
      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => router.push('/')}
      >
        <Text style={styles.homeBtnText}>← Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  summaryCard: {
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  summarySubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  sectionListTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4,
  },
  statusCard: {
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14, gap: 10,
  },
  statusRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  statusNumberBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  statusNumberBadgeWarn: {
    backgroundColor: Colors.required,
  },
  statusNumberText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  statusTitle: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E' },

  exportBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  homeBtn: { alignItems: 'center', paddingVertical: 12 },
  homeBtnText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
});
