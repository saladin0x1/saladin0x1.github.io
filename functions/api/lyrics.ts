// Proxy for LRCLIB (lrclib.net) - keyless open lyrics API.
// Tries the exact-match endpoint first, then fuzzy search. Returns a slim
// { plainLyrics, instrumental } payload so the client never sees upstream noise.

const USER_AGENT = 'saladin.su frequency widget (https://saladin.su)';

interface LrclibRecord {
  plainLyrics: string | null;
  instrumental: boolean;
}

function json(body: unknown, status = 200, cacheable = false): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cacheable) headers['Cache-Control'] = 'public, max-age=604800';
  return new Response(JSON.stringify(body), { status, headers });
}

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const artist = url.searchParams.get('artist')?.trim();
  const track = url.searchParams.get('track')?.trim();

  if (!artist || !track) {
    return json({ error: 'artist and track are required' }, 400);
  }

  const headers = { 'User-Agent': USER_AGENT };

  try {
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('artist_name', artist);
    getUrl.searchParams.set('track_name', track);
    const exact = await fetch(getUrl.toString(), { headers });

    if (exact.ok) {
      const data = (await exact.json()) as LrclibRecord;
      return json({ plainLyrics: data.plainLyrics, instrumental: data.instrumental }, 200, true);
    }

    if (exact.status !== 404) {
      return json({ error: `LRCLIB error: ${exact.status}` }, 502);
    }

    const searchUrl = new URL('https://lrclib.net/api/search');
    searchUrl.searchParams.set('artist_name', artist);
    searchUrl.searchParams.set('track_name', track);
    const search = await fetch(searchUrl.toString(), { headers });

    if (!search.ok) {
      return json({ error: `LRCLIB error: ${search.status}` }, 502);
    }

    const results = (await search.json()) as LrclibRecord[];
    const hit = results.find((r) => r.plainLyrics || r.instrumental);

    if (!hit) {
      return json({ error: 'not found' }, 404, true);
    }

    return json({ plainLyrics: hit.plainLyrics, instrumental: hit.instrumental }, 200, true);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'upstream failure';
    return json({ error: message }, 500);
  }
};
