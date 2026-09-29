import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
};

/** A filter control that opens a PickerSheet. */
export function FilterChip({ label, value, placeholder, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, value ? styles.chipActive : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.text}>
        <Text style={[styles.label, value ? styles.labelActive : null]}>
          {label}: {value ?? placeholder}
        </Text>
      </View>
      <Text style={[styles.caret, value ? styles.labelActive : null]}>▾</Text>
    </Pressable>
  );
}

export function ActiveFilter({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Pressable onPress={onClear} hitSlop={6} style={styles.pill}>
      <Text style={styles.pillText} numberOfLines={1}>
        {label} ✕
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 40,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.75 },
  text: { flex: 1 },
  label: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  labelActive: { color: colors.primaryDark },
  caret: { ...typography.caption, color: colors.textMuted, marginLeft: spacing.xs },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    maxWidth: 220,
  },
  pillText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },
});
