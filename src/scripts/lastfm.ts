// Last.fm API Configuration
const LASTFM_USER = import.meta.env.VITE_LASTFM_USER as string;
const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY as string;
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export interface LastFmTrack {
  name: string;
  artist: { '#text': string };
  image: { '#text': string }[];
  '@attr'?: { nowplaying: string };
  url: string;
}

export interface LastFmResponse {
  recenttracks: {
    track: LastFmTrack[];
  };
}

export interface FrequencyState {
  isPlaying: boolean;
  track: string;
  artist: string;
  art: string;
  url: string;
  status: 'live' | 'history' | 'error' | 'loading';
}

export async function getFrequency(): Promise<FrequencyState> {
  const params = new URLSearchParams({
    method: 'user.getrecenttracks',
    user: LASTFM_USER,
    api_key: LASTFM_API_KEY,
    format: 'json',
    limit: '1',
  });

  try {
    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error('API Error');
    
    const data: LastFmResponse = await res.json();
    const track = data.recenttracks.track[0];

    if (!track) {
      return { isPlaying: false, track: '', artist: '', art: '', url: '', status: 'history' };
    }

    const isPlaying = track['@attr']?.nowplaying === 'true';
    // Get the largest image (index 3 is usually 'extralarge')
    const art = track.image[3]?.['#text'] || track.image[2]?.['#text'] || '';

    return {
      isPlaying,
      track: track.name,
      artist: track.artist['#text'],
      art,
      url: track.url,
      status: isPlaying ? 'live' : 'history',
    };
  } catch (error) {
    console.error('Last.fm Error:', error);
    return { isPlaying: false, track: '', artist: '', art: '', url: '', status: 'error' };
  }
}
