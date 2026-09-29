import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, typography } from '@/theme';

type Props = {
  href: string;
  label: string;
};

/** A text action for the stack header. */
export function HeaderLink({ href, label }: Props) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" hitSlop={8} style={styles.pressable}>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  pressable: { paddingVertical: 4, paddingHorizontal: 4 },
  label: { ...typography.label, color: colors.primary, fontSize: 15 },
});
