/**
 * SectionHeader.tsx
 * Sticky section title card shown at the top of every form screen's scroll view.
 * Includes the section number, title, and an optional required indicator.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface SectionHeaderProps {
  sectionNumber: number;
  title: string;
  required?: boolean;
  subtitle?: string;
}

export default function SectionHeader({
  sectionNumber,
  title,
  required = false,
  subtitle,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{sectionNumber}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          )}
        </View>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  requiredBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.required,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.required,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 6,
    marginLeft: 44,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
