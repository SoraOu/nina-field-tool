import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export default function EventDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>EventDetailScreen — coming in a future phase</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
});
