import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
}: Props) {
  const inactive = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        VARIANTS[variant],
        pressed && !inactive ? styles.pressed : null,
        inactive ? styles.disabled : null,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.surface : colors.primary}
        />
      ) : (
        <Text style={[styles.label, LABEL_VARIANTS[variant], inactive ? styles.labelDisabled : null]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.8 },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
  label: { ...typography.label, fontSize: 15 },
  labelDisabled: { color: colors.surface },
});

const VARIANTS: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
};

const LABEL_VARIANTS = StyleSheet.create({
  primary: { color: colors.surface },
  secondary: { color: colors.primary },
  danger: { color: colors.surface },
  ghost: { color: colors.primary },
});
