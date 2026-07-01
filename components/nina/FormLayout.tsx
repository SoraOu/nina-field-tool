/**
 * FormLayout.tsx
 * Shared wrapper for every form section screen.
 * Renders: ProgressBar → scrollable content → fixed Next button.
 * Save Draft is wired into the header via navigation options.
 */
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import ProgressBar from './ProgressBar';
import { Colors } from '@/constants/colors';

interface FormLayoutProps {
  currentSection: number;
  onNavigate: (section: number) => void;
  onNext: () => Promise<void> | void;
  onSaveDraft: () => Promise<void> | void;
  saving?: boolean;
  nextLabel?: string;
  children: React.ReactNode;
}

export default function FormLayout({
  currentSection,
  onNavigate,
  onNext,
  onSaveDraft,
  saving = false,
  nextLabel = 'Next →',
  children,
}: FormLayoutProps) {
  const navigation = useNavigation();

  // Wire Save Draft into header right button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={onSaveDraft}
          style={styles.headerBtn}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.headerBtnText}>Save Draft</Text>
          }
        </TouchableOpacity>
      ),
    });
  }, [navigation, onSaveDraft, saving]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ProgressBar currentSection={currentSection} onNavigate={onNavigate} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        {/* Bottom padding so content clears the fixed Next button */}
        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Fixed Next button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
          onPress={onNext}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.nextBtnText}>{nextLabel}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  bottomPad: { height: 100 },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
