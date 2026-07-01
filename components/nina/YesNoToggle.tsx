/**
 * YesNoToggle.tsx
 * Full-width row: label on left, YES/NO toggle on right.
 * When toggled to YES, children slide in below with a smooth animation.
 * Minimum 44pt touch target on both buttons.
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Colors } from '@/constants/colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface YesNoToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Rendered below the row when value is true */
  children?: React.ReactNode;
  editable?: boolean;
  /** Shown in amber next to label when true */
  required?: boolean;
}

export default function YesNoToggle({
  label,
  value,
  onChange,
  children,
  editable = true,
  required = false,
}: YesNoToggleProps) {
  const toggle = (next: boolean) => {
    if (!editable) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChange(next);
  };

  return (
    <View style={styles.wrapper}>
      {/* Main row */}
      <View style={styles.row}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.requiredDot}> *</Text>}
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btn, value && styles.btnActive]}
            onPress={() => toggle(true)}
            activeOpacity={0.75}
            accessibilityRole="radio"
            accessibilityState={{ checked: value }}
            accessibilityLabel={`${label}: Yes`}
          >
            <Text style={[styles.btnText, value && styles.btnTextActive]}>
              YES
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, !value && styles.btnActiveNo]}
            onPress={() => toggle(false)}
            activeOpacity={0.75}
            accessibilityRole="radio"
            accessibilityState={{ checked: !value }}
            accessibilityLabel={`${label}: No`}
          >
            <Text style={[styles.btnText, !value && styles.btnTextActiveNo]}>
              NO
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conditional slide-in */}
      {value && children ? (
        <View style={styles.conditional}>{children}</View>
      ) : null}
    </View>
  );
}

const BTN_HEIGHT = 44;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: BTN_HEIGHT + 16,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingRight: 12,
  },
  requiredDot: {
    color: Colors.required,
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    height: BTN_HEIGHT,
    minWidth: 60,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  // YES active
  btnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  btnTextActive: {
    color: Colors.white,
  },
  // NO active
  btnActiveNo: {
    backgroundColor: '#FEF3C7', // light amber
    borderColor: Colors.required,
  },
  btnTextActiveNo: {
    color: Colors.required,
  },
  conditional: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#F0FAF7', // very light tint of primary
  },
});
