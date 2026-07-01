/**
 * Home Screen
 * Lists disaster events grouped by date. Each event shows its assessments.
 * FAB → New Assessment flow (creates event + assessment, navigates to S1).
 */
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useState, useCallback, useLayoutEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  getAllEvents,
  getAssessmentsForEvent,
  createEvent,
  createAssessment,
  deleteEvent,
  deleteAssessment,
  getAssessmentProgress,
  NinaEvent,
  NinaAssessment,
} from '@/db/queries/nina';
import { exportAssessment } from '@/lib/export/ninaExport';

const DISASTER_TYPES = [
  'Flood', 'Typhoon', 'Earthquake', 'Fire', 'Armed Conflict', 'Other',
];

interface EventWithAssessments extends NinaEvent {
  assessments: NinaAssessment[];
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [events, setEvents] = useState<EventWithAssessments[]>([]);
  const [loading, setLoading] = useState(true);

  // Gear icon → Settings
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={{ paddingHorizontal: 4, paddingVertical: 2 }}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  // New assessment modal state
  const [exporting, setExporting] = useState<number | null>(null);

  const handleDelete = (event: EventWithAssessments) => {
    Alert.alert(
      'Delete Event',
      `Delete "${event.disaster_name}" and all its team assessments? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => { await deleteEvent(event.id); loadData(); },
        },
      ]
    );
  };

  const handleDeleteAssessment = (event: EventWithAssessments, a: NinaAssessment) => {
    Alert.alert(
      'Delete Team',
      `Delete Team ${a.team_number} (${a.status})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => { await deleteAssessment(a.id); loadData(); },
        },
      ]
    );
  };

  const handleResume = async (event: EventWithAssessments, assessmentId: number, status: string) => {
    if (status === 'complete' || status === 'submitted') {
      router.push(`/assessment/${event.id}/${assessmentId}/review`);
      return;
    }
    const section = await getAssessmentProgress(assessmentId);
    const routes = [
      's1-disaster', 's2-geo-team', 's3-respondents',
      's4-demographics', 's5-iycf', 's6-tools-mam', 's7-relief-notes',
    ];
    const target = routes[Math.min(section - 1, routes.length - 1)];
    router.push(`/assessment/${event.id}/${assessmentId}/${target}`);
  };

  const handleExport = async (assessmentId: number, eventId: number) => {
    try {
      setExporting(assessmentId);
      await exportAssessment(assessmentId, eventId);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message ?? 'Unknown error');
    } finally {
      setExporting(null);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [disasterType, setDisasterType] = useState('Flood');
  const [disasterName, setDisasterName] = useState('');
  const [teamNumber, setTeamNumber] = useState('1');
  const [creating, setCreating] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const evts = await getAllEvents();
      const withAssessments = await Promise.all(
        evts.map(async (e) => ({
          ...e,
          assessments: await getAssessmentsForEvent(e.id),
        }))
      );
      setEvents(withAssessments);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload every time screen comes into focus
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleCreate = async () => {
    if (!disasterName.trim()) {
      Alert.alert('Required', 'Please enter a disaster name.');
      return;
    }
    setCreating(true);
    try {
      const eventId = await createEvent(disasterType, disasterName.trim(), null);
      const assessmentId = await createAssessment(eventId, Number(teamNumber) || 1);
      setShowModal(false);
      setDisasterName('');
      setTeamNumber('1');
      router.push(`/assessment/${eventId}/${assessmentId}/s1-disaster`);
    } finally {
      setCreating(false);
    }
  };

  // replaced by handleResume below

  const statusColor = (status: string) => {
    if (status === 'complete') return '#065F46';
    if (status === 'submitted') return '#1D4ED8';
    return Colors.required;
  };

  const statusBg = (status: string) => {
    if (status === 'complete') return '#D1FAE5';
    if (status === 'submitted') return '#DBEAFE';
    return '#FEF3C7';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.length > 0 && (
        <View style={styles.summaryStrip}>
          <View style={[styles.summaryCard, { backgroundColor: Colors.primary + '12' }]}>
            <Text style={[styles.summaryNum, { color: Colors.primary }]}>{events.length}</Text>
            <Text style={styles.summaryLabel}>Events</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.summaryNum, { color: '#1D4ED8' }]}>
              {events.reduce((s, e) => s + e.assessments.length, 0)}
            </Text>
            <Text style={styles.summaryLabel}>Teams</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.summaryNum, { color: Colors.required }]}>
              {events.reduce(
                (s, e) => s + e.assessments.filter((a) => a.status !== 'complete' && a.status !== 'submitted').length,
                0
              )}
            </Text>
            <Text style={styles.summaryLabel}>In Progress</Text>
          </View>
        </View>
      )}
      {events.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>No assessments yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to start a new NINA assessment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item: event }) => (
            <View style={styles.eventCard}>
              {/* Event header */}
              <View style={styles.eventHeader}>
                <View style={styles.eventTypeBadge}>
                  <Text style={styles.eventTypeText}>{event.disaster_type}</Text>
                </View>
                <Text style={styles.eventDate}>
                  {event.onset_date
                    ? new Date(event.onset_date).toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : 'No date set'}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(event)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginLeft: 8 }}
                >
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                </TouchableOpacity>
              </View>
              <Text style={styles.eventName}>{event.disaster_name}</Text>

              {/* Assessment chips */}
              <View style={styles.assessmentRow}>
                {event.assessments.map((a) => (
                  <View key={a.id} style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.teamChip, { backgroundColor: statusBg(a.status) }]}
                      onPress={() => handleResume(event, a.id, a.status)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="people-outline" size={13} color={statusColor(a.status)} />
                      <Text style={[styles.teamChipText, { color: statusColor(a.status) }]}>
                        Team {a.team_number}
                      </Text>
                      <Text style={[styles.teamChipStatus, { color: statusColor(a.status) }]}>
                        · {a.status}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.exportChip}
                      onPress={() => handleExport(a.id, event.id)}
                      disabled={exporting === a.id}
                    >
                      {exporting === a.id
                        ? <ActivityIndicator size="small" color={Colors.primary} />
                        : <Ionicons name="share-outline" size={14} color={Colors.primary} />
                      }
                      <Text style={styles.exportChipText}>Export</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteAssessment(event, a)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add team to existing event */}
                <TouchableOpacity
                  style={styles.addTeamChip}
                  onPress={async () => {
                    const nextTeam = event.assessments.length + 1;
                    const aId = await createAssessment(event.id, nextTeam);
                    router.push(`/assessment/${event.id}/${aId}/s1-disaster`);
                  }}
                >
                  <Ionicons name="add" size={14} color={Colors.primary} />
                  <Text style={styles.addTeamText}>Add Team</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
        accessibilityLabel="New assessment"
      >
        <Ionicons name="add" size={30} color={Colors.white} />
      </TouchableOpacity>

      {/* New Assessment Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Assessment</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Disaster Type */}
            <Text style={styles.modalLabel}>Disaster Type</Text>
            <TouchableOpacity
              style={styles.modalSelect}
              onPress={() => setShowTypeSheet(true)}
            >
              <Text style={styles.modalSelectText}>{disasterType}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>

            {/* Disaster Name */}
            <Text style={styles.modalLabel}>Disaster Name <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.modalInput}
              value={disasterName}
              onChangeText={setDisasterName}
              placeholder="e.g. Typhoon Carina"
              placeholderTextColor={Colors.textSecondary}
              returnKeyType="next"
              autoFocus
            />

            {/* Team Number */}
            <Text style={styles.modalLabel}>Team Number</Text>
            <TextInput
              style={styles.modalInput}
              value={teamNumber}
              onChangeText={setTeamNumber}
              keyboardType="numeric"
              returnKeyType="done"
              maxLength={3}
            />

            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.createBtnText}>Create & Start →</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Disaster type picker */}
      <Modal
        visible={showTypeSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTypeSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowTypeSheet(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Disaster Type</Text>
              <TouchableOpacity onPress={() => setShowTypeSheet(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {DISASTER_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.typeItem}
                onPress={() => { setDisasterType(t); setShowTypeSheet(false); }}
              >
                <Text style={styles.typeItemText}>{t}</Text>
                {t === disasterType && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  summaryStrip: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  summaryNum: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Event card
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventTypeBadge: {
    backgroundColor: Colors.primary + '18',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  eventTypeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  eventDate: { fontSize: 12, color: Colors.textSecondary, marginLeft: 'auto' },
  eventName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  assessmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  chipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  exportChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.primary,
  },
  exportChipText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  teamChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  teamChipText: { fontSize: 13, fontWeight: '600' },
  teamChipStatus: { fontSize: 12 },
  addTeamChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed',
  },
  addTeamText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    gap: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 6,
  },
  req: { color: Colors.required },
  modalInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  modalSelect: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: Colors.surface,
  },
  modalSelectText: { fontSize: 15, color: Colors.textPrimary },
  createBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  createBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  typeItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  typeItemText: { fontSize: 16, color: Colors.textPrimary },
});
