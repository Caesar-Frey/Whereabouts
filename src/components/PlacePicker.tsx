import { useMemo, type Ref } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';

import { parsePathInput, PATH_SEPARATOR } from '@/lib/locations';
import { createSearchIndex } from '@/search/fuzzy';
import { useData, useRecentPlaces } from '@/state/data';
import { SpineChip, T, TypedInput } from '@/ui/components';
import { CameraIcon, PigeonholeIcon } from '@/ui/icons';

import { scanBox, useBoxMatcher } from './BoxScanner';
import { usePalette } from '@/ui/theme';

/**
 * Where something lives, typed as a path ("Garage > Blue box") or picked from
 * remembered places. Missing parts of the path are created on save.
 */
export function PlacePicker({
  value,
  onChange,
  label = 'Where is it?',
  autoFocus,
  onSubmit,
  inputRef,
}: {
  value: string;
  onChange: (path: string) => void;
  label?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  inputRef?: Ref<TextInputInstance>;
}) {
  const p = usePalette();
  const { locations, index } = useData();
  const recent = useRecentPlaces(10);
  const { hasBoxes, match } = useBoxMatcher();

  /** Picks the place by photographing the box it's going into. */
  const scanForPlace = async () => {
    const scan = await scanBox('Photograph the box it goes in');
    if (!scan) return;
    const ranked = match(scan.view).filter((r) => r.strength !== 'weak' && index.byId.has(r.value));
    const top = ranked[0];
    if (!top) {
      Alert.alert('No box matched', 'Type the place instead. You can fingerprint a box from its shelf page.');
      return;
    }
    if (top.strength === 'strong') {
      onChange(index.pathString(top.value));
      return;
    }
    Alert.alert('Which box?', undefined, [
      ...ranked.slice(0, 2).map((r) => ({ text: index.pathString(r.value), onPress: () => onChange(index.pathString(r.value)) })),
      { text: 'Neither', style: 'cancel' as const },
    ]);
  };

  const placeIndex = useMemo(
    () =>
      createSearchIndex(
        locations.map((l) => ({
          value: l,
          rank: l.lastUsedAt,
          fields: [
            { text: l.name, weight: 1 },
            { text: index.pathNames(l.parentId).join(' '), weight: 0.5 },
          ],
        })),
      ),
    [locations, index],
  );

  const names = parsePathInput(value);
  const normalizedValue = names.join(PATH_SEPARATOR);
  const typedLast = names[names.length - 1] ?? '';

  const suggestions = useMemo(() => {
    if (!typedLast) return [];
    return placeIndex
      .search(names.join(' '), 6)
      .map((h) => h.value)
      .filter((l) => index.pathString(l.id).toLowerCase() !== normalizedValue.toLowerCase());
  }, [placeIndex, names, typedLast, index, normalizedValue]);

  // Which leading parts of the typed path already exist?
  const existing = useMemo(() => {
    let parent: string | null = null;
    let count = 0;
    for (const n of names) {
      const match: { id: string } | undefined = (index.children.get(parent) ?? []).find(
        (c) => c.name.toLowerCase() === n.toLowerCase(),
      );
      if (!match) break;
      parent = match.id;
      count++;
    }
    return count;
  }, [names, index]);

  return (
    <View style={{ gap: 10 }}>
      <TypedInput
        ref={inputRef}
        label={label}
        value={value}
        onChangeText={onChange}
        autoFocus={autoFocus}
        placeholder="e.g. Garage > Blue box"
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        accessibilityHint="Separate nested places with a greater-than sign"
      />

      {hasBoxes && (
        <Pressable accessibilityRole="button" onPress={scanForPlace} hitSlop={8} style={styles.scan}>
          <CameraIcon size={16} color={p.leatherText} />
          <T variant="small" color={p.leatherText}>
            Scan the box it goes in
          </T>
        </Pressable>
      )}

      {names.length > 0 && (
        <View style={styles.pathRow}>
          {names.map((n, i) => (
            <View key={`${i}-${n}`} style={styles.pathPart}>
              {i > 0 && <T variant="small"> › </T>}
              <T variant="small" color={i < existing ? p.lampText : p.leatherText}>
                {n}
                {i >= existing ? ' (new)' : ''}
              </T>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a place inside this one"
            hitSlop={10}
            onPress={() => onChange(`${normalizedValue}${PATH_SEPARATOR}`)}
            style={[styles.inside, { borderColor: p.inkFaint }]}
          >
            <T variant="small">+ inside</T>
          </Pressable>
        </View>
      )}

      {suggestions.length > 0 && (
        <View style={[styles.suggestions, { borderColor: p.cardEdge, backgroundColor: p.card }]}>
          {suggestions.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="button"
              onPress={() => onChange(index.pathString(l.id))}
              style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: p.cardEdge }]}
            >
              <PigeonholeIcon size={18} color={p.inkSoft} />
              <T variant="typed" numberOfLines={1} style={{ flex: 1 }}>
                {index.pathString(l.id)}
              </T>
            </Pressable>
          ))}
        </View>
      )}

      {(!typedLast || existing === names.length) && recent.length > 0 && (
        <View style={{ gap: 6 }}>
          <T variant="label">Recently used shelves</T>
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
          >
            {recent.map((l) => {
              const path = index.pathString(l.id);
              return (
                <SpineChip
                  key={l.id}
                  label={l.name}
                  hint={index.pathNames(l.parentId).join(' › ') || undefined}
                  selected={path === normalizedValue}
                  onPress={() => onChange(path)}
                />
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scan: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  pathRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 2 },
  pathPart: { flexDirection: 'row', alignItems: 'center' },
  inside: { marginLeft: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 1 },
  suggestions: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 4 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
});
