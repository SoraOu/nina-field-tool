/**
 * ProgressBar.tsx
 * 7-segment progress bar fixed below the navigation header on every form screen.
 * Tapping a completed segment (index < currentSection) navigates back to it.
 * Forward navigation is only via the Next button — tapping ahead is blocked.
 */
import { View, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Colors } from '@/constants/colors';

interface ProgressBarProps {
  /** 1-based current section index (1–7) */
  currentSection: number;
  /** Called when user taps a completed segment to jump back */
  onNavigate: (section: number) => void;
}

const TOTAL = 7;

export default function ProgressBar({ currentSection, onNavigate }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: TOTAL }, (_, i) => {
        const section = i + 1;
        const filled = section <= currentSection;
        const tappable = section < currentSection; // only backward jumps

        return (
          <TouchableOpacity
            key={section}
            style={[
              styles.segment,
              filled ? styles.filled : styles.empty,
              i < TOTAL - 1 && styles.segmentGap,
            ]}
            onPress={() => {
              if (tappable) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onNavigate(section);
              }
            }}
            activeOpacity={tappable ? 0.7 : 1}
            accessibilityRole="button"
            accessibilityLabel={`Section ${section}${filled ? ', completed' : ''}${tappable ? ', tap to go back' : ''}`}
            accessibilityState={{ selected: section === currentSection }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  segmentGap: {
    marginRight: 4,
  },
  filled: {
    backgroundColor: Colors.white,
  },
  empty: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
