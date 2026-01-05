interface Env {
  LASTFM_API_KEY: string;
  LASTFM_USER: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  if (!env.LASTFM_API_KEY || !env.LASTFM_USER) {
    return new Response(JSON.stringify({ error: 'Last.fm configuration missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
  const params = new URLSearchParams({
    method: 'user.getrecenttracks',
    user: env.LASTFM_USER,
    api_key: env.LASTFM_API_KEY,
    format: 'json',
    limit: '1',
  });

  try {
    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) {
        return new Response(JSON.stringify({ error: `Last.fm API Error: ${res.status}` }), {
            status: res.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
