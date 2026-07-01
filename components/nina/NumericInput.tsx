/**
 * NumericInput.tsx
 * Two modes per the brief's Section 10 spec:
 *
 *  stepper  — counts ≤ 99: renders  [−]  value  [+]  buttons (44pt min touch target)
 *  freeform — demographics / supply quantities that may exceed 99: plain TextInput
 *
 * The `mode` prop selects the behaviour. Default is 'stepper'.
 */
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  mode?: 'stepper' | 'freeform';
  min?: number;
  max?: number;
  /** Displayed as an accessible label */
  label?: string;
  editable?: boolean;
}

export default function NumericInput({
  value,
  onChange,
  mode = 'stepper',
  min = 0,
  max = mode === 'stepper' ? 99 : 999999,
  label,
  editable = true,
}: NumericInputProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  if (mode === 'freeform') {
    return (
      <TextInput
        style={[styles.freeformInput, !editable && styles.disabled]}
        value={value === 0 ? '' : String(value)}
        onChangeText={(t) => {
          const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
          onChange(isNaN(n) ? 0 : clamp(n));
        }}
        keyboardType="numeric"
        returnKeyType="done"
        placeholder="0"
        placeholderTextColor={Colors.textSecondary}
        editable={editable}
        accessibilityLabel={label}
        maxLength={7}
      />
    );
  }

  // Stepper mode
  const decrement = () => editable && onChange(clamp(value - 1));
  const increment = () => editable && onChange(clamp(value + 1));

  return (
    <View style={styles.stepperRow} accessibilityLabel={label}>
      <TouchableOpacity
        style={[styles.stepBtn, !editable && styles.disabled]}
        onPress={decrement}
        disabled={!editable || value <= min}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label ?? 'value'}`}
      >
        <Text style={[styles.stepBtnText, (!editable || value <= min) && styles.stepBtnDisabledText]}>
          −
        </Text>
      </TouchableOpacity>

      <View style={styles.valueBox}>
        <Text style={styles.valueText}>{value}</Text>
      </View>

      <TouchableOpacity
        style={[styles.stepBtn, !editable && styles.disabled]}
        onPress={increment}
        disabled={!editable || value >= max}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label ?? 'value'}`}
      >
        <Text style={[styles.stepBtnText, (!editable || value >= max) && styles.stepBtnDisabledText]}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const TOUCH_TARGET = 44;

const styles = StyleSheet.create({
  // ── Freeform ──────────────────────────────────────────────────────────────
  freeformInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
    minWidth: 80,
    textAlign: 'center',
  },

  // ── Stepper ───────────────────────────────────────────────────────────────
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 22,
    color: Colors.white,
    lineHeight: 26,
    fontWeight: '600',
  },
  stepBtnDisabledText: {
    color: 'rgba(255,255,255,0.4)',
  },
  valueBox: {
    minWidth: 44,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // ── Shared ────────────────────────────────────────────────────────────────
  disabled: {
    opacity: 0.5,
  },
});
