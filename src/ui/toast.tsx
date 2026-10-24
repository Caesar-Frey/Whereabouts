import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnimatedValue, useReducedMotion } from './animated';
import { fonts, usePalette } from './theme';

interface ToastInput {
  message: string;
  /** Shows an Undo button that runs this. */
  undo?: () => Promise<unknown> | void;
}

interface Toast extends ToastInput {
  key: number;
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

/** How long a notice stays up (long enough to reach Undo). */
const SHOW_MS = 6000;
/** Clears the cabinet tab bar. */
const LIFT = 92;

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast outside ToastProvider');
  return show;
}

/**
 * Notices slide up like a circulation slip pushed across the desk. Used for
 * reversible actions instead of "are you sure?" dialogs.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const counter = useRef(0);
  const show = useCallback((t: ToastInput) => {
    counter.current += 1;
    setToast({ ...t, key: counter.current });
    AccessibilityInfo.announceForAccessibility(t.undo ? `${t.message}. Undo available.` : t.message);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <Slip key={toast.key} toast={toast} onGone={() => setToast((cur) => (cur?.key === toast.key ? null : cur))} />}
    </ToastContext.Provider>
  );
}

function Slip({ toast, onGone }: { toast: Toast; onGone: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const v = useAnimatedValue(0);
  const [busy, setBusy] = useState(false);

  const hide = useCallback(() => {
    Animated.timing(v, { toValue: 0, duration: still ? 0 : 180, useNativeDriver: true }).start(() => onGone());
  }, [v, still, onGone]);

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: still ? 0 : 260,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
    const t = setTimeout(hide, SHOW_MS);
    return () => clearTimeout(t);
  }, [v, still, hide]);

  const style = useMemo(
    () => ({
      opacity: v,
      transform: [
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '-0.6deg'] }) },
      ],
    }),
    [v],
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + LIFT }, style]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.slip, { backgroundColor: p.lampDeep, borderColor: p.brassDark, shadowColor: p.shadow }]}>
        <View style={[styles.perf, { borderColor: p.brass }]} />
        <Text style={[styles.message, { color: p.onLamp }]} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.undo && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Undo"
            disabled={busy}
            hitSlop={10}
            onPress={async () => {
              setBusy(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              try {
                await toast.undo?.();
              } finally {
                hide();
              }
            }}
            style={[styles.undo, { borderColor: p.brassLight }]}
          >
            <Text style={[styles.undoText, { color: p.brassLight }]}>Undo</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14 },
  slip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 22,
    paddingRight: 12,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  perf: { position: 'absolute', left: 8, top: 6, bottom: 6, borderLeftWidth: 1.5, borderStyle: 'dashed' },
  message: { flex: 1, fontFamily: fonts.typed, fontSize: 15, lineHeight: 20 },
  undo: { borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 5, transform: [{ rotate: '-3deg' }] },
  undoText: { fontFamily: fonts.stamp, fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase' },
});
