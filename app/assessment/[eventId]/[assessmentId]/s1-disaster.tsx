/**
 * S1 — Disaster Setup
 * Fields: disaster type (dropdown), disaster name (text), date of onset (date picker)
 */
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import FormLayout from '@/components/nina/FormLayout';
import SectionHeader from '@/components/nina/SectionHeader';
import { Colors } from '@/constants/colors';
import {
  getEvent,
  updateEvent,
  getAssessment,
} from '@/db/queries/nina';

const DISASTER_TYPES = [
  'Flood',
  'Typhoon',
  'Earthquake',
  'Fire',
  'Armed Conflict',
  'Other',
];

export default function S1DisasterScreen() {
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

  const [disasterType, setDisasterType] = useState('');
  const [disasterName, setDisasterName] = useState('');
  const [onsetDate, setOnsetDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing event data
  useEffect(() => {
    if (!eventId) return;
    getEvent(Number(eventId)).then((event) => {
      if (!event) return;
      setDisasterType(event.disaster_type ?? '');
      setDisasterName(event.disaster_name ?? '');
      if (event.onset_date) setOnsetDate(new Date(event.onset_date));
    });
  }, [eventId]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await updateEvent(
        Number(eventId),
        disasterType || 'Other',
        disasterName,
        onsetDate ? onsetDate.toISOString().split('T')[0] : null
      );
    } finally {
      setSaving(false);
    }
  }, [eventId, disasterType, disasterName, onsetDate]);

  const handleNext = async () => {
    await save();
    router.push(
      `/assessment/${eventId}/${assessmentId}/s2-geo-team`
    );
  };

  const handleNavigate = (section: number) => {
    const routes = [
      's1-disaster', 's2-geo-team', 's3-respondents',
      's4-demographics', 's5-iycf', 's6-tools-mam', 's7-relief-notes',
    ];
    router.push(`/assessment/${eventId}/${assessmentId}/${routes[section - 1]}`);
  };

  const formattedDate = onsetDate
    ? onsetDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Select date';

  return (
    <FormLayout
      currentSection={1}
      onNavigate={handleNavigate}
      onNext={handleNext}
      onSaveDraft={save}
      saving={saving}
    >
      <SectionHeader
        sectionNumber={1}
        title="Disaster Setup"
        subtitle="Basic information about the emergency event."
      />

      <View style={styles.card}>
        {/* Disaster Type */}
        <Text style={styles.label}>Type of Emergency / Disaster <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity
          style={styles.selectRow}
          onPress={() => setShowTypeSheet(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selectText, !disasterType && styles.placeholder]}>
            {disasterType || 'Select disaster type'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Disaster Name */}
        <Text style={styles.label}>Name of Emergency / Disaster <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.textInput}
          value={disasterName}
          onChangeText={setDisasterName}
          placeholder="e.g. Typhoon Carina, Marinduque Earthquake"
          placeholderTextColor={Colors.textSecondary}
          returnKeyType="done"
        />

        <View style={styles.divider} />

        {/* Date of Onset */}
        <Text style={styles.label}>Date of Onset</Text>
        <TouchableOpacity
          style={styles.selectRow}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.primary} style={styles.calIcon} />
          <Text style={[styles.selectText, !onsetDate && styles.placeholder]}>
            {formattedDate}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={styles.pickerModal}>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Date of Onset</Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={onsetDate ?? new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => date && setOnsetDate(date)}
                  maximumDate={new Date()}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={onsetDate ?? new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowPicker(false);
              if (date) setOnsetDate(date);
            }}
            maximumDate={new Date()}
          />
        )
      )}

      {/* Disaster Type Bottom Sheet */}
      <Modal
        visible={showTypeSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTypeSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setShowTypeSheet(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Type of Emergency</Text>
              <TouchableOpacity onPress={() => setShowTypeSheet(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DISASTER_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => {
                    setDisasterType(item);
                    setShowTypeSheet(false);
                  }}
                >
                  <Text style={styles.sheetItemText}>{item}</Text>
                  {item === disasterType && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </View>
        </View>
      </Modal>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  required: { color: Colors.required },
  textInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  placeholder: { color: Colors.textSecondary },
  calIcon: { marginRight: 8 },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  // Picker modal (iOS)
  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  pickerDone: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  // Type bottom sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'android' ? 16 : 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetItemText: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  sep: { height: 1, backgroundColor: Colors.border, marginHorizontal: 20 },
});
