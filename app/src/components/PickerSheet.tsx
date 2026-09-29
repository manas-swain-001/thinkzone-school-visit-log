import { useState, useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type PickerOption = { value: string; label: string; sublabel?: string | null };

type Props = {
  visible: boolean;
  title: string;
  allLabel?: string;
  options: PickerOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
};

/** A modal list used for the district and block pickers. */
export function PickerSheet({
  visible,
  title,
  allLabel = 'All',
  options,
  selected,
  onSelect,
  onClose,
}: Props) {
  const [filterText, setFilterText] = useState('');

  const filteredOptions = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, filterText]);

  const handleClose = () => {
    setFilterText('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={handleClose} accessibilityLabel="Close" />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <Text style={styles.close}>Done</Text>
            </Pressable>
          </View>

          {options.length > 6 ? (
            <View style={styles.searchWrapper}>
              <TextInput
                style={styles.searchInput}
                value={filterText}
                onChangeText={setFilterText}
                placeholder="Search..."
                placeholderTextColor={colors.textFaint}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>
          ) : null}

          <FlatList
            data={[{ value: '', label: allLabel, sublabel: null }, ...filteredOptions]}
            keyExtractor={(item) => item.value || 'all'}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = (selected ?? '') === item.value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onSelect(item.value === '' ? null : item.value);
                    handleClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    isSelected ? styles.rowSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={styles.rowText}>
                    <Text style={[styles.label, isSelected ? styles.labelSelected : null]}>
                      {item.label}
                    </Text>
                    {item.sublabel ? <Text style={styles.sublabel}>{item.sublabel}</Text> : null}
                  </View>
                  {isSelected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,20,30,0.45)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.heading, color: colors.text },
  close: { ...typography.label, color: colors.primary },
  searchWrapper: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#F0F4F8',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowSelected: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.75 },
  rowText: { flex: 1 },
  label: { ...typography.body, color: colors.text },
  labelSelected: { color: colors.primaryDark, fontWeight: '700' },
  sublabel: { ...typography.caption, color: colors.textMuted },
  check: { color: colors.primary, fontSize: 16, fontWeight: '700' },
});
