// The Driver - local status engine. Replaces the retired Gemini proxy.
// Resolution order: memory bank -> compiled corpus -> real lyrics (LRCLIB) -> ghost markov.
// Unknown tracks are logged once per session as 'uncataloged_track' so the corpus can grow.

import { captureEvent } from './analytics';
import { CATALOG, CATALOG_LINES } from './corpus';

export interface Signal {
  isActive: boolean;
  artist?: string;
  track?: string;
}

const MEMORY_BANK: Record<string, string> = {
  'cinnamon chasers - luv deluxe': 'He misses her again.',
};

const IDLE_LINES = [
  'Awaiting interrupt.',
  'Silence is the default.',
  'Standby. Signal lost.',
  'Entropy decaying.',
  'Standard input: Null.',
  'Monitoring the void.',
  'Cache warm. Pipe broken.',
  'Dormant state.',
];

const LINE_CACHE = new Map<string, string>();
const LOGGED = new Set<string>();

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Deterministic PRNG so a given track always ghosts the same line.
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Ghost Markov: word chain built from the curated corpus lines ---

const CHAIN_START = '\u0002';
const CHAIN_END = '\u0003';

let chain: Map<string, string[]> | null = null;

function buildChain(): Map<string, string[]> {
  const c = new Map<string, string[]>();
  const link = (key: string, word: string) => {
    const bucket = c.get(key);
    if (bucket) bucket.push(word);
    else c.set(key, [word]);
  };

  for (const line of CATALOG_LINES) {
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let key = CHAIN_START;
    for (const word of words) {
      link(key, word);
      key = word.toLowerCase();
    }
    link(key, CHAIN_END);
  }
  return c;
}

function ghostLine(seed: string): string {
  if (!chain) chain = buildChain();
  const rand = mulberry32(hashSeed(seed));
  const pick = (arr: string[]) => arr[Math.floor(rand() * arr.length)];

  const words: string[] = [];
  let key = CHAIN_START;
  while (words.length < 12) {
    const bucket = chain.get(key);
    if (!bucket || bucket.length === 0) break;
    const word = pick(bucket);
    if (word === CHAIN_END) break;
    words.push(word);
    key = word.toLowerCase();
  }

  // A one-word ghost is noise; fall back to a whole curated line.
  if (words.length < 2) return pick(CATALOG_LINES);
  return words.join(' ');
}

// --- Workers AI reaction (/api/reaction) ---
// Tries the live model for uncataloged tracks; gives up quickly if the
// endpoint is absent (local vite dev) or failing, so the chain stays fast.

let aiFailures = 0;
const AI_FAILURE_LIMIT = 2;

async function fetchAiReaction(seed: string, isActive: boolean): Promise<string | null> {
  if (aiFailures >= AI_FAILURE_LIMIT) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch('/api/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed, isActive }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      aiFailures++;
      return null;
    }
    const data = (await response.json()) as { text?: string };
    const text = data.text?.trim();
    if (!text) {
      aiFailures++;
      return null;
    }
    return text;
  } catch {
    aiFailures++;
    return null;
  }
}

// --- Real lyrics via /api/lyrics (LRCLIB proxy) ---

function pickLyricLine(plainLyrics: string, seed: string): string | null {
  const lines = Array.from(
    new Set(
      plainLyrics
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !/^[\[(]/.test(l))
    )
  );
  const sized = lines.filter((l) => {
    const words = l.split(/\s+/).length;
    return words >= 3 && words <= 12;
  });
  const pool = sized.length > 0 ? sized : lines;
  if (pool.length === 0) return null;

  // Aim for the heart of the song, not the intro ad-libs.
  const start = Math.floor(pool.length * 0.2);
  const end = Math.max(start + 1, Math.ceil(pool.length * 0.8));
  const middle = pool.slice(start, end);
  return middle[hashSeed(seed) % middle.length] ?? null;
}

async function fetchLyricLine(artist: string, track: string, seed: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ artist, track });
    const response = await fetch(`/api/lyrics?${params}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { plainLyrics: string | null; instrumental: boolean };
    if (data.instrumental || !data.plainLyrics) return null;
    return pickLyricLine(data.plainLyrics, seed);
  } catch {
    return null;
  }
}

// --- Living archive ---

function logUncataloged(seed: string, source: 'ai' | 'lyrics' | 'ghost'): void {
  if (LOGGED.has(seed)) return;
  LOGGED.add(seed);
  captureEvent('uncataloged_track', { seed, source });
}

// --- Entry point ---

export async function resolveSignal({ isActive, artist, track }: Signal): Promise<string> {
  if (!isActive || !artist || !track) {
    const hour = new Date().getHours();
    return IDLE_LINES[hashSeed(`idle:${hour}`) % IDLE_LINES.length];
  }

  const seed = normalize(`${artist} - ${track}`);
  const cached = LINE_CACHE.get(seed);
  if (cached) return cached;

  const curated = MEMORY_BANK[seed] ?? CATALOG[seed];
  if (curated) {
    LINE_CACHE.set(seed, curated);
    return curated;
  }

  const ai = await fetchAiReaction(seed, isActive);
  if (ai) {
    logUncataloged(seed, 'ai');
    LINE_CACHE.set(seed, ai);
    return ai;
  }

  const lyric = await fetchLyricLine(artist, track, seed);
  const line = lyric ?? ghostLine(seed);
  logUncataloged(seed, lyric ? 'lyrics' : 'ghost');
  LINE_CACHE.set(seed, line);
  return line;
}
