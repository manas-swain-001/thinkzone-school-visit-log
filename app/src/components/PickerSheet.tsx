import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type PickerOption = { value: string; label: string; sublabel?: string | null };

type Props = {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
};

/** A modal list used for the district and block pickers. */
export function PickerSheet({ visible, title, options, selected, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Close" />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <FlatList
            data={[{ value: '', label: 'All', sublabel: null }, ...options]}
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
                    onClose();
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
