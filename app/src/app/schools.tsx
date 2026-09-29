import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Banner } from '@/components/Banner';
import { HeaderLink } from '@/components/HeaderLink';
import { PickerSheet, type PickerOption } from '@/components/PickerSheet';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { ActiveFilter, FilterChip } from '@/components/FilterChip';
import type { SchoolRow } from '@/api/types';
import { blocksFor, districtName, districts } from '@/data/districts';
import { useSchoolSearch } from '@/hooks/useSchoolSearch';
import { useNetwork } from '@/providers/NetworkProvider';
import { useVisits } from '@/providers/VisitsProvider';
import { colors, radius, spacing, typography } from '@/theme';

type OpenPicker = 'district' | 'block' | null;

export default function SelectSchoolScreen() {
  const { isOnline } = useNetwork();
  const { counts, isSyncing } = useVisits();

  const [search, setSearch] = useState('');
  const [districtCode, setDistrictCode] = useState<string | null>(null);
  const [blockCode, setBlockCode] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);

  const filters = useMemo(
    () => ({ search, districtCode, blockCode }),
    [search, districtCode, blockCode]
  );
  const { schools, isLoading, isLoadingMore, isRefreshing, error, hasMore, isFromCache, total, loadMore, refresh } =
    useSchoolSearch(filters);

  const districtOptions = useMemo<PickerOption[]>(
    () =>
      districts.map((entry) => ({
        value: entry.districtCode,
        label: entry.districtName,
        sublabel: entry.districtCode,
      })),
    []
  );

  const blockOptions = useMemo<PickerOption[]>(
    () =>
      blocksFor(districtCode).map((block) => ({
        value: block.blockCode,
        label: block.blockName,
        sublabel: block.blockCode,
      })),
    [districtCode]
  );

  const openSchool = useCallback((school: SchoolRow) => {
    router.push({
      pathname: '/visit',
      params: { udise: school.udiseCode, name: school.schoolName },
    });
  }, []);

  const changeDistrict = (value: string | null) => {
    setDistrictCode(value);
    setBlockCode(null);
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.searchRow}>
        <TextInput
          testID="school-search"
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="School name or UDISE code"
          placeholderTextColor={colors.textFaint}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {isLoading ? <ActivityIndicator style={styles.searchSpinner} color={colors.primary} /> : null}
      </View>

      <View style={styles.filterRow}>
        <FilterChip
          label="District"
          value={districtName(districtCode)}
          placeholder="All districts"
          onPress={() => setOpenPicker('district')}
        />
        <FilterChip
          label="Block"
          value={blockOptions.find((block) => block.value === blockCode)?.label ?? null}
          placeholder={districtCode ? 'All blocks' : 'Pick a district'}
          onPress={() => setOpenPicker('block')}
        />
      </View>

      {districtCode || blockCode ? (
        <View style={styles.activeFilters}>
          {districtCode ? (
            <ActiveFilter
              label={districtName(districtCode) ?? districtCode}
              onClear={() => changeDistrict(null)}
            />
          ) : null}
          {blockCode ? <ActiveFilter label={blockCode} onClear={() => setBlockCode(null)} /> : null}
        </View>
      ) : null}

      {!isOnline ? (
        <Banner
          tone="warning"
          title="Offline"
          message="Showing schools already loaded on this phone. A school that was never loaded cannot be found until you are back online."
        />
      ) : null}

      {error ? (
        <Banner
          tone="danger"
          title="Could not load schools"
          message={error}
          action={{ label: 'Retry', onPress: refresh }}
        />
      ) : null}

      {!isLoading && !error ? (
        <Text style={styles.count}>
          {total} school{total === 1 ? '' : 's'}
          {isFromCache ? ' on this phone' : ''}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Screen edges={['bottom']} style={styles.screen}>
      <FlatList
        data={schools}
        keyExtractor={(item) => item.udiseCode}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            enabled={isOnline}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => openSchool(item)}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
          >
            <View style={styles.rowBody}>
              <Text style={styles.schoolName} numberOfLines={2}>
                {item.schoolName}
              </Text>
              <Text style={styles.schoolMeta} numberOfLines={1}>
                {[item.clusterName, item.blockName].filter(Boolean).join(' · ') || '—'}
              </Text>
              <Text style={styles.udise}>{item.udiseCode}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <StateView kind="loading" title="Loading schools" />
          ) : error ? null : (
            <StateView
              kind="empty"
              title="No schools found"
              message={
                search.trim()
                  ? `Nothing matches “${search.trim()}”. Try part of the name, or the start of a UDISE code.`
                  : 'No schools match these filters. Clear a filter to widen the search.'
              }
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {isLoadingMore ? <ActivityIndicator color={colors.primary} /> : null}
            {!isLoadingMore && schools.length > 0 && !hasMore ? (
              <Text style={styles.footerText}>
                {isSyncing ? 'Syncing visits…' : `End of results · ${schools.length} shown`}
              </Text>
            ) : null}
          </View>
        }
      />

      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <HeaderLink href="/visits" label="My visits" />
              <HeaderLink href="/settings" label="Settings" />
            </View>
          ),
        }}
      />

      {counts.pending > 0 ? (
        <View style={styles.pendingBar}>
          <Text style={styles.pendingText}>
            {counts.pending} visit{counts.pending === 1 ? '' : 's'} waiting to sync
          </Text>
          <Pressable onPress={() => router.push('/visits')} hitSlop={8}>
            <Text style={styles.pendingLink}>View</Text>
          </Pressable>
        </View>
      ) : null}

      <PickerSheet
        visible={openPicker === 'district'}
        title="District"
        options={districtOptions}
        selected={districtCode}
        onSelect={changeDistrict}
        onClose={() => setOpenPicker(null)}
      />
      <PickerSheet
        visible={openPicker === 'block'}
        title={districtCode ? `Blocks in ${districtName(districtCode)}` : 'Pick a district first'}
        options={blockOptions}
        selected={blockCode}
        onSelect={setBlockCode}
        onClose={() => setOpenPicker(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  headerActions: { flexDirection: 'row', gap: spacing.lg },
  listContent: { paddingBottom: 88 },
  header: { padding: spacing.lg, gap: spacing.md },
  searchRow: { justifyContent: 'center' },
  search: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },
  searchSpinner: { position: 'absolute', right: spacing.md },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  activeFilters: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  count: { ...typography.caption, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.primarySoft },
  rowBody: { flex: 1, gap: 2 },
  schoolName: { ...typography.body, color: colors.text, fontWeight: '600' },
  schoolMeta: { ...typography.caption, color: colors.textMuted },
  udise: { ...typography.caption, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  chevron: { fontSize: 24, color: colors.textFaint },
  footer: { padding: spacing.lg, minHeight: 56, alignItems: 'center' },
  footerText: { ...typography.caption, color: colors.textFaint },
  pendingBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  pendingText: { ...typography.caption, color: colors.surface, flex: 1 },
  pendingLink: { ...typography.label, color: colors.surface, textDecorationLine: 'underline' },
});
