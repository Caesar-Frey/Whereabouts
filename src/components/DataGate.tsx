import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { DatabaseUnreadableError, eraseAllData } from '@/db/open';
import { useDataStatus } from '@/state/data';
import { LibraryButton, Room, Stamp, T } from '@/ui/components';
import { usePalette } from '@/ui/theme';

export function DataGate({ children }: { children: ReactNode }) {
  const { status, retry } = useDataStatus();
  const p = usePalette();
  const [erasing, setErasing] = useState(false);
  const [eraseError, setEraseError] = useState<string | null>(null);

  if (status.state === 'ready') return <>{children}</>;

  if (status.state === 'loading') {
    return (
      <Room style={styles.center}>
        <ActivityIndicator color={p.leather} />
        <T variant="italic" color={p.inkSoft}>
          Opening the stacks…
        </T>
      </Room>
    );
  }

  const unreadable = status.error instanceof DatabaseUnreadableError;
  const confirmErase = () =>
    Alert.alert(
      'Erase everything?',
      'Your catalog cannot be unlocked on this device. Erasing deletes all saved things and places so you can start fresh. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            setErasing(true);
            setEraseError(null);
            try {
              await eraseAllData();
              retry();
            } catch {
              setEraseError("Couldn't erase the old catalog. Restart the phone and try again.");
            } finally {
              setErasing(false);
            }
          },
        },
      ],
    );

  return (
    <Room style={styles.center}>
      <Stamp text="Damaged" sub="see librarian" color={p.stamp} />
      <T variant="heading" style={{ textAlign: 'center' }}>
        {unreadable ? "Your catalog can't be unlocked" : 'Something went wrong opening your catalog'}
      </T>
      <T variant="small" style={{ textAlign: 'center' }}>
        {status.error.message}
      </T>
      {eraseError && (
        <T variant="small" color={p.stamp} style={{ textAlign: 'center' }}>
          {eraseError}
        </T>
      )}
      <View style={{ gap: 12, alignSelf: 'stretch' }}>
        <LibraryButton label="Try again" tone="lamp" onPress={retry} />
        {unreadable && <LibraryButton label="Erase and start over" tone="ghost" disabled={erasing} onPress={confirmErase} />}
      </View>
    </Room>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
});
