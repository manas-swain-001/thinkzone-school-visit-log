import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/providers/AppProvider';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { VisitsProvider } from '@/providers/VisitsProvider';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NetworkProvider>
          <VisitsProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTitleStyle: { color: colors.text, fontWeight: '700' },
                headerTintColor: colors.primary,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" options={{ title: 'School Visit Log' }} />
              <Stack.Screen name="schools" options={{ title: 'Select school' }} />
              <Stack.Screen name="visit" options={{ title: 'Visit form' }} />
              <Stack.Screen name="visits" options={{ title: 'My visits' }} />
              <Stack.Screen name="visits/[clientId]" options={{ title: 'Visit details' }} />
              <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            </Stack>
          </VisitsProvider>
        </NetworkProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
