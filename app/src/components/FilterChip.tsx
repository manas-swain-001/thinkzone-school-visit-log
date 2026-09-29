import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
};

/** A dropdown-style filter control with visible label, placeholder, and arrow. */
export function FilterChip({ label, value, placeholder, onPress, disabled = false }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.dropdown,
          value ? styles.dropdownActive : null,
          disabled ? styles.dropdownDisabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.valueText,
            !value ? styles.placeholderText : null,
            value ? styles.valueActiveText : null,
            disabled ? styles.disabledText : null,
          ]}
        >
          {value ?? placeholder}
        </Text>
        <Text style={[styles.caret, value ? styles.caretActive : null, disabled ? styles.disabledText : null]}>
          ▼
        </Text>
      </Pressable>
    </View>
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
  wrapper: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.surface,
  },
  dropdownActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  dropdownDisabled: {
    backgroundColor: '#EEF2F6',
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  valueText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    marginRight: spacing.xs,
  },
  valueActiveText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  placeholderText: {
    color: colors.textFaint,
    fontWeight: '400',
  },
  disabledText: {
    color: colors.disabled,
  },
  caret: {
    fontSize: 10,
    color: colors.textMuted,
  },
  caretActive: {
    color: colors.primaryDark,
  },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pillText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
});
