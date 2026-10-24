import { useState } from 'react';
import { Animated } from 'react-native';

/** A stable Animated.Value (react-native-web lacks RN's own hook). */
export function useAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
