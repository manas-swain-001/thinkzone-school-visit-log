import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { HeaderLink } from '@/components/HeaderLink';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { StatusPill } from '@/components/StatusPill';
import { formatIstTimestamp, formatRelativeIst } from '@/lib/ist';
import { useApp } from '@/providers/AppProvider';
import { useNetwork } from '@/providers/NetworkProvider';
import { useVisits } from '@/providers/VisitsProvider';
import type { LocalVisit, VisitStatus } from '@/sync/types';
import { colors, radius, spacing, typography } from '@/theme';

type Filter = 'all' | VisitStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'synced', label: 'Synced' },
  { value: 'failed', label: 'Failed' },
];

export default function MyVisitsScreen() {
  const { user } = useApp();
  const { isOnline, isChecking } = useNetwork();
  const { myVisits, counts, isSyncing, sync, retryFailed } = useVisits();

  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'all' ? myVisits : myVisits.filter((visit) => visit.status === filter)),
    [myVisits, filter]
  );

  const openVisit = useCallback((visit: LocalVisit) => {
    router.push({ pathname: '/visits/[clientId]', params: { clientId: visit.clientId } });
  }, []);

  if (!user) {
    return (
      <Screen style={styles.screen}>
        <Stack.Screen options={{ headerRight: () => <HeaderLink href="/" label="Choose user" /> }} />
        <StateView
          kind="info"
          title="No user selected"
          message="Pick who you are before looking at visits."
          actionLabel="Choose user"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderLink href="/settings" label="Settings" />,
        }}
      />

      <FlatList
        data={visible}
        keyExtractor={(item) => item.clientId}
        contentContainerStyle={styles.list}
        initialNumToRender={12}
        windowSize={9}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.summary}>
              <Text style={styles.who}>{user.userName}</Text>
              <Text style={styles.whoMeta}>
                {user.userId} · {user.role}
              </Text>
            </View>

            <View style={styles.tallies}>
              <Tally label="Synced" value={counts.synced} tone="synced" />
              <Tally label="Pending" value={counts.pending} tone="pending" />
              <Tally label="Failed" value={counts.failed} tone="failed" />
            </View>

            {!isChecking && !isOnline ? (
              <Banner
                tone="warning"
                title="Offline"
                message="Pending visits will be sent automatically when the network comes back."
              />
            ) : null}

            <View style={styles.actions}>
              <Button
                label={isSyncing ? 'Syncing…' : 'Sync now'}
                variant="secondary"
                busy={isSyncing}
                disabled={!isOnline}
                onPress={() => void sync()}
                style={styles.actionButton}
              />
              {counts.failed > 0 ? (
                <Button
                  label="Retry failed"
                  variant="secondary"
                  disabled={!isOnline}
                  onPress={() => void retryFailed()}
                  style={styles.actionButton}
                />
              ) : null}
              <Button
                label="New visit"
                onPress={() => router.push('/schools')}
                style={styles.actionButton}
              />
            </View>

            <View style={styles.filters}>
              {FILTERS.map((option) => {
                const count =
                  option.value === 'all' ? myVisits.length : counts[option.value];
                const active = filter === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => setFilter(option.value)}
                    style={[styles.filterChip, active ? styles.filterChipActive : null]}
                  >
                    <Text style={[styles.filterLabel, active ? styles.filterLabelActive : null]}>
                      {option.label} {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => openVisit(item)}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
          >
            <View style={styles.rowMain}>
              <Text style={styles.school} numberOfLines={2}>
                {item.schoolName}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.udiseCode}
              </Text>
              <Text style={styles.meta}>
                {formatIstTimestamp(item.visitedAt)} IST · {formatRelativeIst(item.visitedAt)}
              </Text>
              {item.status === 'failed' && item.failure ? (
                <Text style={styles.failure} numberOfLines={2}>
                  {item.failure.message}
                </Text>
              ) : null}
              {item.status === 'pending' && item.attempts > 0 ? (
                <Text style={styles.pendingNote}>Attempt {item.attempts} · will retry</Text>
              ) : null}
            </View>
            <View style={styles.rowSide}>
              <StatusPill status={item.status} />
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          myVisits.length === 0 ? (
            <StateView
              kind="empty"
              title="No visits yet"
              message="Log a visit and it will appear here, whether or not it has reached the server."
              actionLabel="Log a visit"
              onAction={() => router.push('/schools')}
            />
          ) : (
            <StateView
              kind="empty"
              title={`Nothing ${filter}`}
              message="No visit currently has that status."
            />
          )
        }
        ListFooterComponent={isSyncing ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
      />
    </Screen>
  );
}

function Tally({ label, value, tone }: { label: string; value: number; tone: VisitStatus }) {
  return (
    <View style={[styles.tally, TALLY[tone]]}>
      <Text style={[styles.tallyValue, TALLY_TEXT[tone]]}>{value}</Text>
      <Text style={[styles.tallyLabel, TALLY_TEXT[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  list: { paddingBottom: spacing.xl },
  header: { padding: spacing.lg, gap: spacing.md },
  summary: { gap: 2 },
  who: { ...typography.heading, color: colors.text },
  whoMeta: { ...typography.caption, color: colors.textMuted },
  tallies: { flexDirection: 'row', gap: spacing.sm },
  tally: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 2 },
  tallyValue: { fontSize: 22, fontWeight: '700' },
  tallyLabel: { ...typography.caption, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionButton: { flexGrow: 1, minWidth: 120 },
  filters: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  filterLabelActive: { color: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: { backgroundColor: colors.primarySoft },
  rowMain: { flex: 1, gap: 2 },
  rowSide: { alignItems: 'flex-end', gap: spacing.sm },
  school: { ...typography.body, color: colors.text, fontWeight: '600' },
  meta: { ...typography.caption, color: colors.textMuted },
  failure: { ...typography.caption, color: colors.danger, marginTop: 2 },
  pendingNote: { ...typography.caption, color: colors.warning, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textFaint },
  footer: { paddingVertical: spacing.xl },
});

const TALLY = StyleSheet.create({
  synced: { backgroundColor: colors.successSoft },
  pending: { backgroundColor: colors.warningSoft },
  failed: { backgroundColor: colors.dangerSoft },
});

const TALLY_TEXT = StyleSheet.create({
  synced: { color: colors.success },
  pending: { color: colors.warning },
  failed: { color: colors.danger },
});
