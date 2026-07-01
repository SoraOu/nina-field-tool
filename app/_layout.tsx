import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Image, Text } from 'react-native';
import { initDatabase } from '@/db/database';
import { Colors } from '@/constants/colors';

// New: shows the two logos with the app name between them
function HeaderTitle() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Image
        source={require('../assets/images/mogpog-logo.png')}
        style={{ width: 28, height: 28, borderRadius: 14 }}
        resizeMode="contain"
      />
      <Text style={{ color: Colors.white, fontWeight: '600', fontSize: 16 }}>
        NINA Field Tool
      </Text>
      <Image
        source={require('../assets/images/nnc-logo.png')}
        style={{ width: 28, height: 28, borderRadius: 14 }}
        resizeMode="contain"
      />
    </View>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((e) => {
        console.error('[DB] Init failed:', e);
        setDbReady(true); // still render so the error is visible
      });
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
            // soft rounded bottom edge on the header bar
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: '600' },
          headerTitleAlign: 'center',
          contentStyle: { backgroundColor: Colors.surface },
        }}
      >
        <Stack.Screen
          name="(home)/index"
          options={{ headerTitle: () => <HeaderTitle /> }}
        />
        <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
        <Stack.Screen
          name="assessment/[eventId]/index"
          options={{ title: 'Event Assessments' }}
        />
        <Stack.Screen
          name="assessment/[eventId]/[assessmentId]/s1-disaster"
          options={{ title: 'Section 1 — Disaster Setup' }}
        />
        <Stack.Screen
          name="assessment/[eventId]/[assessmentId]/s2-geo-team"
          options={{ title: 'Section 2 — Geographic & Team Info' }}
        />
        <Stack.Screen
          name="assessment/[eventId]/[assessmentId]/s3-respondents"
          options={{ title: 'Section 3 — Respondents' }}
        />
        <Stack.Screen
          name="assessment/[eventId]/[assessmentId]/s4-demographics"
          options={{ title: 'Section 4 — Demographics' }}
        />
        <Stack.Screen
          name="assessment/[eventId]/[assessmentId]/s5-iycf"
          options={{ title: 'Section 5 — IYCF Services & Supplies' }}
        />
        <Stack.Screen
          name="assessment/[eventId]/[assessmentId]/s6-tools-mam"
          options={{ title: 'Section 6 — Tools & MAM Commodities' }}
        />
        <Stack.Screen
          name="assessment/[eventId]/[assessmentId]/s7-relief-notes"
          options={{ title: 'Section 7 — Relief, Gaps & Notes' }}
        />
        <Stack.Screen
          name="assessment/[eventId]/[assessmentId]/review"
          options={{ title: 'Review & Export' }}
        />
      </Stack>
    </>
  );
}