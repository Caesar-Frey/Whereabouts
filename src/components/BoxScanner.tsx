import { useCallback } from 'react';
import { Alert } from 'react-native';

import { analyzeBoxPhoto } from '@/boxes/analyze';
import { matchStrength, rankBoxes, type BoxMatch, type FingerprintView, type MatchStrength } from '@/boxes/fingerprint';
import type { CapturedPhoto } from '@/photos/capture';
import { useData } from '@/state/data';

import { askForPhoto } from './PhotoPlate';

export interface Scan {
  photo: CapturedPhoto;
  view: FingerprintView;
}

/** Photo -> fingerprint view, all on the device. Null if cancelled. */
export async function scanBox(title: string): Promise<Scan | null> {
  const photo = await askForPhoto(title);
  if (!photo) return null;
  try {
    return { photo, view: await analyzeBoxPhoto(photo.uri) };
  } catch (e) {
    Alert.alert("Couldn't read that photo", e instanceof Error ? e.message : String(e));
    return null;
  }
}

export interface RankedBox extends BoxMatch<string> {
  strength: MatchStrength;
}

/** Matches a scanned view against every fingerprinted place, best first. */
export function useBoxMatcher() {
  const { boxes } = useData();
  const hasBoxes = [...boxes.values()].some((b) => b.fp?.views.length);
  const match = useCallback(
    (view: FingerprintView): RankedBox[] => {
      const candidates = [...boxes.values()].flatMap((b) => (b.fp ? [{ value: b.locationId, fingerprint: b.fp }] : []));
      const ranked = rankBoxes(view, candidates);
      return ranked.map((m, i) => ({ ...m, strength: matchStrength(ranked, i) }));
    },
    [boxes],
  );
  return { hasBoxes, match };
}
