import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { fetchHealth } from '@/api/endpoints';
import { describeError, isAbortError } from '@/api/errors';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useApp } from '@/providers/AppProvider';
import { useNetwork } from '@/providers/NetworkProvider';
import { useVisits } from '@/providers/VisitsProvider';
import { colors, radius, spacing, typography } from '@/theme';

type Probe =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; database: string }
  | { kind: 'error'; message: string };

export default function SettingsScreen() {
  const { user, apiBaseUrl, baseUrlOverridden, updateApiBaseUrl, signOut, users } = useApp();
  const { isOnline, connectionType, isChecking } = useNetwork();
  const { counts, sync, isSyncing } = useVisits();

  const [draft, setDraft] = useState(apiBaseUrl);
  const [saved, setSaved] = useState(false);
  const [probe, setProbe] = useState<Probe>({ kind: 'idle' });

  const test = async () => {
    setProbe({ kind: 'testing' });
    try {
      const health = await fetchHealth();
      setProbe({ kind: 'ok', database: health.database });
    } catch (error) {
      if (isAbortError(error)) return;
      setProbe({ kind: 'error', message: describeError(error).message });
    }
  };

  const save = async () => {
    const next = await updateApiBaseUrl(draft);
    setDraft(next);
    setSaved(true);
    setProbe({ kind: 'idle' });
    await sync();
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Section title="User">
          <Text style={styles.body}>
            {user ? `${user.userName} (${user.userId}) · ${user.role}` : 'No user selected.'}
          </Text>
          <Text style={styles.hint}>
            Visits are stored against this userId, and the server checks it against the three
            seeded demo users.
          </Text>
          <View style={styles.row}>
            <Button
              label={`${counts.pending} pending · ${counts.failed} failed`}
              variant="secondary"
              onPress={() => router.push('/visits')}
              style={styles.grow}
            />
            <Button
              label="Change"
              variant="secondary"
              onPress={async () => {
                await signOut();
                router.replace('/');
              }}
            />
          </View>
        </Section>

        <Section title="Connection">
          <Row label="Device network" value={isChecking ? 'checking…' : isOnline ? 'online' : 'offline'} />
          <Row label="Type" value={connectionType} />
          <Text style={styles.hint}>
            Visits queue on the device whenever this is offline and are sent automatically when the
            network returns.
          </Text>
        </Section>

        <Section title="API address">
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              setSaved(false);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.1.131:3000"
            placeholderTextColor={colors.textFaint}
          />
          <Text style={styles.hint}>
            On a real phone this must be your laptop&apos;s LAN IP, not 127.0.0.1 — from the phone,
            127.0.0.1 is the phone itself. An Android emulator uses 10.0.2.2. The value is stored
            on this device, so the same build works on a different Wi-Fi.
            {baseUrlOverridden ? ' Currently overridden from the bundled default.' : ''}
          </Text>

          <View style={styles.row}>
            <Button label="Save and sync" onPress={() => void save()} style={styles.grow} />
            <Button
              label="Test"
              variant="secondary"
              onPress={() => void test()}
              busy={probe.kind === 'testing'}
            />
          </View>

          {saved ? <Banner tone="success" message="Saved on this device." /> : null}

          {probe.kind === 'ok' ? (
            <Banner
              tone="success"
              title="Server reachable"
              message={`GET /api/health responded. Database: ${probe.database}.`}
            />
          ) : null}
          {probe.kind === 'error' ? (
            <Banner tone="danger" title="Server unreachable" message={probe.message} />
          ) : null}
        </Section>

        <Section title="Demo users">
          {users.map((candidate) => (
            <Row
              key={candidate.userId}
              label={`${candidate.userId} · ${candidate.userName}`}
              value={candidate.role}
            />
          ))}
        </Section>

        <Button
          label="Sync now"
          variant="secondary"
          disabled={isSyncing}
          busy={isSyncing}
          onPress={() => void sync({ force: true })}
        />
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowLine}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.text },
  hint: { ...typography.caption, color: colors.textFaint, lineHeight: 17 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  grow: { flex: 1 },
  rowLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { ...typography.caption, color: colors.text, flexShrink: 1 },
  rowValue: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
});
