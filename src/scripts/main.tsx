import React, { useState, useEffect, useMemo, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { FaInstagram, FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
// import { getNowPlaying } from './spotify';
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

function useSpotify(_pollInterval: number): SpotifyState {
  // TODO: Uncomment when Spotify API is back
  const [state, _setState] = useState<SpotifyState>({
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

const Avatar = memo(function Avatar({ lampOn }: { lampOn: boolean }) {
  const a = lampOn ? 1 : 0;
  return (
    <div className="avatar-sq" style={lampOn ? { borderColor: 'rgba(255,255,255,0.35)', boxShadow: '0 0 20px rgba(200,210,220,0.06)' } : undefined}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill={lampOn ? '#0a0a0a' : '#050505'} />
        <circle cx="50" cy="40" r="20" fill={lampOn ? '#0d0d0d' : '#0a0a0a'} stroke={`rgba(255,255,255,${0.3 + a * 0.5})`} strokeWidth={0.2 + a * 0.5} />
        <path d="M20 90C20 70 30 60 50 60C70 60 80 70 80 90" fill={lampOn ? '#0d0d0d' : '#0a0a0a'} stroke={`rgba(255,255,255,${0.3 + a * 0.5})`} strokeWidth={0.2 + a * 0.5} />
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

const ProfileRow = memo(function ProfileRow({ lampOn }: { lampOn: boolean }) {
  return (
    <div className="profile-row">
      <Avatar lampOn={lampOn} />
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

const ReadingCorner = memo(function ReadingCorner({ lampOn, setLampOn }: { lampOn: boolean; setLampOn: (v: boolean) => void }) {
  const [phase, setPhase] = useState<'off' | 'alive' | 'sweep' | 'settle'>('off');
  const b = lampOn ? 1 : 0;
  const s = (o: number) => `rgba(255,255,255,${o + b * 0.45})`;

  useEffect(() => {
    if (lampOn) {
      setPhase('alive');
      const t1 = setTimeout(() => setPhase('sweep'), 1500);
      const t2 = setTimeout(() => setPhase('settle'), 5500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setPhase('off');
    }
  }, [lampOn]);

  const armClass = `lamp-arm${phase !== 'off' ? ` lamp-arm--${phase}` : ''}`;

  return (
    <div className="content-block reading-corner">
      <style>{`
        @keyframes lampAlive {
          0%, 30% { transform: rotate(0deg); }
          40% { transform: rotate(2deg); }
          50% { transform: rotate(-1deg); }
          60% { transform: rotate(1deg); }
          80%, 100% { transform: rotate(0deg); }
        }
        @keyframes lampSweep {
          0%, 2% { transform: rotate(0deg); }
          45% { transform: rotate(35deg); }
          55% { transform: rotate(35deg); }
          95% { transform: rotate(-10deg); }
          100% { transform: rotate(-10deg); }
        }
        @keyframes lampSettle {
          0%, 4% { transform: rotate(-10deg); }
          100% { transform: rotate(5deg); }
        }
        .lamp-arm {
          transform-origin: 360px 175px;
          transform: rotate(0deg);
        }
        .lamp-arm--alive {
          animation: lampAlive 1.5s ease-in-out forwards;
        }
        .lamp-arm--sweep {
          animation: lampSweep 4s ease-in-out forwards;
        }
        .lamp-arm--settle {
          animation: lampSettle 1.5s ease-out forwards;
        }
      `}</style>
      <svg
        viewBox="0 0 400 300"
        xmlns="http://www.w3.org/2000/svg"
        className="rc-svg"
        fill="none"
      >
        <defs>
            <radialGradient id="lampLight" cx="325" cy="155" r="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(200,210,220,0.09)" />
              <stop offset="5%" stopColor="rgba(200,210,220,0.07)" />
              <stop offset="12%" stopColor="rgba(200,210,220,0.04)" />
              <stop offset="20%" stopColor="rgba(200,210,220,0.02)" />
              <stop offset="35%" stopColor="rgba(200,210,220,0.008)" />
              <stop offset="55%" stopColor="rgba(200,210,220,0.003)" />
              <stop offset="80%" stopColor="rgba(200,210,220,0.001)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <clipPath id="lightCone">
              <path d="M313 155 L288 258 L362 258 L343 155 Z" />
            </clipPath>
            <radialGradient id="irGlow" cx="320" cy="200" r="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(200,210,220,0.035)" />
              <stop offset="50%" stopColor="rgba(150,160,170,0.01)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>
          {lampOn && <rect x="0" y="0" width="400" height="300" fill="url(#irGlow)" />}

        {/* Window frame */}
        <rect x="110" y="10" width="180" height="110" rx="4" stroke={s(0.3)} strokeWidth={1.2 + b * 0.3} />
        <line x1="200" y1="10" x2="200" y2="120" stroke={s(0.2)} strokeWidth={0.6 + b * 0.2} />
        <line x1="110" y1="65" x2="290" y2="65" stroke={s(0.2)} strokeWidth={0.6 + b * 0.2} />

        {/* Moon */}
        <circle cx="155" cy="42" r="18" stroke={s(0.35)} strokeWidth={1 + b * 0.4} />
        <circle cx="162" cy="37" r="15" fill="rgba(0,0,0,0.9)" stroke="none" />

        {/* Stars */}
        <circle cx="128" cy="28" r={1.5 + b * 0.5} fill={s(0.25)} stroke="none" />
        <circle cx="230" cy="25" r={1.2 + b * 0.5} fill={s(0.2)} stroke="none" />
        <circle cx="258" cy="48" r={1.5 + b * 0.5} fill={s(0.18)} stroke="none" />
        <circle cx="275" cy="32" r={1 + b * 0.5} fill={s(0.2)} stroke="none" />
        <circle cx="188" cy="35" r={1.5 + b * 0.5} fill={s(0.3)} stroke="none">
          <animate attributeName="opacity" values={lampOn ? "0.75;0.2;0.75" : "0.3;0.08;0.3"} dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="245" cy="52" r={1.2 + b * 0.5} fill={s(0.25)} stroke="none">
          <animate attributeName="opacity" values={lampOn ? "0.7;0.15;0.7" : "0.25;0.06;0.25"} dur="4s" repeatCount="indefinite" />
        </circle>

        {/* Desk surface */}
        <line x1="10" y1="255" x2="390" y2="255" stroke={s(0.35)} strokeWidth={1.2 + b * 0.3} />

        {/* Plant */}
        <rect x="18" y="238" width="18" height="17" rx="1.5" stroke={s(0.2)} strokeWidth={0.8 + b * 0.3} />
        <line x1="27" y1="238" x2="27" y2="218" stroke={s(0.2)} strokeWidth={0.8 + b * 0.3} />
        <circle cx="27" cy="213" r="7" stroke={s(0.18)} strokeWidth={0.8 + b * 0.3} />
        <circle cx="20" cy="221" r="5.5" stroke={s(0.14)} strokeWidth={0.8 + b * 0.3} />
        <circle cx="34" cy="219" r="5" stroke={s(0.16)} strokeWidth={0.8 + b * 0.3} />

        {/* Stacked books */}
        <rect x="70" y="237" width="65" height="16" rx="1.5" stroke={s(0.35)} strokeWidth={1 + b * 0.4} />
        <rect x="65" y="223" width="72" height="16" rx="1.5" stroke={s(0.3)} strokeWidth={1 + b * 0.4} />
        <rect x="68" y="209" width="58" height="16" rx="1.5" stroke={s(0.25)} strokeWidth={1 + b * 0.4} />
        <rect x="63" y="195" width="72" height="16" rx="1.5" stroke={s(0.35)} strokeWidth={1 + b * 0.4} />
        <line x1="95" y1="237" x2="95" y2="253" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
        <line x1="102" y1="223" x2="102" y2="239" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
        <line x1="92" y1="209" x2="92" y2="225" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
        <line x1="88" y1="195" x2="88" y2="211" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />

        {/* Coffee mug */}
        <rect x="170" y="240" width="24" height="15" rx="2.5" stroke={s(0.3)} strokeWidth={1 + b * 0.4} />
        <path d="M194 244 Q201 244 201 249 Q201 254 194 255" stroke={s(0.25)} strokeWidth={1 + b * 0.3} />

        {/* Steam */}
        <path d="M178 238 Q175 224 180 208" stroke={s(0.4)} strokeWidth={1 + b * 0.3}>
          <animate attributeName="opacity" values={lampOn ? "0.85;0.3;0.85" : "0.4;0.1;0.4"} dur="3s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0 0;-1 -5;0 0" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M186 236 Q183 222 188 206" stroke={s(0.35)} strokeWidth={1 + b * 0.3}>
          <animate attributeName="opacity" values={lampOn ? "0.8;0.25;0.8" : "0.35;0.08;0.35"} dur="3.5s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0 0;1 -6;0 0" dur="3.5s" repeatCount="indefinite" />
        </path>
        <path d="M182 237 Q185 226 181 210" stroke={s(0.3)} strokeWidth={0.8 + b * 0.3}>
          <animate attributeName="opacity" values={lampOn ? "0.75;0.15;0.75" : "0.3;0.05;0.3"} dur="4s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0 0;-2 -4;0 0" dur="4s" repeatCount="indefinite" />
        </path>

        {/* Open book */}
        <path d="M228 253 Q248 225 268 253" stroke={s(0.35)} strokeWidth={1.2 + b * 0.4} />
        <path d="M268 253 Q288 225 308 253" stroke={s(0.35)} strokeWidth={1.2 + b * 0.4} />
        <line x1="228" y1="253" x2="308" y2="253" stroke={s(0.25)} strokeWidth={1 + b * 0.3} />
        <path d="M243 241 Q248 239.2 253 241" stroke={s(0.2)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M241 243 Q248 240.9 255 243" stroke={s(0.18)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M239 245 Q248 242.6 257 245" stroke={s(0.16)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M237 247 Q248 244.4 259 247" stroke={s(0.14)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M235 249 Q248 246.3 261 249" stroke={s(0.12)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M233 251 Q248 248.2 263 251" stroke={s(0.1)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M283 241 Q288 239.2 293 241" stroke={s(0.2)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M281 243 Q288 240.9 295 243" stroke={s(0.18)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M279 245 Q288 242.6 297 245" stroke={s(0.16)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M277 247 Q288 244.4 299 247" stroke={s(0.14)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M275 249 Q288 246.3 301 249" stroke={s(0.12)} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M273 251 Q288 248.2 303 251" stroke={s(0.1)} strokeWidth={0.5 + b * 0.3} fill="none" />

        {/* Lamp */}
        <g onClick={() => setLampOn(!lampOn)} style={{ cursor: 'pointer' }}>
          <rect x="300" y="140" width="60" height="120" fill="transparent" stroke="none" />
          <ellipse cx="360" cy="253" rx="18" ry="3" stroke={s(0.4)} strokeWidth={1 + b * 0.4} />
          <line x1="360" y1="250" x2="360" y2="175" stroke={s(0.3)} strokeWidth={1 + b * 0.3} />
          <circle cx="360" cy="175" r="3" stroke={s(0.4)} strokeWidth={1 + b * 0.3} />
          <g className={armClass}>
            <line x1="360" y1="175" x2="325" y2="145" stroke={s(0.3)} strokeWidth={1 + b * 0.3} />
            <path d="M313 145 L338 145 L343 155 L308 155 Z" stroke={s(0.4)} strokeWidth={1 + b * 0.3} />
            {/* LAYER 1: Cone with distance falloff + soft edges */}
            <g clipPath="url(#lightCone)">
              <path d="M308 155 L277 258 L374 258 L343 155 Z"
                fill={lampOn ? "url(#distFade)" : s(0.008)}
                mask="url(#coneMask)"
              />
            </g>
            {/* LAYER 2: Diffuse glow at shade opening */}
            {lampOn && (
              <ellipse cx="325" cy="155" rx="18" ry="5"
                fill="rgba(200,210,220,0.12)" filter="url(#softGlow)"
              />
            )}
            {/* LAYER 3: Hot spot on desk surface */}
            <ellipse cx="325" cy="256" rx="42" ry="4"
              fill={lampOn ? "rgba(200,210,220,0.055)" : s(0.012)} stroke="none"
            >
              <animate attributeName="opacity" values="1;0.6;1" dur="4s" repeatCount="indefinite" />
            </ellipse>
            {/* LAYER 4: Bright line at shade opening (bulb) */}
            <line x1="311" y1="155" x2="339" y2="155"
              stroke={lampOn ? "rgba(200,210,220,0.25)" : s(0.03)}
              strokeWidth={0.5 + b * 0.5}
            />
            {lampOn && (
              <circle cx="325" cy="150" r="2" fill="rgba(220,230,240,0.9)" stroke="none">
                <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
});

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

function isSleepTime(): boolean

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
  const [lampOn, setLampOn] = useState(false);
  return (
    <div className="left-col">
      <ProfileRow lampOn={lampOn} />
      <DashContainer lines={12} />
      <ReadingCorner lampOn={lampOn} setLampOn={setLampOn} />
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
