/**
 * Small, dependency-free fuzzy matcher tuned for short names typed on a phone:
 * prefix-as-you-type, substrings, missing letters ("scrwdrvr") and one or two
 * typos ("screwdirver"). Every word in the query must match somewhere.
 */

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/** Optimal string alignment distance, bailing out once it exceeds `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2]! + 1);
      }
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length]!;
}

function isSubsequence(q: string, t: string): boolean {
  let i = 0;
  for (let j = 0; j < t.length && i < q.length; j++) if (q[i] === t[j]) i++;
  return i === q.length;
}

/** How well one query word matches one word of the text, 0..1. */
export function scoreToken(q: string, t: string): number {
  if (q === t) return 1;
  if (t.startsWith(q)) return 0.75 + 0.2 * (q.length / t.length);
  if (q.length >= 2 && t.includes(q)) return 0.6;
  if (q.length >= 3) {
    const max = q.length >= 8 ? 2 : 1;
    // Compare against the whole word and against a same-length prefix, so a
    // typo in a half-typed word still matches.
    if (q.length >= 4) {
      const d = Math.min(editDistance(q, t, max), editDistance(q, t.slice(0, q.length), max));
      if (d <= max) return 0.55 - 0.1 * d;
    }
    if (q[0] === t[0] && isSubsequence(q, t) && q.length / t.length >= 0.5) return 0.35;
  }
  return 0;
}

export interface SearchField {
  text: string;
  weight: number;
}

export interface SearchDoc<T> {
  value: T;
  fields: SearchField[];
  /** Tie-breaker: higher wins (e.g. last updated). */
  rank?: number;
}

interface PreparedDoc<T> {
  value: T;
  rank: number;
  fields: { tokens: string[]; weight: number }[];
}

export interface SearchIndex<T> {
  search(query: string, limit?: number): { value: T; score: number }[];
  size: number;
}

export function createSearchIndex<T>(docs: SearchDoc<T>[]): SearchIndex<T> {
  const prepared: PreparedDoc<T>[] = docs.map((d) => ({
    value: d.value,
    rank: d.rank ?? 0,
    fields: d.fields.map((f) => ({ tokens: tokenize(f.text), weight: f.weight })),
  }));

  function search(query: string, limit = 50) {
    const qTokens = tokenize(query);
    if (qTokens.length === 0) return [];
    const results: { value: T; score: number; rank: number }[] = [];
    for (const doc of prepared) {
      let total = 0;
      let matchedAll = true;
      for (const q of qTokens) {
        let best = 0;
        for (const field of doc.fields) {
          for (const t of field.tokens) {
            const s = scoreToken(q, t) * field.weight;
            if (s > best) best = s;
          }
        }
        if (best === 0) {
          matchedAll = false;
          break;
        }
        total += best;
      }
      if (matchedAll) results.push({ value: doc.value, score: total / qTokens.length, rank: doc.rank });
    }
    results.sort((a, b) => b.score - a.score || b.rank - a.rank);
    return results.slice(0, limit).map(({ value, score }) => ({ value, score }));
  }

  return { search, size: prepared.length };
}
