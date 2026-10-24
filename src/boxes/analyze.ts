import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import jpeg from 'jpeg-js';

import { base64ToBytes } from '../lib/base64';
import { labelText, labelWords, visualFeatures, type FingerprintView } from './fingerprint';

const SIZE = 48;

/**
 * Reads a box photo on the device: text on the label (Apple Vision / ML Kit,
 * on-device) and a tiny thumbnail for the colour features. Nothing is sent
 * anywhere.
 */
export async function analyzeBoxPhoto(uri: string): Promise<FingerprintView> {
  const [lines, pixels] = await Promise.all([
    isSupported ? extractTextFromImage(uri).catch(() => [] as string[]) : Promise.resolve([] as string[]),
    thumbnailPixels(uri),
  ]);
  return { ...visualFeatures(pixels.data, pixels.width, pixels.height), words: labelWords(lines), text: labelText(lines) };
}

async function thumbnailPixels(uri: string) {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: SIZE, height: SIZE }).renderAsync();
  const small = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.95, base64: true });
  const decoded = jpeg.decode(base64ToBytes(small.base64 ?? ''), { useTArray: true, formatAsRGBA: true });
  return { data: decoded.data as Uint8Array, width: decoded.width, height: decoded.height };
}
