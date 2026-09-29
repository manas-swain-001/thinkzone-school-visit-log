import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

/* ---------------------------------------------------------------- yes / no */

export function YesNoInput({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Choice label="Yes" selected={value === true} onPress={() => onChange(true)} testID="yes" />
      <Choice label="No" selected={value === false} onPress={() => onChange(false)} testID="no" />
    </View>
  );
}

/* ------------------------------------------------------------ single choice */

export function OptionInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.column}>
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === option }}
          onPress={() => onChange(option)}
          style={({ pressed }) => [
            styles.option,
            value === option ? styles.optionSelected : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <View style={[styles.radio, value === option ? styles.radioSelected : null]}>
            {value === option ? <View style={styles.radioDot} /> : null}
          </View>
          <Text style={[styles.optionLabel, value === option ? styles.optionLabelSelected : null]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------- free text */

export function TextAnswerInput({
  value,
  onChangeValue,
  maxLength,
  multiline = false,
  placeholder,
  ...rest
}: {
  value: string;
  // Not `onChange`: TextInput already has an onChange for focus events, and
  // shadowing it here is a trap.
  onChangeValue: (next: string) => void;
  maxLength?: number | null;
  multiline?: boolean;
  placeholder?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'maxLength'>) {
  return (
    <View style={styles.column}>
      <TextInput
        {...rest}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        value={value}
        onChangeText={onChangeValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        maxLength={maxLength ?? undefined}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {maxLength ? (
        <Text style={styles.counter}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------- number box */

export function NumberAnswerInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      style={[styles.input, styles.numberInput]}
      value={value}
      onChangeText={onChange}
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={5}
      placeholder={placeholder ?? '0'}
      placeholderTextColor={colors.textFaint}
    />
  );
}

/* ------------------------------------------------------------------ shared */

function Choice({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected ? styles.choiceSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.choiceLabel, selected ? styles.choiceLabelSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  column: { gap: spacing.sm },

  choice: {
    minWidth: 96,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceLabel: { ...typography.body, color: colors.text, fontWeight: '600' },
  choiceLabelSelected: { color: colors.surface },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLabel: { ...typography.body, color: colors.text, flex: 1 },
  optionLabelSelected: { color: colors.primaryDark, fontWeight: '700' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.primary },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },
  inputMultiline: { minHeight: 96 },
  numberInput: { minWidth: 140, width: 160 },
  counter: { ...typography.caption, color: colors.textFaint, alignSelf: 'flex-end' },
  pressed: { opacity: 0.75 },
});
