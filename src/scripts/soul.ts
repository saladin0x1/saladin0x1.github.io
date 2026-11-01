// The Driver - local status engine. Replaces the retired Gemini proxy.
// Resolution order: memory bank -> compiled corpus -> track context -> AI -> lyric/ghost fallback.
// Track context always prefers real LRCLIB lyrics; when none exist, it supplies Last.fm genre tags.
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

interface TrackContext {
  lyrics: string;
  lyricLine: string | null;
  genres: string[];
  instrumental: boolean;
}

async function fetchAiReaction(
  seed: string,
  isActive: boolean,
  context: TrackContext
): Promise<string | null> {
  if (aiFailures >= AI_FAILURE_LIMIT) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch('/api/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seed,
        isActive,
        lyrics: context.lyrics || undefined,
        genres: context.lyrics ? [] : context.genres,
        instrumental: context.instrumental,
      }),
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

function lyricsExcerpt(plainLyrics: string): string {
  const cleaned = plainLyrics
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^[\[(].*[\])]$/.test(line))
    .join('\n');

  const limit = 2800;
  if (cleaned.length <= limit) return cleaned;

  // Keep a representative middle window, where verses and choruses are more
  // useful than credits, spoken intros, or long outros.
  const start = Math.floor((cleaned.length - limit) / 2);
  const leftBoundary = cleaned.indexOf('\n', start);
  const rightBoundary = cleaned.lastIndexOf('\n', start + limit);
  return cleaned.slice(leftBoundary >= 0 ? leftBoundary + 1 : start, rightBoundary > start ? rightBoundary : start + limit);
}

async function fetchTrackContext(artist: string, track: string, seed: string): Promise<TrackContext> {
  const empty: TrackContext = { lyrics: '', lyricLine: null, genres: [], instrumental: false };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const params = new URLSearchParams({ artist, track });
    const response = await fetch(`/api/lyrics?${params}`, { signal: controller.signal });
    if (!response.ok) return empty;

    const data = (await response.json()) as {
      plainLyrics: string | null;
      instrumental: boolean;
      genres?: string[];
    };
    const plainLyrics = data.instrumental ? null : data.plainLyrics;
    return {
      lyrics: plainLyrics ? lyricsExcerpt(plainLyrics) : '',
      lyricLine: plainLyrics ? pickLyricLine(plainLyrics, seed) : null,
      genres: Array.isArray(data.genres) ? data.genres.slice(0, 5) : [],
      instrumental: data.instrumental === true,
    };
  } catch {
    return empty;
  } finally {
    clearTimeout(timeout);
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

  const context = await fetchTrackContext(artist, track, seed);
  const ai = await fetchAiReaction(seed, isActive, context);
  if (ai) {
    logUncataloged(seed, 'ai');
    LINE_CACHE.set(seed, ai);
    return ai;
  }

  const line = context.lyricLine ?? ghostLine(seed);
  logUncataloged(seed, context.lyricLine ? 'lyrics' : 'ghost');
  LINE_CACHE.set(seed, line);
  return line;
}
