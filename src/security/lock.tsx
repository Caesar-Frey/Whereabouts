import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { KeyholeIcon } from '../ui/icons';
import { LibraryButton, Room, T } from '../ui/components';
import { usePalette } from '../ui/theme';

// Kept in the Keychain/Keystore (not the database) so it can be read before
// anything is shown, and can't be flipped by editing app files.
const LOCK_KEY = 'whereabouts.applock.v1';
const STORE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
/** Leaving the app for longer than this locks it again. */
export const RELOCK_AFTER_MS = 30_000;

export async function canUseDeviceAuth(): Promise<boolean> {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);
  return hardware && enrolled !== LocalAuthentication.SecurityLevel.NONE;
}

async function authenticate(prompt: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: 'Cancel',
    // Falls back to the device passcode so nobody is locked out of their data.
    disableDeviceFallback: false,
  });
  return result.success;
}

interface LockContextValue {
  enabled: boolean;
  /** Turning the lock on or off both require proving it's you. */
  setEnabled: (on: boolean) => Promise<boolean>;
}

const LockContext = createContext<LockContextValue | null>(null);

export function useAppLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useAppLock outside LockGate');
  return ctx;
}

type GateState = 'checking' | 'locked' | 'unlocked';

/**
 * Renders nothing private until the app is unlocked, and covers the screen
 * whenever the app is not in the foreground so the app switcher snapshot is
 * blank.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [gate, setGate] = useState<GateState>(Platform.OS === 'web' ? 'unlocked' : 'checking');
  const [covered, setCovered] = useState(false);
  const [busy, setBusy] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const enabledRef = useRef(false);

  const unlock = useCallback(async () => {
    setBusy(true);
    try {
      if (await authenticate('Unlock Whereabouts')) setGate('unlocked');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // The browser build is only a design preview and has no secure storage.
    if (Platform.OS === 'web') return;
    SecureStore.getItemAsync(LOCK_KEY, STORE_OPTS)
      .then((v) => {
        const on = v === '1';
        enabledRef.current = on;
        setEnabledState(on);
        setGate(on ? 'locked' : 'unlocked');
        if (on) unlock();
      })
      // If the setting can't be read, fail closed only if it might be on.
      .catch(() => setGate('locked'));
  }, [unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!enabledRef.current) return;
      if (state === 'active') {
        setCovered(false);
        const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        backgroundedAt.current = null;
        if (away > RELOCK_AFTER_MS) {
          setGate('locked');
          unlock();
        }
      } else {
        setCovered(true);
        if (state === 'background' && backgroundedAt.current === null) backgroundedAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [unlock]);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on && !(await canUseDeviceAuth())) return false;
    if (!(await authenticate(on ? 'Turn on app lock' : 'Turn off app lock'))) return false;
    if (on) await SecureStore.setItemAsync(LOCK_KEY, '1', STORE_OPTS);
    else await SecureStore.deleteItemAsync(LOCK_KEY, STORE_OPTS);
    enabledRef.current = on;
    setEnabledState(on);
    return true;
  }, []);

  return (
    <LockContext.Provider value={{ enabled, setEnabled }}>
      {gate === 'unlocked' ? children : null}
      {gate !== 'unlocked' && <LockedScreen checking={gate === 'checking'} busy={busy} onUnlock={unlock} />}
      {gate === 'unlocked' && covered && <PrivacyCover />}
    </LockContext.Provider>
  );
}

function LockedScreen({ checking, busy, onUnlock }: { checking: boolean; busy: boolean; onUnlock: () => void }) {
  const p = usePalette();
  return (
    <Room style={styles.center}>
      <View style={[styles.door, { backgroundColor: p.lamp, borderColor: p.brass }]}>
        <KeyholeIcon size={44} color={p.brassLight} />
      </View>
      <T variant="title" style={{ textAlign: 'center' }}>
        The reading room is closed
      </T>
      <T variant="italic" color={p.inkSoft} style={{ textAlign: 'center' }}>
        Unlock to see where your things are.
      </T>
      {!checking && <LibraryButton label="Unlock" tone="lamp" disabled={busy} onPress={onUnlock} />}
    </Room>
  );
}

function PrivacyCover() {
  const p = usePalette();
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: p.lampDeep }]}>
      <KeyholeIcon size={56} color={p.brass} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32 },
  door: {
    width: 104,
    height: 132,
    borderRadius: 52,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
