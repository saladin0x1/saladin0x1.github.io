// Track-context proxy for the frequency widget.
// Lyrics come from LRCLIB. When lyrics are unavailable or the track is
// instrumental, Last.fm tags provide genre context for the reaction model.

const USER_AGENT = 'saladin.su frequency widget (https://saladin.su)';
const LASTFM_URL = 'https://ws.audioscrobbler.com/2.0/';

interface Env {
  LASTFM_API_KEY?: string;
}

interface LrclibRecord {
  plainLyrics: string | null;
  instrumental: boolean;
  trackName?: string;
  artistName?: string;
}

interface LastFmTag {
  name?: string;
}

function json(body: unknown, status = 200, cacheSeconds = 0): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : 'no-store',
  };
  return new Response(JSON.stringify(body), { status, headers });
}

async function timedFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function selectSearchHit(results: LrclibRecord[], artist: string, track: string): LrclibRecord | undefined {
  const normalizedArtist = normalize(artist);
  const normalizedTrack = normalize(track);
  return results.find((result) =>
    normalize(result.artistName ?? '') === normalizedArtist &&
    normalize(result.trackName ?? '') === normalizedTrack
  ) ?? results.find((result) => result.plainLyrics || result.instrumental);
}

function cleanTags(tags: LastFmTag[]): string[] {
  const ignored = /^(seen live|favorites?|favourite|my favorite|albums i own|under \d+ listeners|spotify)$/i;
  return Array.from(new Set(
    tags
      .map((tag) => tag.name?.trim() ?? '')
      .filter((tag) => tag && tag.length <= 32 && !ignored.test(tag))
  )).slice(0, 5);
}

async function fetchLastFmTags(
  env: Env,
  artist: string,
  track: string,
  method: 'track.getInfo' | 'artist.getTopTags'
): Promise<string[]> {
  if (!env.LASTFM_API_KEY) return [];

  const params = new URLSearchParams({
    method,
    artist,
    api_key: env.LASTFM_API_KEY,
    format: 'json',
    autocorrect: '1',
  });
  if (method === 'track.getInfo') params.set('track', track);

  try {
    const response = await timedFetch(`${LASTFM_URL}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    }, 2200);
    if (!response.ok) return [];

    const data = (await response.json()) as {
      track?: { toptags?: { tag?: LastFmTag[] | LastFmTag } };
      toptags?: { tag?: LastFmTag[] | LastFmTag };
    };
    const raw = method === 'track.getInfo' ? data.track?.toptags?.tag : data.toptags?.tag;
    const tags = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cleanTags(tags);
  } catch {
    return [];
  }
}

async function fetchGenres(env: Env, artist: string, track: string): Promise<string[]> {
  const [trackTags, artistTags] = await Promise.all([
    fetchLastFmTags(env, artist, track, 'track.getInfo'),
    fetchLastFmTags(env, artist, track, 'artist.getTopTags'),
  ]);
  return trackTags.length > 0 ? trackTags : artistTags;
}

async function fetchLyrics(artist: string, track: string): Promise<LrclibRecord | null> {
  const headers = { 'User-Agent': USER_AGENT };

  try {
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('artist_name', artist);
    getUrl.searchParams.set('track_name', track);
    const exact = await timedFetch(getUrl.toString(), { headers }, 1600);

    if (exact.ok) return (await exact.json()) as LrclibRecord;
    if (exact.status !== 404) return null;

    const searchUrl = new URL('https://lrclib.net/api/search');
    searchUrl.searchParams.set('artist_name', artist);
    searchUrl.searchParams.set('track_name', track);
    const search = await timedFetch(searchUrl.toString(), { headers }, 1600);
    if (!search.ok) return null;

    const results = (await search.json()) as LrclibRecord[];
    return selectSearchHit(results, artist, track) ?? null;
  } catch {
    return null;
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const artist = url.searchParams.get('artist')?.trim();
  const track = url.searchParams.get('track')?.trim();

  if (!artist || !track) {
    return json({ error: 'artist and track are required' }, 400);
  }

  // Start both sources together. Lyrics win, but a missing-lyrics genre
  // fallback should not wait for another sequential network round trip.
  const [lyrics, candidateGenres] = await Promise.all([
    fetchLyrics(artist, track),
    fetchGenres(context.env, artist, track),
  ]);
  const plainLyrics = lyrics?.plainLyrics ?? null;
  const instrumental = lyrics?.instrumental === true;
  const genres = plainLyrics && !instrumental ? [] : candidateGenres;
  const hasUsefulContext = Boolean(plainLyrics) || instrumental || genres.length > 0;

  // Never pin a transient all-empty upstream failure for a week.
  return json({ plainLyrics, instrumental, genres }, 200, hasUsefulContext ? 604800 : 300);
};
