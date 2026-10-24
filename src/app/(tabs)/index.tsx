import { router } from 'expo-router';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemCard } from '@/components/ItemCard';
import type { Item, Location } from '@/db/types';
import { buildCatalog } from '@/search/catalog';
import { useData } from '@/state/data';
import { LibraryButton, Room, SectionLabel, SpineChip, Stamp, T } from '@/ui/components';
import { CloseIcon, LoupeIcon } from '@/ui/icons';
import { fonts, usePalette } from '@/ui/theme';

export default function CatalogScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { items, locations, index } = useData();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const input = useRef<TextInputInstance>(null);

  const catalog = useMemo(() => buildCatalog(items, locations, index), [items, locations, index]);
  const { things, places } = useMemo(() => {
    if (!deferred.trim()) {
      return { things: [...items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40), places: [] as Location[] };
    }
    const hits = catalog.search(deferred, 80);
    const things: Item[] = [];
    const places: Location[] = [];
    for (const h of hits) {
      if (h.value.kind === 'item') things.push(h.value.item);
      else if (places.length < 6) places.push(h.value.place);
    }
    return { things, places };
  }, [catalog, deferred, items]);

  const searching = deferred.trim().length > 0;

  return (
    <Room>
      <FlatList
        data={things}
        keyExtractor={(i) => i.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 32, gap: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <View>
              <T variant="label" color={p.headRule}>
                The catalog · {items.length} {items.length === 1 ? 'card' : 'cards'}
              </T>
              <T variant="title">Whereabouts</T>
            </View>
            <View style={[styles.search, { backgroundColor: p.card, borderColor: p.cardEdge, shadowColor: p.shadow }]}>
              <LoupeIcon size={22} color={p.ink} accent={p.brass} />
              <TextInput
                ref={input}
                value={query}
                onChangeText={setQuery}
                autoFocus={items.length > 0}
                placeholder="What are you looking for?"
                placeholderTextColor={p.inkFaint}
                selectionColor={p.leather}
                cursorColor={p.leather}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={() => Keyboard.dismiss()}
                accessibilityLabel="Search your things and places"
                style={[styles.searchInput, { color: p.ink }]}
              />
              {query ? (
                <Pressable
                  hitSlop={12}
                  accessibilityLabel="Clear search"
                  onPress={() => {
                    setQuery('');
                    input.current?.focus();
                  }}
                >
                  <CloseIcon size={18} color={p.inkSoft} />
                </Pressable>
              ) : null}
            </View>
            {places.length > 0 && (
              <View style={{ gap: 6 }}>
                <SectionLabel>Shelves</SectionLabel>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 6 }}>
                  {places.map((pl) => (
                    <SpineChip
                      key={pl.id}
                      label={pl.name}
                      hint={index.pathNames(pl.parentId).slice(-1)[0]}
                      onPress={() => router.push({ pathname: '/place/[id]', params: { id: pl.id } })}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
            {things.length > 0 && <SectionLabel>{searching ? 'Cards found' : 'Recently shelved'}</SectionLabel>}
          </View>
        }
        renderItem={({ item, index: i }) => <ItemCard item={item} enterIndex={i} />}
        ListEmptyComponent={
          items.length === 0 ? (
            <EmptyLibrary />
          ) : places.length === 0 ? (
            <View style={styles.empty}>
              <Stamp text="No card" sub="in the catalog" color={p.stamp} />
              <T variant="italic" color={p.inkSoft} style={{ textAlign: 'center' }}>
                Nothing matches “{deferred.trim()}”.
              </T>
              <LibraryButton
                label={`Add “${deferred.trim()}”`}
                onPress={() => router.push({ pathname: '/add', params: { name: deferred.trim() } })}
              />
            </View>
          ) : undefined
        }
      />
    </Room>
  );
}

function EmptyLibrary() {
  const p = usePalette();
  return (
    <View style={styles.empty}>
      <Stamp text="New library" sub="est. today" color={p.lampText} />
      <T variant="heading" style={{ textAlign: 'center' }}>
        Your shelves are bare
      </T>
      <T variant="italic" color={p.inkSoft} style={{ textAlign: 'center' }}>
        Write a card for something you tend to misplace: the spare keys, the passport, the drill you lent out.
      </T>
      <LibraryButton label="Write the first card" onPress={() => router.push('/add')} />
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontFamily: fonts.typed, fontSize: 17, paddingVertical: 14, outlineWidth: 0 },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 40, paddingHorizontal: 12 },
});
