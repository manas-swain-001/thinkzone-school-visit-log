import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Tone = 'info' | 'warning' | 'danger' | 'success';

type Props = {
  tone?: Tone;
  title?: string;
  message: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
};

export function Banner({ tone = 'info', title, message, action, style }: Props) {
  return (
    <View style={[styles.banner, TONES[tone], style]}>
      <View style={styles.body}>
        {title ? <Text style={[styles.title, TITLE[tone]]}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
      {action ? (
        <Text
          accessibilityRole="button"
          onPress={action.onPress}
          style={[styles.action, ACTION[tone]]}
        >
          {action.label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  body: { flex: 1, gap: 2 },
  title: { ...typography.label },
  message: { ...typography.caption, color: colors.text, lineHeight: 18 },
  action: { ...typography.label },
});

const TONES = StyleSheet.create({
  info: { backgroundColor: colors.primarySoft, borderColor: '#BBD4E8' },
  warning: { backgroundColor: colors.warningSoft, borderColor: '#E8D2A4' },
  danger: { backgroundColor: colors.dangerSoft, borderColor: '#E9BDBB' },
  success: { backgroundColor: colors.successSoft, borderColor: '#B7DCC5' },
});

const TITLE = StyleSheet.create({
  info: { color: colors.primaryDark },
  warning: { color: colors.warning },
  danger: { color: colors.danger },
  success: { color: colors.success },
});

const ACTION = StyleSheet.create({
  info: { color: colors.primary },
  warning: { color: colors.warning },
  danger: { color: colors.danger },
  success: { color: colors.success },
});
