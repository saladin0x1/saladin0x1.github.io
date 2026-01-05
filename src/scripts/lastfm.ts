// Last.fm API Configuration
// Keys are now handled in functions/api/lastfm.ts

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
  try {
    const res = await fetch('/api/lastfm');
    if (!res.ok) throw new Error('API Error');
    
    const data: LastFmResponse = await res.json();
    
    // Safety check for empty response or invalid structure
    if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
       return { isPlaying: false, track: '', artist: '', art: '', url: '', status: 'history' };
    }

    const track = data.recenttracks.track[0];

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
