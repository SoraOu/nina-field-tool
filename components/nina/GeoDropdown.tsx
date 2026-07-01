/**
 * GeoDropdown.tsx
 * Cascading Region → Province → Municipality → Barangay selector.
 * Each level opens as a full-screen modal bottom sheet — never inline.
 * Selecting a value closes the sheet and unlocks the next level.
 * Barangay is free-text (not seeded in DB — too granular for national seed).
 */
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  getRegions,
  getProvinces,
  getMunicipalities,
  GeoRegion,
  GeoProvince,
  GeoMunicipality,
} from '@/db/queries/nina';
import { Colors } from '@/constants/colors';

export interface GeoSelection {
  region: string;
  province: string;
  municipality: string;
  barangay: string;
}

interface GeoDropdownProps {
  value: GeoSelection;
  onChange: (value: GeoSelection) => void;
  editable?: boolean;
}

type GeoLevel = 'region' | 'province' | 'municipality' | 'barangay';

interface SheetItem { id: number | string; name: string; }

export default function GeoDropdown({ value, onChange, editable = true }: GeoDropdownProps) {
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [provinces, setProvinces] = useState<GeoProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<GeoMunicipality[]>([]);

  const [activeLevel, setActiveLevel] = useState<GeoLevel | null>(null);
  const [search, setSearch] = useState('');
  const [barangayDraft, setBarangayDraft] = useState(value.barangay);

  // Load regions on mount
  useEffect(() => {
    getRegions().then(setRegions).catch(console.error);
  }, []);

  // Load provinces when region changes
  useEffect(() => {
    if (!value.region) return;
    const r = regions.find((r) => r.name === value.region);
    if (r) getProvinces(r.id).then(setProvinces).catch(console.error);
  }, [value.region, regions]);

  // Load municipalities when province changes
  useEffect(() => {
    if (!value.province) return;
    const p = provinces.find((p) => p.name === value.province);
    if (p) getMunicipalities(p.id).then(setMunicipalities).catch(console.error);
  }, [value.province, provinces]);

  const openSheet = (level: GeoLevel) => {
    if (!editable) return;
    setSearch('');
    setBarangayDraft(value.barangay);
    setActiveLevel(level);
  };

  const closeSheet = () => setActiveLevel(null);

  const selectItem = (level: GeoLevel, name: string) => {
    closeSheet();
    // Reset downstream fields when an upstream level changes
    switch (level) {
      case 'region':
        onChange({ region: name, province: '', municipality: '', barangay: '' });
        break;
      case 'province':
        onChange({ ...value, province: name, municipality: '', barangay: '' });
        break;
      case 'municipality':
        onChange({ ...value, municipality: name, barangay: '' });
        break;
      case 'barangay':
        onChange({ ...value, barangay: name });
        break;
    }
  };

  const sheetItems = (): SheetItem[] => {
    switch (activeLevel) {
      case 'region':      return regions;
      case 'province':    return provinces;
      case 'municipality': return municipalities;
      default: return [];
    }
  };

  const filteredItems = sheetItems().filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const LEVEL_LABELS: Record<GeoLevel, string> = {
    region: 'Region',
    province: 'Province',
    municipality: 'Municipality',
    barangay: 'Barangay',
  };

  const rows: Array<{ level: GeoLevel; display: string; locked: boolean }> = [
    { level: 'region',       display: value.region || 'Select region',             locked: false },
    { level: 'province',     display: value.province || 'Select province',         locked: !value.region },
    { level: 'municipality', display: value.municipality || 'Select municipality', locked: !value.province },
    { level: 'barangay',     display: value.barangay || 'Enter barangay',          locked: !value.municipality },
  ];

  return (
    <View style={styles.container}>
      {rows.map(({ level, display, locked }) => (
        <TouchableOpacity
          key={level}
          style={[styles.row, locked && styles.rowLocked]}
          onPress={() => !locked && openSheet(level)}
          disabled={locked || !editable}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${LEVEL_LABELS[level]}: ${display}`}
          accessibilityState={{ disabled: locked }}
        >
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>{LEVEL_LABELS[level]}</Text>
            <Text style={[styles.rowValue, locked && styles.rowValueLocked]}>
              {display}
            </Text>
          </View>
          {!locked && (
            <Ionicons
              name="chevron-down"
              size={18}
              color={locked ? Colors.textSecondary : Colors.primary}
            />
          )}
        </TouchableOpacity>
      ))}

      {/* Modal bottom sheet for region/province/municipality */}
      <Modal
        visible={activeLevel !== null && activeLevel !== 'barangay'}
        animationType="slide"
        transparent
        onRequestClose={closeSheet}
      >
        <SafeAreaView style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={closeSheet} />
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {activeLevel ? LEVEL_LABELS[activeLevel] : ''}
              </Text>
              <TouchableOpacity onPress={closeSheet} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={Colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${activeLevel ? LEVEL_LABELS[activeLevel].toLowerCase() : ''}…`}
                placeholderTextColor={Colors.textSecondary}
                autoFocus
                clearButtonMode="while-editing"
              />
            </View>

            {/* List */}
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => activeLevel && selectItem(activeLevel, item.name)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.listItemText}>{item.name}</Text>
                  {item.name === (activeLevel ? value[activeLevel] : '') && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Barangay: inline text input since it's free-text */}
      <Modal
        visible={activeLevel === 'barangay'}
        animationType="slide"
        transparent
        onRequestClose={closeSheet}
      >
        <SafeAreaView style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={closeSheet} />
          <View style={[styles.sheet, styles.sheetShort]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Barangay</Text>
              <TouchableOpacity onPress={closeSheet} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.barangayInput}
              value={barangayDraft}
              onChangeText={setBarangayDraft}
              placeholder="Enter barangay name(s)"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => selectItem('barangay', barangayDraft)}
            />
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => selectItem('barangay', barangayDraft)}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 52,
  },
  rowLocked: {
    backgroundColor: Colors.surface,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowValueLocked: {
    color: Colors.textSecondary,
  },

  // ── Sheet ────────────────────────────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'android' ? 16 : 0,
  },
  sheetShort: {
    maxHeight: '40%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
  },

  // ── Barangay free text ───────────────────────────────────────────────────
  barangayInput: {
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  confirmBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
