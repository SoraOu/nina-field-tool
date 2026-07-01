/**
 * SectionStatusBadge.tsx
 * Status chip shown on the Review screen for each section.
 * green ✓ Complete | amber ⚠ Incomplete
 * Tappable — navigates back to that section when incomplete.
 */
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export type SectionStatus = 'complete' | 'incomplete' | 'empty';

interface SectionStatusBadgeProps {
  status: SectionStatus;
  /** Called when user taps an incomplete badge */
  onPress?: () => void;
}

export default function SectionStatusBadge({ status, onPress }: SectionStatusBadgeProps) {
  if (status === 'complete') {
    return (
      <View style={[styles.badge, styles.complete]}>
        <Ionicons name="checkmark-circle" size={14} color="#065F46" style={styles.icon} />
        <Text style={[styles.text, styles.completeText]}>Complete</Text>
      </View>
    );
  }

  if (status === 'empty') {
    return (
      <View style={[styles.badge, styles.empty]}>
        <Ionicons name="ellipse-outline" size={14} color={Colors.textSecondary} style={styles.icon} />
        <Text style={[styles.text, styles.emptyText]}>Not started</Text>
      </View>
    );
  }

  // incomplete — tappable
  return (
    <TouchableOpacity
      style={[styles.badge, styles.incomplete]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel="Incomplete — tap to go to this section"
    >
      <Ionicons name="warning" size={14} color="#92400E" style={styles.icon} />
      <Text style={[styles.text, styles.incompleteText]}>Incomplete</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Complete — green
  complete: {
    backgroundColor: '#D1FAE5',
  },
  completeText: {
    color: '#065F46',
  },
  // Incomplete — amber
  incomplete: {
    backgroundColor: '#FEF3C7',
  },
  incompleteText: {
    color: '#92400E',
  },
  // Empty — gray
  empty: {
    backgroundColor: '#F3F4F6',
  },
  emptyText: {
    color: Colors.textSecondary,
  },
});
