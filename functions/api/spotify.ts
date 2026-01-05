interface Env {
  SPOTIFY_TOKEN: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  
  if (!env.SPOTIFY_TOKEN) {
    return new Response(JSON.stringify({ error: 'Spotify token not configured' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }

  const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';

  try {
    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${env.SPOTIFY_TOKEN}`,
      },
    });

    if (response.status === 204) return new Response(null, { status: 204 });
    if (!response.ok) return new Response(null, { status: response.status });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
