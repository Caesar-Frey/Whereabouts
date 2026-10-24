import type { Item } from '../db/types';
import type { LocationIndex } from '../lib/locations';

/**
 * Pure helpers for the assistant: prompts, parsing what the model says, and
 * vector search. Kept apart from llama.rn so they can be tested.
 */

export interface TagDraft {
  name: string | null;
  tags: string[];
}

export const TAG_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 8 },
  },
  required: ['name', 'tags'],
} as const;

export function tagPrompt(input: { name: string; notes?: string | null; hasPhoto: boolean; knownTags: string[] }): string {
  const lines = [
    input.hasPhoto ? 'Look at the photo of a household item.' : 'Here is a household item.',
    input.name.trim() ? `The owner calls it: "${input.name.trim()}".` : 'The owner has not named it yet.',
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : '',
    'Reply with JSON: "name" is a short everyday name for it (2-4 words),',
    '"tags" are 3 to 6 short lowercase subjects that help find it later (what it is, what it is for, material or colour).',
    input.knownTags.length ? `Prefer these existing subjects when they fit: ${input.knownTags.slice(0, 40).join(', ')}.` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

/** Splits a "comma, separated" subjects field. */
export function tagList(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Appends a subject to a comma-separated field. */
export function withTag(text: string, tag: string): string {
  const list = tagList(text);
  return list.some((t) => t.toLowerCase() === tag.toLowerCase()) ? text : [...list, tag].join(', ');
}

/** Parses and tidies a model reply. Tolerates prose around the JSON. */
export function parseTagReply(reply: string, existing: string[] = []): TagDraft {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  let data: { name?: unknown; tags?: unknown } = {};
  if (start >= 0 && end > start) {
    try {
      data = JSON.parse(reply.slice(start, end + 1));
    } catch {
      data = {};
    }
  }
  const have = new Set(existing.map((t) => t.toLowerCase()));
  const tags: string[] = [];
  for (const raw of Array.isArray(data.tags) ? data.tags : []) {
    if (typeof raw !== 'string') continue;
    const t = raw
      .toLowerCase()
      .replace(/^#/, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (t && t.length <= 30 && t.split(' ').length <= 3 && !have.has(t)) {
      have.add(t);
      tags.push(t);
    }
  }
  const name = typeof data.name === 'string' ? data.name.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  return { name: name ? name[0]!.toUpperCase() + name.slice(1) : null, tags: tags.slice(0, 6) };
}

/** What an item "means", for its embedding. */
export function itemText(item: Item, index: LocationIndex): string {
  return [item.name, item.tags.join(', '), item.notes ?? '', index.pathString(item.locationId)].filter(Boolean).join('. ');
}

export function toBytes(v: number[] | Float32Array): Uint8Array {
  const f = v instanceof Float32Array ? v : Float32Array.from(v);
  return new Uint8Array(f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength));
}

export function fromBytes(b: Uint8Array): Float32Array {
  const copy = b.slice();
  return new Float32Array(copy.buffer, 0, Math.floor(copy.byteLength / 4));
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Items closest in meaning to the query vector, above `min` similarity. */
export function nearest(query: Float32Array, vectors: Map<string, Float32Array>, min: number, limit = 8) {
  return [...vectors.entries()]
    .map(([id, v]) => ({ id, score: cosine(query, v) }))
    .filter((r) => r.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
