import { normalize, scoreToken, tokenize } from '../search/fuzzy';

/**
 * Box fingerprints: recognising a box from a photo of the box itself or its
 * handwritten label, with no QR codes or printed stickers.
 *
 * Each photo becomes a "view": the words read off it (on-device OCR), a
 * colour histogram (robust to angle and distance) and a coarse 4×4 colour
 * layout. A box keeps several views. A new photo is compared with every
 * view of every box; label words count most when both sides have them.
 */
export const FINGERPRINT_MODEL = 'wb-fp-1';

export interface FingerprintView {
  /** Normalised words read from the photo. */
  words: string[];
  /** The text as read, for showing ("Label reads: …"). */
  text: string;
  /** Hue/saturation/value histogram, L1-normalised. */
  hist: number[];
  /** 4×4 grid of mean RGB (0..1), row-major. */
  grid: number[];
}

export interface Fingerprint {
  v: 1;
  views: FingerprintView[];
}

export const MAX_VIEWS = 6;

/* ------------------------------------------------------------- features */

const HUE_BINS = 12;
const SAT_BINS = 2;
const VAL_BINS = 3;
const GRAY_BINS = 4;
const HIST_SIZE = HUE_BINS * SAT_BINS * VAL_BINS + GRAY_BINS;

/** Visual features from RGBA pixels (e.g. a 48×48 thumbnail). */
export function visualFeatures(rgba: Uint8Array, width: number, height: number): Pick<FingerprintView, 'hist' | 'grid'> {
  const hist = new Array<number>(HIST_SIZE).fill(0);
  const grid = new Array<number>(48).fill(0);
  const counts = new Array<number>(16).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i]! / 255;
      const g = rgba[i + 1]! / 255;
      const b = rgba[i + 2]! / 255;
      // The centre of the frame is usually the box; the edges are the room.
      const cx = (x + 0.5) / width - 0.5;
      const cy = (y + 0.5) / height - 0.5;
      const w = 1.5 - Math.min(1, Math.sqrt(cx * cx + cy * cy) * 2);
      hist[histBin(r, g, b)]! += w;
      const cell = Math.min(3, Math.floor((y / height) * 4)) * 4 + Math.min(3, Math.floor((x / width) * 4));
      grid[cell * 3]! += r;
      grid[cell * 3 + 1]! += g;
      grid[cell * 3 + 2]! += b;
      counts[cell]!++;
    }
  }
  const total = hist.reduce((a, v) => a + v, 0) || 1;
  return {
    hist: hist.map((v) => round(v / total)),
    grid: grid.map((v, i) => round(v / (counts[Math.floor(i / 3)] || 1))),
  };
}

function histBin(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  // Greys, black and white: hue is meaningless, bin by brightness only.
  if (s < 0.18 || v < 0.12) return HUE_BINS * SAT_BINS * VAL_BINS + Math.min(GRAY_BINS - 1, Math.floor(v * GRAY_BINS));
  let h: number;
  const d = max - min;
  if (max === r) h = ((g - b) / d + 6) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  const hb = Math.min(HUE_BINS - 1, Math.floor((h / 6) * HUE_BINS));
  const sb = Math.min(SAT_BINS - 1, Math.floor(((s - 0.18) / 0.82) * SAT_BINS));
  const vb = Math.min(VAL_BINS - 1, Math.floor(((v - 0.12) / 0.88) * VAL_BINS));
  return (hb * SAT_BINS + sb) * VAL_BINS + vb;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Words worth matching on from OCR lines (drops noise like "1" or "|"). */
export function labelWords(lines: string[]): string[] {
  const seen = new Set<string>();
  for (const t of tokenize(lines.join(' '))) if (t.length >= 2 && !/^\d$/.test(t)) seen.add(t);
  return [...seen].slice(0, 40);
}

export function labelText(lines: string[]): string {
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' · ')
    .slice(0, 200);
}

/* ----------------------------------------------------------- similarity */

export function textSimilarity(query: string[], candidate: string[]): number {
  const q = query.filter((w) => w.length >= 3);
  if (q.length === 0 || candidate.length === 0) return 0;
  let total = 0;
  for (const w of q) {
    let best = 0;
    for (const c of candidate) best = Math.max(best, scoreToken(w, c), scoreToken(c, w));
    total += best;
  }
  return Math.min(1, total / q.length);
}

/** Histogram intersection, 0..1. */
export function histSimilarity(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += Math.min(a[i]!, b[i]!);
  return s;
}

export function gridSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i]! - b[i]!);
  return Math.max(0, 1 - (d / a.length) * 2.5);
}

export function viewSimilarity(query: FingerprintView, view: FingerprintView): number {
  const visual = 0.75 * histSimilarity(query.hist, view.hist) + 0.25 * gridSimilarity(query.grid, view.grid);
  const queryHasText = query.words.some((w) => w.length >= 3);
  // A label in the new photo that this view never showed: could be the box
  // from another side, but less likely.
  if (queryHasText && view.words.length === 0) return 0.85 * visual;
  if (!queryHasText) return visual;
  const text = textSimilarity(query.words, view.words);
  // Matching handwriting is strong evidence; different writing is strong
  // evidence against.
  return 0.6 * text + 0.4 * visual;
}

export interface BoxMatch<T> {
  value: T;
  score: number;
}

/** Best-first matches for a new photo among fingerprinted boxes. */
export function rankBoxes<T>(query: FingerprintView, boxes: { value: T; fingerprint: Fingerprint }[]): BoxMatch<T>[] {
  return boxes
    .map(({ value, fingerprint }) => ({
      value,
      score: Math.max(0, ...fingerprint.views.map((v) => viewSimilarity(query, v))),
    }))
    .sort((a, b) => b.score - a.score);
}

export type MatchStrength = 'strong' | 'possible' | 'weak';

export function matchStrength(matches: BoxMatch<unknown>[], i = 0): MatchStrength {
  const m = matches[i];
  if (!m) return 'weak';
  const next = matches[i + 1]?.score ?? 0;
  if (m.score >= 0.62 && (i > 0 || m.score - next >= 0.06)) return 'strong';
  if (m.score >= 0.45) return 'possible';
  return 'weak';
}

/* --------------------------------------------------------------- storage */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeFingerprint(fp: Fingerprint): Uint8Array {
  return encoder.encode(JSON.stringify(fp));
}

export function decodeFingerprint(bytes: Uint8Array | null): Fingerprint | null {
  if (!bytes || bytes.length === 0) return null;
  try {
    const fp = JSON.parse(decoder.decode(bytes)) as Fingerprint;
    return fp?.v === 1 && Array.isArray(fp.views) ? fp : null;
  } catch {
    return null;
  }
}

export function addView(fp: Fingerprint | null, view: FingerprintView): Fingerprint {
  const views = [...(fp?.views ?? []), view];
  return { v: 1, views: views.slice(-MAX_VIEWS) };
}

/** All words on a box's labels, for text search ("camping" finds the box marked CAMPING). */
export function fingerprintText(fp: Fingerprint | null): string {
  return fp ? normalize(fp.views.map((v) => v.text).join(' ')) : '';
}
