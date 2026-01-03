// Spotify API Types
export interface SpotifyArtist {
  name: string;
  id: string;
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

export interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

export interface SpotifyCurrentlyPlaying {
  is_playing: boolean;
  item: SpotifyTrack | null;
}

// API Configuration
const SPOTIFY_TOKEN = import.meta.env.VITE_SPOTIFY_TOKEN as string | undefined;
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';

export interface SpotifyApiResponse {
  status: number;
  data: SpotifyCurrentlyPlaying | null;
  error?: string;
}

export async function getNowPlaying(): Promise<SpotifyApiResponse> {
  if (!SPOTIFY_TOKEN) {
    console.warn('VITE_SPOTIFY_TOKEN is not set');
    return { status: 500, data: null, error: 'Token not configured' };
  }

  try {
    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${SPOTIFY_TOKEN}`,
      },
    });

    // No content - not playing
    if (response.status === 204) {
      return { status: 204, data: null };
    }

    // Auth error
    if (response.status === 401) {
      return { status: 401, data: null, error: 'Unauthorized' };
    }

    // Other errors
    if (!response.ok) {
      return { status: response.status, data: null, error: 'API Error' };
    }

    const data = await response.json() as SpotifyCurrentlyPlaying;
    return { status: 200, data };
  } catch (error) {
    console.error('Spotify API Error:', error);
    return { status: 500, data: null, error: 'Network Error' };
  }
}
