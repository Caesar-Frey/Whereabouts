import { useEffect } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { useAnimatedValue, useReducedMotion } from '@/ui/animated';
import { MicrophoneIcon } from '@/ui/icons';
import { usePalette } from '@/ui/theme';

/** A brass microphone button; rings pulse out while it listens. */
export function VoiceButton({
  listening,
  onPress,
  size = 44,
  accessibilityLabel = 'Say it instead of typing',
}: {
  listening: boolean;
  onPress: () => void;
  size?: number;
  accessibilityLabel?: string;
}) {
  const p = usePalette();
  const still = useReducedMotion();
  const pulse = useAnimatedValue(0);

  useEffect(() => {
    if (!listening || still) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, still, pulse]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Stop listening' : accessibilityLabel}
      accessibilityState={{ busy: listening }}
      hitSlop={8}
      onPress={onPress}
    >
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {listening && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: p.brass,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
              },
            ]}
          />
        )}
        <View
          style={[
            styles.face,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: listening ? p.leather : p.brass, borderColor: p.brassDark },
          ]}
        >
          <MicrophoneIcon size={size * 0.55} color={listening ? p.onLeather : '#2A1F17'} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
