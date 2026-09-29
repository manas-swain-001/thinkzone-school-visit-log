import { StyleSheet, Text, View } from 'react-native';

import type { VisitStatus } from '@/sync/types';
import { colors, radius, spacing, typography } from '@/theme';

const LABELS: Record<VisitStatus, string> = {
  synced: 'Synced',
  pending: 'Pending',
  failed: 'Failed',
};

export function StatusPill({ status }: { status: VisitStatus }) {
  return (
    <View style={[styles.pill, PILL[status]]}>
      <View style={[styles.dot, DOT[status]]} />
      <Text style={[styles.label, LABEL[status]]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    gap: 5,
  },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
  label: { ...typography.caption, fontWeight: '700' },
});

const PILL = StyleSheet.create({
  synced: { backgroundColor: colors.successSoft },
  pending: { backgroundColor: colors.warningSoft },
  failed: { backgroundColor: colors.dangerSoft },
});

const DOT = StyleSheet.create({
  synced: { backgroundColor: colors.success },
  pending: { backgroundColor: colors.warning },
  failed: { backgroundColor: colors.danger },
});

const LABEL = StyleSheet.create({
  synced: { color: colors.success },
  pending: { color: colors.warning },
  failed: { color: colors.danger },
});
