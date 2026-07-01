/**
 * Settings Screen
 * Persists default geo + team leader info to AsyncStorage key "settings".
 * S2 reads these on new assessments to pre-fill fields.
 */
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  defaultRegion: string;
  defaultProvince: string;
  defaultMunicipality: string;
  defaultLeaderName: string;
  defaultLeaderDesig: string;
  defaultLeaderAgency: string;
  defaultLeaderContact: string;
}

const DEFAULTS: Settings = {
  defaultRegion: 'MIMAROPA',
  defaultProvince: 'Marinduque',
  defaultMunicipality: 'Mogpog',
  defaultLeaderName: '',
  defaultLeaderDesig: '',
  defaultLeaderAgency: '',
  defaultLeaderContact: '',
};

const STORAGE_KEY = 'settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'words',
  last = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  last?: boolean;
}) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType="next"
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          setSettings({ ...DEFAULTS, ...parsed });
        }
      } catch (_) {
        // Use defaults if corrupt
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setDirty(false);
      Alert.alert('Saved', 'Default settings have been saved. They will pre-fill on new assessments.');
    } catch (e) {
      Alert.alert('Error', 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset to Defaults',
      'This will clear all saved settings and restore the defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setSettings(DEFAULTS);
            setDirty(true);
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setDirty(false);
              Alert.alert('Reset', 'Settings have been cleared.');
            } catch (_) {}
          },
        },
      ]
    );
  }, []);

  // Save button in header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !dirty}
          style={styles.headerBtn}
          accessibilityLabel="Save settings"
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={[styles.headerBtnText, !dirty && styles.headerBtnDisabled]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSave, saving, dirty]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.infoText}>
            These defaults pre-fill Section 2 when a new assessment is created. You can
            still change them per-assessment.
          </Text>
        </View>

        {/* Default Location */}
        <Section title="DEFAULT LOCATION">
          <Field
            label="Region"
            value={settings.defaultRegion}
            onChangeText={(v) => update('defaultRegion', v)}
            placeholder="e.g. MIMAROPA"
            autoCapitalize="characters"
          />
          <Field
            label="Province"
            value={settings.defaultProvince}
            onChangeText={(v) => update('defaultProvince', v)}
            placeholder="e.g. Marinduque"
          />
          <Field
            label="Municipality"
            value={settings.defaultMunicipality}
            onChangeText={(v) => update('defaultMunicipality', v)}
            placeholder="e.g. Mogpog"
            last
          />
        </Section>

        {/* Default Team Leader */}
        <Section title="DEFAULT TEAM LEADER">
          <Field
            label="Name"
            value={settings.defaultLeaderName}
            onChangeText={(v) => update('defaultLeaderName', v)}
            placeholder="Full name"
          />
          <Field
            label="Designation"
            value={settings.defaultLeaderDesig}
            onChangeText={(v) => update('defaultLeaderDesig', v)}
            placeholder="e.g. RND, NNC Field Officer"
          />
          <Field
            label="Agency / Organization"
            value={settings.defaultLeaderAgency}
            onChangeText={(v) => update('defaultLeaderAgency', v)}
            placeholder="e.g. Municipal Nutrition Office"
          />
          <Field
            label="Contact Number"
            value={settings.defaultLeaderContact}
            onChangeText={(v) => update('defaultLeaderContact', v)}
            placeholder="09XXXXXXXXX"
            keyboardType="phone-pad"
            autoCapitalize="none"
            last
          />
        </Section>

        {/* Save button (also accessible as inline CTA) */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || !dirty) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || !dirty}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Reset */}
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={16} color={Colors.danger} />
          <Text style={styles.resetBtnText}>Reset to Defaults</Text>
        </TouchableOpacity>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>NINA Field Tool · Municipal Nutrition Office</Text>
          <Text style={styles.appInfoText}>Mogpog, Marinduque · Expo SDK 54</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  headerBtnDisabled: { opacity: 0.4 },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primary + '14',
    borderRadius: 10,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 19,
  },

  // Section
  section: { gap: 6 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  // Field
  field: { paddingHorizontal: 14, paddingVertical: 10 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  fieldInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 0, // tighter on Android
  },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  // Reset
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  resetBtnText: { fontSize: 14, color: Colors.danger, fontWeight: '600' },

  // App info footer
  appInfo: { alignItems: 'center', gap: 2, marginTop: 8 },
  appInfoText: { fontSize: 12, color: Colors.textSecondary },
});
