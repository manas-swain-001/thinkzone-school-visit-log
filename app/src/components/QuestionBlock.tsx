import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type Props = {
  index: number;
  text: string;
  hint?: string | null;
  optional?: boolean;
  error?: string | null;
  children: React.ReactNode;
};

/** One questionnaire question plus whatever input its type needs. */
export function QuestionBlock({ index, text, hint, optional, error, children }: Props) {
  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.number}>{index}</Text>
        <View style={styles.headerText}>
          <Text style={styles.label}>
            {text}
            {optional ? <Text style={styles.optional}>  (optional)</Text> : null}
          </Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      </View>

      <View style={styles.control}>{children}</View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  number: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    minWidth: 22,
    height: 22,
    lineHeight: 22,
    textAlign: 'center',
    borderRadius: 11,
    overflow: 'hidden',
    fontWeight: '700',
  },
  headerText: { flex: 1, gap: 2 },
  label: { ...typography.body, color: colors.text, fontWeight: '600', lineHeight: 21 },
  optional: { ...typography.caption, color: colors.textFaint, fontWeight: '400' },
  hint: { ...typography.caption, color: colors.textMuted },
  control: { marginLeft: 34 },
  error: { ...typography.caption, color: colors.danger, marginLeft: 34 },
});
