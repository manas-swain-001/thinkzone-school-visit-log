import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { HeaderLink } from '@/components/HeaderLink';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { useApp } from '@/providers/AppProvider';
import { useNetwork } from '@/providers/NetworkProvider';
import { useVisits } from '@/providers/VisitsProvider';
import { colors, radius, spacing, typography } from '@/theme';

export default function ChooseUserScreen() {
  const { ready, user, users, chooseUser, signOut } = useApp();
  const { isOnline } = useNetwork();
  const { counts } = useVisits();
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return (
      <Screen>
        <StateView kind="loading" title="Loading" />
      </Screen>
    );
  }

  const onPick = async (userId: string) => {
    setBusy(true);
    await chooseUser(userId);
    setBusy(false);
    router.replace('/schools');
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Who is logging visits?</Text>
            <Text style={styles.subtitle}>
              There is no password. Your choice is remembered on this phone.
            </Text>
          </View>
          <HeaderLink href="/settings" label="Settings" />
        </View>

        <View style={styles.list}>
          {users.map((candidate) => {
            const selected = user?.userId === candidate.userId;
            const pending = counts.pending;

            return (
              <Pressable
                key={candidate.userId}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => void onPick(candidate.userId)}
                style={({ pressed }) => [
                  styles.card,
                  selected ? styles.cardSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{candidate.userName}</Text>
                  <Text style={styles.meta}>
                    {candidate.userId} · {candidate.role}
                  </Text>
                  {selected && pending > 0 ? (
                    <Text style={styles.meta}>{pending} visit(s) waiting to sync</Text>
                  ) : null}
                </View>
                <View style={[styles.tick, selected ? styles.tickSelected : null]}>
                  {selected ? <Text style={styles.tickMark}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {!isOnline ? (
          <Text style={styles.offlineNote}>
            You are offline. That is fine — a visit can be recorded and will sync later.
          </Text>
        ) : null}

        {user ? (
          <View style={styles.actions}>
            <Button
              label={`Continue as ${user.userName}`}
              onPress={() => router.replace('/schools')}
              busy={busy}
            />
            <Button label="Choose a different user" variant="ghost" onPress={() => void signOut()} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
  list: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.8 },
  cardBody: { flex: 1, gap: 2 },
  name: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  tick: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tickMark: { color: colors.surface, fontSize: 14, fontWeight: '700' },
  offlineNote: { ...typography.caption, color: colors.warning },
  actions: { gap: spacing.sm },
});
