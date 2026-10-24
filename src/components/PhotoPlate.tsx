import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CameraPermissionError, capturePhoto, jpegUri, type CapturedPhoto } from '@/photos/capture';
import { useData } from '@/state/data';
import { usePalette } from '@/ui/theme';

/**
 * A photo tipped into the card like a plate in an old book: a white border
 * and four black photo corners holding it in.
 */
export function PhotoPlate({
  base64,
  aspect = 4 / 3,
  onPress,
  accessibilityLabel,
  style,
  tilt = -1.2,
}: {
  base64: string | null;
  aspect?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  tilt?: number;
}) {
  const p = usePalette();
  const body = (
    <View style={[styles.plate, { backgroundColor: p.scheme === 'dark' ? '#E9DFCB' : '#FFFDF7', shadowColor: p.shadow, transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <View style={{ aspectRatio: aspect, backgroundColor: p.cardEdge }}>
        {base64 ? <Image source={{ uri: jpegUri(base64) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      </View>
      {CORNERS.map((c) => (
        <View key={c} style={[styles.corner, cornerStyle[c]]} />
      ))}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel={accessibilityLabel ?? 'Photo'} onPress={onPress}>
      {body}
    </Pressable>
  );
}

/** Loads a full-size photo from the encrypted store. */
export function useFullPhoto(id: string | undefined) {
  const { actions } = useData();
  const [photo, setPhoto] = useState<{ id: string; data: string; aspect: number } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    actions.getPhoto(id).then((ph) => {
      if (live && ph) setPhoto({ id: ph.id, data: ph.data, aspect: ph.width && ph.height ? ph.width / ph.height : 4 / 3 });
    });
    return () => {
      live = false;
    };
  }, [actions, id]);
  return photo?.id === id ? photo : null;
}

/** Asks camera or library, then returns the shrunk photo (or null if cancelled). */
export function askForPhoto(title = 'Add a photo'): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    const take = (source: 'camera' | 'library') => () =>
      capturePhoto(source)
        .then(resolve)
        .catch((e: unknown) => {
          Alert.alert(
            e instanceof CameraPermissionError ? 'Camera is off' : "Couldn't add the photo",
            e instanceof Error ? e.message : String(e),
          );
          resolve(null);
        });
    Alert.alert(title, undefined, [
      { text: 'Take a photo', onPress: take('camera') },
      { text: 'Choose from library', onPress: take('library') },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;
/** Each corner is a square split on the diagonal: two sides inked, two clear. */
const INK = '#1E1712';
const CLEAR = 'transparent';
const cornerStyle = StyleSheet.create({
  tl: { top: -2, left: -2, borderTopColor: INK, borderLeftColor: INK, borderRightColor: CLEAR, borderBottomColor: CLEAR },
  tr: { top: -2, right: -2, borderTopColor: INK, borderRightColor: INK, borderLeftColor: CLEAR, borderBottomColor: CLEAR },
  bl: { bottom: -2, left: -2, borderBottomColor: INK, borderLeftColor: INK, borderRightColor: CLEAR, borderTopColor: CLEAR },
  br: { bottom: -2, right: -2, borderBottomColor: INK, borderRightColor: INK, borderLeftColor: CLEAR, borderTopColor: CLEAR },
});

const styles = StyleSheet.create({
  plate: {
    padding: 7,
    borderRadius: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  corner: { position: 'absolute', width: 0, height: 0, borderWidth: 9, opacity: 0.85 },
});
