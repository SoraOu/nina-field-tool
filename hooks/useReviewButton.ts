/**
 * hooks/useReviewButton.ts
 * Adds a "Review" button to the header right of any section screen.
 * Call this in every S1–S7 screen to allow jumping back to review at any time.
 *
 * Usage:
 *   import { useReviewButton } from '@/hooks/useReviewButton';
 *   // inside the component:
 *   useReviewButton(eventId, assessmentId);
 */
import { useLayoutEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';

export function useReviewButton(eventId: string | number, assessmentId: string | number) {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push(`/assessment/${eventId}/${assessmentId}/review`)}
          style={styles.btn}
          accessibilityLabel="Go to Review"
        >
          <Text style={styles.label}>Review</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, router, eventId, assessmentId]);
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 4, paddingVertical: 2, marginRight: 4 },
  label: { fontSize: 15, fontWeight: '600', color: Colors.white },
});
