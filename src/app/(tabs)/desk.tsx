import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canUseDeviceAuth, RELOCK_AFTER_MS, useAppLock } from '@/security/lock';
import { useData } from '@/state/data';
import { IndexCard, Room, SectionLabel, T } from '@/ui/components';
import { KeyholeIcon } from '@/ui/icons';
import { usePalette } from '@/ui/theme';

export default function DeskScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { items, locations } = useData();
  const lock = useAppLock();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    canUseDeviceAuth().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  const toggleLock = async (on: boolean) => {
    setBusy(true);
    try {
      const ok = await lock.setEnabled(on);
      if (!ok && on && !available) {
        Alert.alert('Set up a screen lock first', 'App lock uses your Face ID, fingerprint or device passcode.');
      }
    } finally {
      setBusy(false);
    }
  };

  const lent = items.filter((i) => i.activeLoan).length;

  return (
    <Room>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 32, gap: 16 }}>
        <View>
          <T variant="label" color={p.headRule}>
            The librarian&apos;s desk
          </T>
          <T variant="title">Desk</T>
        </View>

        <IndexCard punched={false} ruled={false} style={{ paddingBottom: 16 }}>
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: p.lamp }]}>
              <KeyholeIcon size={22} color={p.brassLight} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="heading">App lock</T>
              <T variant="small">
                {available === false
                  ? 'Needs Face ID, a fingerprint or a passcode on this phone.'
                  : `Ask for Face ID, fingerprint or passcode when opening, and after ${RELOCK_AFTER_MS / 1000} seconds away.`}
              </T>
            </View>
            <Switch
              value={lock.enabled}
              disabled={busy || available === null}
              onValueChange={toggleLock}
              trackColor={{ true: p.lamp, false: p.cardEdge }}
              thumbColor={p.scheme === 'dark' ? p.brassLight : '#FFFDF6'}
              ios_backgroundColor={p.cardEdge}
              accessibilityLabel="App lock"
            />
          </View>
        </IndexCard>

        <IndexCard punched ruled>
          <View style={{ gap: 12 }}>
            <T variant="label" color={p.headRule} style={{ marginBottom: 14 }}>
              House rules
            </T>
            <Rule text="Everything stays on this phone. There's no account and nothing is uploaded." />
            <Rule text="Your catalog is encrypted with a key kept in the phone's secure keychain." />
            <Rule text="No ads, no analytics, no tracking. The app never goes online." />
          </View>
        </IndexCard>

        <SectionLabel>Holdings</SectionLabel>
        <View style={styles.stats}>
          <Stat label="Cards" value={items.length} />
          <Stat label="Places" value={locations.length} />
          <Stat label="Lent out" value={lent} />
        </View>

        <T variant="small" color={p.inkFaint} style={{ textAlign: 'center', marginTop: 12 }}>
          Whereabouts {Constants.expoConfig?.version ?? ''}
        </T>
      </ScrollView>
    </Room>
  );
}

function Rule({ text }: { text: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <T variant="typed" color={p.headRule}>
        §
      </T>
      <T variant="typed" style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const p = usePalette();
  return (
    <View style={[styles.stat, { backgroundColor: p.card, borderColor: p.cardEdge }]}>
      <T variant="title">{value}</T>
      <T variant="label">{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
});
