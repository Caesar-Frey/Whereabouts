import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { DatabaseUnreadableError, eraseAllData } from '@/db/open';
import { KeyLockedError, recoverKey } from '@/security/keyVault';
import { LockedScreen } from '@/security/lock';
import { useDataStatus } from '@/state/data';
import { LibraryButton, Room, Stamp, T, TypedInput } from '@/ui/components';
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

  if (status.error instanceof KeyLockedError) {
    return <SealedGate error={status.error} onRetry={retry} />;
  }

  const unreadable = status.error instanceof DatabaseUnreadableError;
  const confirmErase = () =>
    Alert.alert(
      'Erase everything?',
      'Your catalog cannot be unlocked on this device. Erasing deletes all saved things and places so you can start fresh. If you have a backup, you can restore it afterwards from the Desk. This cannot be undone.',
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

/**
 * The catalog key is sealed behind Face ID / fingerprint. Either unlock, or
 * (if biometrics changed and the OS dropped the key) use the recovery
 * passphrase.
 */
function SealedGate({ error, onRetry }: { error: KeyLockedError; onRetry: () => void }) {
  const p = usePalette();
  const [recovering, setRecovering] = useState(error.invalidated);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (!recovering) {
    return (
      <LockedScreen checking={false} busy={false} onUnlock={onRetry}>
        <LibraryButton label="Use recovery passphrase" tone="ghost" compact onPress={() => setRecovering(true)} />
      </LockedScreen>
    );
  }

  const recover = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await recoverKey(pass);
      onRetry();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Room style={[styles.center, { alignItems: 'stretch' }]}>
      <T variant="heading" style={{ textAlign: 'center' }}>
        {error.invalidated ? 'Face ID or fingerprints changed' : 'Open with your recovery passphrase'}
      </T>
      <T variant="italic" color={p.inkSoft} style={{ textAlign: 'center' }}>
        {error.invalidated
          ? 'For your safety the phone no longer releases the catalog key. Enter the recovery passphrase you chose when sealing it.'
          : 'Enter the recovery passphrase you chose when you sealed the catalog.'}
      </T>
      <TypedInput
        label="Recovery passphrase"
        value={pass}
        onChangeText={setPass}
        secureTextEntry
        autoCapitalize="none"
        autoFocus
        onSubmitEditing={() => pass && recover()}
      />
      {problem && (
        <T variant="small" color={p.stamp} style={{ textAlign: 'center' }}>
          {problem}
        </T>
      )}
      <LibraryButton label={busy ? 'Opening…' : 'Open the catalog'} tone="lamp" disabled={!pass || busy} onPress={recover} />
      {!error.invalidated && <LibraryButton label="Back" tone="ghost" compact onPress={() => setRecovering(false)} />}
      <T variant="small" style={{ textAlign: 'center' }}>
        Afterwards the key is kept the ordinary way. You can seal it again from the Desk.
      </T>
    </Room>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
});
