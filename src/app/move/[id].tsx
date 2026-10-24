import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { PlacePicker } from '@/components/PlacePicker';
import { useData, useItem } from '@/state/data';
import { LibraryButton, Room, T } from '@/ui/components';
import { usePalette } from '@/ui/theme';
import { useToast } from '@/ui/toast';

export default function MoveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useItem(id);
  const { actions, index } = useData();
  const p = usePalette();
  const [place, setPlace] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  if (!item) return <Room>{null}</Room>;

  const move = async () => {
    try {
      const moveId = await actions.moveItem(item.id, place);
      router.back();
      if (moveId) toast({ message: `Moved “${item.name}”`, undo: () => actions.undoMove(moveId) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Room>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 20 }}>
          <T variant="heading">Where does “{item.name}” live now?</T>
          {item.locationId && (
            <T variant="typed" color={p.inkSoft}>
              Currently: {index.pathString(item.locationId)}
            </T>
          )}
          <PlacePicker value={place} onChange={setPlace} label="New shelf" autoFocus onSubmit={move} />
          {error && (
            <T variant="typed" color={p.stamp}>
              {error}
            </T>
          )}
          <LibraryButton label="Re-shelve" tone="lamp" disabled={!place.trim()} onPress={move} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Room>
  );
}
