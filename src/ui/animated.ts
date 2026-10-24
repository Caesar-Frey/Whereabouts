import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

/** A stable Animated.Value (react-native-web lacks RN's own hook). */
export function useAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((on) => (reduceMotion = on))
  .catch(() => {});

/** True when the user asked the OS to reduce motion. */
export function useReducedMotion(): boolean {
  const [on, setOn] = useState(reduceMotion);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => live && setOn((reduceMotion = v)))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setOn((reduceMotion = v)));
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);
  return on;
}
