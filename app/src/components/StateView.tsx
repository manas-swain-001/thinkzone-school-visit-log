import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  kind: 'loading' | 'empty' | 'error' | 'info';
  title: string;
  message?: string | null;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * One component for every "there is a list but nothing to show" state, so
 * loading, empty and error all look deliberate instead of like a blank screen.
 */
export function StateView({ kind, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      {kind === 'loading' ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <View style={[styles.badge, BADGES[kind]]}>
          <Text style={styles.badgeText}>{GLYPHS[kind]}</Text>
        </View>
      )}

      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  badgeText: { fontSize: 24, fontWeight: '700' },
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
});

const BADGES = StyleSheet.create({
  empty: { backgroundColor: colors.primarySoft },
  error: { backgroundColor: colors.dangerSoft },
  info: { backgroundColor: colors.warningSoft },
});

const GLYPHS = { empty: '?', error: '!', info: 'i' } as const;
