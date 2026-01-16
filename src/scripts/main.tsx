import React, { useState, useEffect, useMemo, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { FaInstagram, FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { getNowPlaying, SpotifyCurrentlyPlaying } from './spotify';
import { getFrequency, FrequencyState } from './lastfm';
import posthog from 'posthog-js';

// --- PostHog Analytics ---
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

if (POSTHOG_KEY && typeof window !== 'undefined') {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    persistence: 'localStorage',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
  });
}

// --- Constants ---
const BIRTHDAY = new Date('2003-09-29T00:00:00');
const SPOTIFY_POLL_INTERVAL = 10000;
const FREQUENCY_POLL_INTERVAL = 7500; // Poll Last.fm every 15s

interface SocialLink {
  label: string;
  url: string;
  icon: React.ComponentType;
  doubleWidth?: boolean;
}
const SOCIAL_LINKS: SocialLink[] = [
  { label: 'INSTA', url: 'https://instagram.com/selouali01', icon: FaInstagram },
  { label: 'X', url: 'https://x.com/selouali01', icon: FaXTwitter },
  { label: 'LINKEDIN', url: 'https://linkedin.com/in/saladin0x1', icon: FaLinkedin },
  { label: 'GITHUB', url: 'https://github.com/saladin0x1', icon: FaGithub },
  { label: 'MAIL', url: 'mailto:me@saladin.su', icon: FaEnvelope, doubleWidth: true },
];

// --- System Intelligence Engine ---

const STATUS_CACHE = new Map<string, string>();

const FALLBACK_VOCABULARY = {
  active: [
    'Resonating with frequencies.',
    'I/O stream synchronized.',
    'Processing transient data.',
    'Thread status: Occupied.',
    'Allocating heap to sound.',
    'Feeding the entropy pool.',
    'Ingesting frequency.',
    'Active process: In-situ.',
  ],
  idle: [
    'Awaiting interrupt.',
    'Silence is the default.',
    'Standby. Signal lost.',
    'Entropy decaying.',
    'Standard input: Null.',
    'Monitoring the void.',
    'Cache warm. Pipe broken.',
    'Dormant state.',
  ],
};



async function fetchDynamicStatus(isActive: boolean, seed: string): Promise<string> {

  const cacheKey = `${isActive ? 'active' : 'idle'}:${seed}`;
  if (STATUS_CACHE.has(cacheKey)) {
    return STATUS_CACHE.get(cacheKey)!;
  }

  try {
    // Call our own secure backend function
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed, isActive })
    });
    
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const result = await response.json();
    const output = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (output) {
      console.debug(`Gemini response: "${output}"`);
      STATUS_CACHE.set(cacheKey, output);
      return output;
    }
    throw new Error('Empty response (Safety or Model Error)');

  } catch (error) {
    console.warn(` Fallback engaged: ${error}`);
    const collection = isActive ? FALLBACK_VOCABULARY.active : FALLBACK_VOCABULARY.idle;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % collection.length;
    return collection[index];
  }
}

// --- Hooks ---

function useUptime(birthDate: Date): string {
  const [uptime, setUptime] = useState('');

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const diff = now.getTime() - birthDate.getTime();

      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setUptime(`${years}Y ${days}D ${hours}H ${minutes}M ${seconds}S`);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [birthDate]);

  return uptime;
}

interface SpotifyState {
  isPlaying: boolean;
  title: string;
  artist: string;
  albumArt: string;
  status: 'playing' | 'offline' | 'error';
}

function useSpotify(pollInterval: number): SpotifyState {
  // TODO: Uncomment when Spotify API is back
  const [state, setState] = useState<SpotifyState>({
    isPlaying: false,
    title: '',
    artist: '',
    albumArt: '',
    status: 'error', // Default to error while Spotify is down
  });

  // useEffect(() => {
  //   let isMounted = true;
  //   let intervalId: number | undefined;

  //   const fetchStatus = async () => {
  //     if (document.visibilityState === 'hidden') return;

  //     const response = await getNowPlaying();

  //     if (!isMounted) return;

  //     if (response.status === 401 || response.status >= 500) {
  //       setState(prev => ({ ...prev, status: 'error', isPlaying: false }));
  //       if (intervalId) {
  //         clearInterval(intervalId);
  //         intervalId = undefined;
  //       }
  //       return;
  //     }

  //     if (!response.data || !response.data.is_playing || !response.data.item) {
  //       setState(prev => ({ ...prev, status: 'offline', isPlaying: false }));
  //       return;
  //     }

  //     const { item } = response.data;
  //     setState({
  //       isPlaying: true,
  //       title: item.name,
  //       artist: item.artists.map(a => a.name).join(', '),
  //       albumArt: item.album.images[0]?.url || '',
  //       status: 'playing',
  //     });
  //   };

  //   fetchStatus();
  //   intervalId = window.setInterval(fetchStatus, pollInterval);

  //   // Listen for visibility changes to pause/resume polling
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible') {
  //       fetchStatus();
  //       if (!intervalId) {
  //         intervalId = window.setInterval(fetchStatus, pollInterval);
  //       }
  //     }
  //     // Note: We don't strictly need to clear interval on hidden,
  //     // but the fetch guard handles the 'hidden' case.
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);

  //   return () => {
  //     isMounted = false;
  //     if (intervalId) clearInterval(intervalId);
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [pollInterval]);

  return state;
}

function useFrequency(pollInterval: number): FrequencyState {
  const [state, setState] = useState<FrequencyState>({
    isPlaying: false,
    track: '',
    artist: '',
    art: '',
    url: '',
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | undefined;

    const fetchStatus = async () => {
      if (document.visibilityState === 'hidden') return;
      
      const data = await getFrequency();
      if (isMounted) setState(data);
    };

    fetchStatus();
    intervalId = window.setInterval(fetchStatus, pollInterval);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
        if (!intervalId) intervalId = window.setInterval(fetchStatus, pollInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollInterval]);

  return state;
}

// --- Components ---

const Avatar = memo(function Avatar() {
  return (
    <div className="avatar-sq">
      <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#050505" />
        <circle cx="50" cy="40" r="20" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" strokeWidth="0.2" />
        <path d="M20 90C20 70 30 60 50 60C70 60 80 70 80 90" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" strokeWidth="0.2" />
      </svg>
    </div>
  );
});

const Bio = memo(function Bio() {
  return (
    <div className="bio-lines">
      <p className="bio-quote">"Illusion is the first of all pleasures - Voltaire".</p>
      <p className="bio-heading">Who am I?</p>
      <p className="bio-text">
        Part-time 22-year-old, also stuck between fleeting desires<br />
        and a yet unproven vision of who I should be.
      </p>
      <p className="bio-text" style={{ marginTop: '12px' }}>
        I've been told I live in the past,<br />
        and my social life won't tell you otherwise.
      </p>
      <p className="bio-text" style={{ marginTop: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
        Reluctantly, I am here.
      </p>
    </div>
  );
});

const ProfileRow = memo(function ProfileRow() {
  return (
    <div className="profile-row">
      <Avatar />
      <Bio />
    </div>
  );
});

interface DashContainerProps {
  lines: number;
  className?: string;
}

const DashContainer = memo(function DashContainer({ lines, className = '' }: DashContainerProps) {
  const dashes = useMemo(() => '_ '.repeat(200), []);

  return (
    <div className={`content-block ${className}`}>
      <div className="dash-wrapper">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="dash-line">{dashes}</div>
        ))}
      </div>
    </div>
  );
});

function isSleepTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 6;
}

function StatusWidget() {
  const uptime = useUptime(BIRTHDAY);
  const freq = useFrequency(FREQUENCY_POLL_INTERVAL);
  const [isNightTime, setIsNightTime] = useState(isSleepTime);

  useEffect(() => {
    const checkTime = () => setIsNightTime(isSleepTime());
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // SLEEPING only if: night time AND not actively scrobbling
  const isScrobbling = freq.status === 'live';
  const showSleeping = isNightTime && !isScrobbling;

  return (
    <div className="widget-box sm status-widget">
      <div className="status-row">
        STATUS: {showSleeping ? (
          <span className="status-sleeping">SLEEPING</span>
        ) : (
          <span className="status-online">ONLINE</span>
        )}
      </div>
      <div className="status-row">
        UPTIME: <span className="uptime-value">{uptime}</span>
      </div>
    </div>
  );
}

interface MarqueeProps {
  text: string;
  className?: string;
}

const Marquee = memo(function Marquee({ text, className = '' }: MarqueeProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number;

    const runMarquee = async () => {
      if (!containerRef.current || !textRef.current || cancelled) return;

      const containerWidth = containerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      const overflow = textWidth - containerWidth;

      // No scrolling needed if text fits
      if (overflow <= 0) {
        setOffset(0);
        return;
      }

      // 1. Show start for 3s
      setOffset(0);
      await new Promise(r => timeoutId = window.setTimeout(r, 3000));
      if (cancelled) return;

      // 2. Scroll to reveal end (move text LEFT)
      const scrollSpeed = 0.4; // px per frame
      let pos = 0;
      while (pos < overflow && !cancelled) {
        pos += scrollSpeed;
        setOffset(-Math.min(pos, overflow));
        await new Promise(r => requestAnimationFrame(r));
      }
      if (cancelled) return;

      // 3. Hold at end for 2s
      await new Promise(r => timeoutId = window.setTimeout(r, 2000));
      if (cancelled) return;

      // 4. Loop
      runMarquee();
    };

    runMarquee();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`marquee-container ${className}`}
      style={{ overflow: 'hidden', width: '100%' }}
    >
      <div
        ref={textRef}
        style={{
          transform: `translateX(${offset}px)`,
          whiteSpace: 'nowrap',
          display: 'inline-block',
          paddingLeft: '2px'
        }}
      >
        {text}
      </div>
    </div>
  );
});

function SpotifyWidget() {
  const spotify = useSpotify(SPOTIFY_POLL_INTERVAL);
  const [dynamicStatus, setDynamicStatus] = useState('OFFLINE');

  useEffect(() => {
    // Skip generation when Spotify is down
    if (spotify.status === 'error') return;

    const fetchStatus = async () => {
      const seed = spotify.isPlaying && spotify.title && spotify.artist
        ? `${spotify.artist} - ${spotify.title}`
        : '[SILENCE]';
      const status = await fetchDynamicStatus(spotify.isPlaying, seed);
      setDynamicStatus(status);
    };
    fetchStatus();
  }, [spotify.status, spotify.isPlaying, spotify.title, spotify.artist]);

  if (spotify.status === 'error') {
    return (
      <div className="widget-box sm spotify-widget">
        <div className="spotify-container">
          <div className="spotify-art-placeholder">
            <div className="spotify-disc" />
          </div>
          <div className="spotify-info">
            <div className="spotify-label">SPOTIFY</div>
            <div className="spotify-status">UNDER MAINTENANCE</div>
          </div>
        </div>
      </div>
    );
  }

  if (!spotify.isPlaying) {
    return (
      <div className="widget-box sm spotify-widget">
        <div className="spotify-container">
          <div className="spotify-art-placeholder">
            <div className="spotify-disc" />
          </div>
          <div className="spotify-info">
            <div className="spotify-label">SPOTIFY</div>
            <div className="spotify-status">
              <div className="marquee-text">{dynamicStatus}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-box sm spotify-widget">
      <div className="spotify-container">
        <div className="spotify-art">
          {spotify.albumArt && <img src={spotify.albumArt} alt="Album art" />}
        </div>
        <div className="spotify-info spotify-info--playing">
          <div className="spotify-label">
            <div className="marquee-text">{dynamicStatus}</div>
          </div>
          <div className="spotify-title">{spotify.title}</div>
          <div className="spotify-artist">{spotify.artist}</div>
        </div>
      </div>
    </div>
  );
}

function FrequencyWidget() {
  const freq = useFrequency(FREQUENCY_POLL_INTERVAL);
  const [dynamicStatus, setDynamicStatus] = useState('STANDBY');

  useEffect(() => {
    if (freq.status === 'loading') return;

    const fetchStatus = async () => {
      const isLive = freq.status === 'live';
      const seed = isLive && freq.track && freq.artist
        ? `${freq.artist} - ${freq.track}`
        : '[SILENCE]';

      const status = await fetchDynamicStatus(isLive, seed);
      setDynamicStatus(status);
    };
    fetchStatus();
  }, [freq.status, freq.track, freq.artist]);

  // Idle mode - show offline state
  if (freq.status !== 'live') {
    return (
      <div className="widget-box sm frequency-widget">
        <div className="track-container">
          <div className="track-art-placeholder">
            <div className="track-disc" />
          </div>
          <div className="track-info">
            <div className="track-status">
              <Marquee text={dynamicStatus} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Live mode - show current track
  return (
    <div className="widget-box sm frequency-widget">
      <a href={freq.url} target="_blank" rel="noopener noreferrer" className="track-container" style={{ textDecoration: 'none' }}>
        <div className="track-art">
          {freq.art ? <img src={freq.art} alt="Cover" /> : <div className="track-disc" />}
        </div>
        <div className="track-info track-info--playing">
          <div className="track-label" style={{ color: 'var(--accent-green)' }}>
            <Marquee text={dynamicStatus} />
          </div>
          <div className="track-title" style={{ color: 'var(--text-primary)' }}>
            {freq.track}
          </div>
          <div className="track-artist">{freq.artist}</div>
        </div>
      </a>
    </div>
  );
}

const NavWidget = memo(function NavWidget() {
  return (
    <div className="widget-box md nav-widget">
      <div className="nav-item">_ _ _ _ _ _</div>
      <div className="nav-item">_ _ _ _ _ _</div>
      <div className="nav-item">_ _ _ _ _ _</div>
      <div className="nav-item">_ _ _ _ _ _</div>
    </div>
  );
});

const EmailModal = memo(function EmailModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">SELECT EMAIL TYPE</div>
        <div className="modal-options">
          <a href="mailto:me@saladin.su" className="modal-option">
            <div className="modal-option-label">PERSONAL</div>
            <div className="modal-option-value">me@saladin.su</div>
          </a>
          <a href="mailto:salaheddine.elouali@emsi-edu.ma" className="modal-option">
            <div className="modal-option-label">ACADEMIC</div>
            <div className="modal-option-value">salaheddine.elouali@emsi-edu.ma</div>
          </a>
        </div>
      </div>
    </div>
  );
});

const SocialGrid = memo(function SocialGrid() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="widget-box social-widget">
        <div className="btn-grid">
          {SOCIAL_LINKS.map((social, index) => {
            const isMail = social.label === 'MAIL';
            return (
              <a
                key={index}
                href={isMail ? undefined : social.url}
                target={isMail ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="social-link"
                style={social.doubleWidth ? { gridColumn: 'span 2' } : undefined}
                onClick={isMail ? (e) => { e.preventDefault(); setIsModalOpen(true); } : undefined}
              >
                <div className="btn-sq">
                  <social.icon />
                  <span>{social.label}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
      <EmailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
});

const BottomFiller = memo(function BottomFiller() {
  return <DashContainer lines={18} className="bottom-filler" />;
});

const Footer = memo(function Footer() {
  return <div className="footer">2003-2026</div>;
});

function LeftColumn() {
  return (
    <div className="left-col">
      <ProfileRow />
      <DashContainer lines={12} />
      <DashContainer lines={12} />
    </div>
  );
}

function RightColumn() {
  return (
    <div className="right-col">
      <StatusWidget />
      <FrequencyWidget />
      <SpotifyWidget />
      <NavWidget />
      <SocialGrid />
      <BottomFiller />
      <Footer />
    </div>
  );
}

function App() {
  return (
    <div className="wireframe-container">
      <LeftColumn />
      <RightColumn />
    </div>
  );
}

// --- Mount ---

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<App />);
}
