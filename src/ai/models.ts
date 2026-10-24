/**
 * Open-weight models the optional library assistant can download. Both run
 * entirely on the phone through llama.cpp (llama.rn). Sizes are approximate
 * and only used for display and a sanity check on the download.
 */
export interface ModelFile {
  /** File name on disk. */
  name: string;
  url: string;
  approxBytes: number;
}

export interface VisionModel {
  id: string;
  title: string;
  blurb: string;
  model: ModelFile;
  /** The vision projector that lets the model see photos. */
  mmproj: ModelFile;
}

const HF = 'https://huggingface.co';
const MB = 1024 * 1024;

export const VISION_MODELS: VisionModel[] = [
  {
    id: 'smolvlm2-500m',
    title: 'Compact',
    blurb: 'SmolVLM2 500M. Quick, and fine for naming and tagging everyday things.',
    model: {
      name: 'SmolVLM2-500M-Video-Instruct-Q8_0.gguf',
      url: `${HF}/ggml-org/SmolVLM2-500M-Video-Instruct-GGUF/resolve/main/SmolVLM2-500M-Video-Instruct-Q8_0.gguf`,
      approxBytes: 437 * MB,
    },
    mmproj: {
      name: 'mmproj-SmolVLM2-500M-Video-Instruct-Q8_0.gguf',
      url: `${HF}/ggml-org/SmolVLM2-500M-Video-Instruct-GGUF/resolve/main/mmproj-SmolVLM2-500M-Video-Instruct-Q8_0.gguf`,
      approxBytes: 104 * MB,
    },
  },
  {
    id: 'qwen2.5-vl-3b',
    title: 'Thorough',
    blurb: 'Qwen2.5-VL 3B. Better at reading labels and odd objects. Needs a recent phone.',
    model: {
      name: 'Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf',
      url: `${HF}/ggml-org/Qwen2.5-VL-3B-Instruct-GGUF/resolve/main/Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf`,
      approxBytes: 1930 * MB,
    },
    mmproj: {
      name: 'mmproj-Qwen2.5-VL-3B-Instruct-Q8_0.gguf',
      url: `${HF}/ggml-org/Qwen2.5-VL-3B-Instruct-GGUF/resolve/main/mmproj-Qwen2.5-VL-3B-Instruct-Q8_0.gguf`,
      approxBytes: 845 * MB,
    },
  },
];

/** Text embeddings for "search by description". Small and always paired with the vision model. */
export const EMBED_MODEL: ModelFile & { id: string; queryPrefix: string; docPrefix: string } = {
  id: 'nomic-embed-v1.5',
  name: 'nomic-embed-text-v1.5.Q8_0.gguf',
  url: `${HF}/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q8_0.gguf`,
  approxBytes: 140 * MB,
  // nomic-embed expects task prefixes.
  queryPrefix: 'search_query: ',
  docPrefix: 'search_document: ',
};

export function totalBytes(m: VisionModel): number {
  return m.model.approxBytes + m.mmproj.approxBytes + EMBED_MODEL.approxBytes;
}

export function formatSize(bytes: number): string {
  return bytes >= 1024 * MB ? `${(bytes / (1024 * MB)).toFixed(1)} GB` : `${Math.round(bytes / MB)} MB`;
}
