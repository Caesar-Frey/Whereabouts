import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoanFields, type LoanValue } from '@/components/LoanFields';
import { askForPhoto, PhotoPlate } from '@/components/PhotoPlate';
import { PlacePicker } from '@/components/PlacePicker';
import type { CapturedPhoto } from '@/photos/capture';
import { useData } from '@/state/data';
import { IndexCard, LibraryButton, Room, Stamp, T, TypedInput } from '@/ui/components';
import { CameraIcon, CloseIcon } from '@/ui/icons';
import { usePalette } from '@/ui/theme';

export default function AddScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name?: string; place?: string }>();
  const { actions } = useData();
  const nameRef = useRef<TextInputInstance>(null);
  const placeRef = useRef<TextInputInstance>(null);

  const [name, setName] = useState(params.name ?? '');
  const [place, setPlace] = useState(params.place ?? '');
  const [lent, setLent] = useState(false);
  const [loan, setLoan] = useState<LoanValue>({ person: '', dueAt: null });
  const [more, setMore] = useState(false);
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ name: string; n: number } | null>(null);

  const canSave = name.trim().length > 0 && (!lent || loan.person.trim().length > 0) && !saving;

  const save = async (another: boolean) => {
    if (!canSave) {
      setError(!name.trim() ? 'Give it a name first.' : 'Who did you lend it to?');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await actions.addItem({
        name,
        place,
        notes,
        tags: tags.split(','),
        lendTo: lent ? { person: loan.person, dueAt: loan.dueAt } : undefined,
        photos,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (another) {
        setLastSaved((s) => ({ name: name.trim(), n: (s?.n ?? 0) + 1 }));
        setName('');
        setTags('');
        setNotes('');
        setPhotos([]);
        nameRef.current?.focus();
      } else {
        router.back();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Room>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 24, gap: 18 }}
        >
          {lastSaved && (
            <View key={lastSaved.n} style={styles.savedRow}>
              <Stamp text="Catalogued" sub={lastSaved.name} color={p.stampReturned} angle={-4} />
            </View>
          )}

          <IndexCard punched ruled={false}>
            <View style={{ gap: 22, paddingTop: 2 }}>
              <T variant="label" color={p.headRule}>
                New catalog card
              </T>
              <TypedInput
                ref={nameRef}
                big
                value={name}
                onChangeText={setName}
                placeholder="What is it?"
                autoFocus={!params.name}
                autoCapitalize="sentences"
                returnKeyType={lent ? 'done' : 'next'}
                submitBehavior={lent ? 'blurAndSubmit' : 'submit'}
                onSubmitEditing={() => !lent && placeRef.current?.focus()}
                accessibilityLabel="Name of the thing"
              />

              <View style={styles.photoRow}>
                {photos.map((ph, i) => (
                  <View key={ph.uri}>
                    <PhotoPlate base64={ph.thumb} aspect={1} style={{ width: 78 }} tilt={i % 2 ? 1.5 : -1.5} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                      hitSlop={8}
                      onPress={() => setPhotos((list) => list.filter((x) => x !== ph))}
                      style={[styles.removePhoto, { backgroundColor: p.leather }]}
                    >
                      <CloseIcon size={12} color={p.onLeather} />
                    </Pressable>
                  </View>
                ))}
                {photos.length < 4 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add a photo"
                    onPress={async () => {
                      const ph = await askForPhoto();
                      if (ph) setPhotos((list) => [...list, ph]);
                    }}
                    style={[styles.addPhoto, { borderColor: p.inkFaint }]}
                  >
                    <CameraIcon size={24} color={p.inkSoft} />
                    <T variant="small">{photos.length ? 'Another' : 'Photo'}</T>
                  </Pressable>
                )}
              </View>

              <View style={styles.toggleRow}>
                <Toggle label="On a shelf" on={!lent} onPress={() => setLent(false)} />
                <Toggle label="Lent to someone" on={lent} onPress={() => setLent(true)} />
              </View>

              {lent ? (
                <LoanFields value={loan} onChange={setLoan} autoFocus />
              ) : (
                <PlacePicker
                  inputRef={placeRef}
                  value={place}
                  onChange={setPlace}
                  autoFocus={!!params.name}
                  onSubmit={() => save(false)}
                />
              )}

              {lent && (
                <PlacePicker
                  value={place}
                  onChange={setPlace}
                  label="Where it goes when it's back (optional)"
                />
              )}

              {more ? (
                <View style={{ gap: 18 }}>
                  <TypedInput
                    label="Subjects (comma separated)"
                    value={tags}
                    onChangeText={setTags}
                    placeholder="tools, camping"
                    autoCapitalize="none"
                  />
                  <TypedInput
                    label="Notes"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Anything worth remembering"
                    multiline
                  />
                </View>
              ) : (
                <Pressable onPress={() => setMore(true)} accessibilityRole="button" hitSlop={8}>
                  <T variant="small" color={p.leatherText}>
                    + Subjects and notes
                  </T>
                </Pressable>
              )}
            </View>
          </IndexCard>

          {error && (
            <T variant="typed" color={p.stamp} accessibilityLiveRegion="polite">
              {error}
            </T>
          )}

          <LibraryButton label={lent ? 'Check it out' : 'Shelve it'} disabled={!canSave} onPress={() => save(false)} />
          <LibraryButton label="Save and add another" tone="ghost" disabled={!canSave} onPress={() => save(true)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Room>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.toggle, { borderColor: on ? p.lamp : p.inkFaint, backgroundColor: on ? p.lamp : 'transparent' }]}
    >
      <T variant="label" color={on ? p.onLamp : p.inkSoft}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  savedRow: { alignItems: 'center' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  addPhoto: { width: 78, height: 78, borderWidth: 1, borderStyle: 'dashed', borderRadius: 3, alignItems: 'center', justifyContent: 'center', gap: 2 },
  removePhoto: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggle: { flex: 1, borderWidth: 1, borderRadius: 3, paddingVertical: 9, alignItems: 'center' },
});
