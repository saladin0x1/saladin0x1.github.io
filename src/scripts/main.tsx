import React, { useState, useEffect, useMemo, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { FaInstagram, FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { SiHackerone } from 'react-icons/si';
import { getFrequency, FrequencyState } from './lastfm';
import { initAnalytics } from './analytics';

// Analytics is split from the startup bundle and loaded during browser idle.
initAnalytics();

// --- Constants ---
const BIRTHDAY = new Date('2003-09-29T00:00:00');
const FREQUENCY_POLL_INTERVAL = 15000; // Responsive enough for scrobbles; halves background traffic

interface SocialLink {
  label: string;
  url: string;
  icon: React.ComponentType;
}
const SOCIAL_LINKS: SocialLink[] = [
  { label: 'LINKEDIN', url: 'https://linkedin.com/in/saladin0x1', icon: FaLinkedin },
  { label: 'GITHUB', url: 'https://github.com/saladin0x1', icon: FaGithub },
  { label: 'HACKERONE', url: 'https://hackerone.com/saladin0x1', icon: SiHackerone },
  { label: 'MAIL', url: 'mailto:me@saladin.su', icon: FaEnvelope },
  { label: 'INSTA', url: 'https://instagram.com/selouali01', icon: FaInstagram },
  { label: 'X', url: 'https://x.com/selouali01', icon: FaXTwitter },
];

// Status generation lives in soul.ts (corpus + lyrics + ghost markov).

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
    <div className="avatar-sq" aria-hidden="true" style={lampOn ? { borderColor: 'rgba(255,255,255,0.35)', boxShadow: '0 0 20px rgba(200,210,220,0.06)' } : undefined}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill={lampOn ? '#0a0a0a' : '#050505'} />
        <circle cx="50" cy="40" r="20" fill={lampOn ? '#0d0d0d' : '#0a0a0a'} stroke={`rgba(255,255,255,${0.3 + a * 0.5})`} strokeWidth={0.2 + a * 0.5} />
        <path d="M20 90C20 70 30 60 50 60C70 60 80 70 80 90" fill={lampOn ? '#0d0d0d' : '#0a0a0a'} stroke={`rgba(255,255,255,${0.3 + a * 0.5})`} strokeWidth={0.2 + a * 0.5} />
      </svg>
    </div>
  );
});

const Bio = memo(function Bio() {
  const age = Math.floor(
    (Date.now() - BIRTHDAY.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  return (
    <div className="bio-lines">
      <h1 className="bio-name">Salah-Eddine Elouali</h1>
      <p className="bio-role">Security Researcher</p>
      <p className="bio-quote">"Illusion is the first of all pleasures - Voltaire".</p>
      <h2 className="bio-heading">Who am I?</h2>
      <p className="bio-text">
        Part-time {age}-year-old, also stuck between fleeting desires<br />
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
    <header className="profile-row">
      <Avatar lampOn={lampOn} />
      <Bio />
    </header>
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

// interface WorkEntry {
//   name: string;
//   detail: string;
//   meta: string;
//   url: string;
// }

// const SELECTED_WORK: WorkEntry[] = [
//   { name: 'CVE-2025-53770', detail: 'SharePoint ToolShell exploit chain analysis', meta: 'RB 2025', url: 'https://github.com/saladin0x1/CVE-2025-53770' },
//   { name: 'lws-toctou-poc', detail: 'TOCTOU race condition proof of concept', meta: 'C 2025', url: 'https://github.com/saladin0x1/lws-toctou-poc' },
//   { name: 'malware-circus', detail: 'Fernet-encrypted malware dissection', meta: 'PY 2025', url: 'https://github.com/saladin0x1/MalwareCircusFernetDissection' },
//   { name: 'rfc-rag', detail: 'Retrieval-augmented answers over the RFC corpus', meta: 'PY 2025', url: 'https://github.com/saladin0x1/rfc-rag' },
//   { name: 'xray-server', detail: 'VLESS+Reality server against internet censorship', meta: 'OPS 2025', url: 'https://github.com/saladin0x1/xray-server' },
//   { name: 'bobbi-the-watchdog', detail: 'Infrastructure watchdog automation', meta: 'PY 2025', url: 'https://github.com/saladin0x1/bobbi-the-watchdog' },
// ];

const ARTICLES = [
  {
    index: '01',
    name: 'CleanseMeMaybe',
    meta: 'CVE-2026-78416 · RCE',
    url: '/articles/cleanse-me-maybe/',
  },
  {
    index: '02',
    name: 'Flat-Pack Security',
    meta: 'SQLi → RCE · CASE FILE',
    url: '/articles/flat-pack-security/',
  },
];

const SelectedWork = memo(function SelectedWork() {
  return (
    <section className="content-block work-block" aria-labelledby="blogs-heading">
      <div className="work-wrapper">
        <h2 className="work-header" id="blogs-heading">BLOGS</h2>
        {ARTICLES.map((article) => (
          <a key={article.url} className="work-row" href={article.url}>
            <div className="work-line">
              <span className="work-index">{article.index}</span>
              <span className="work-name">{article.name}</span>
              <span className="work-leader"></span>
              <span className="work-meta">{article.meta}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
});

const ReadingCorner = memo(function ReadingCorner({ lampOn, setLampOn }: { lampOn: boolean; setLampOn: (v: boolean) => void }) {
  const [catPhase, setCatPhase] = useState<'sitstart' | 'stand' | 'walk' | 'sitdown' | 'sit'>('sitstart');
  const b = lampOn ? 1 : 0;
  // Physics: the lamp lights ONLY what light can reach. No global boost —
  // moon, stars, window stay night-dim whether the lamp is on or off.
  const s = (o: number) => `rgba(255,255,255,${o})`;
  // Objects inside the beam get lit (open book); brightness ~2.4x, capped.
  const lit = (o: number) => (lampOn ? Math.min(1, o * 2.4) : o);

  // preload + decode both strips BEFORE first paint of the cat —
  // otherwise she pops in a beat after the scene renders (the glitch)
  const [stripsReady, setStripsReady] = useState(false);
  // Choreography: sit (0.5s) -> stand up -> walk (8s) -> sit down -> sit.
  // Timer fallbacks guard against missed onAnimationEnd events.
  useEffect(() => {
    if (!stripsReady) return;
    const timings: Record<string, [string, number]> = {
      sitstart: ['stand', 500],
      stand: ['walk', 1100],
      walk: ['sitdown', 8600],
      sitdown: ['sit', 1100],
    };
    const next = timings[catPhase];
    if (!next) return;
    const t = setTimeout(() => setCatPhase(next[0] as typeof catPhase), next[1]);
    return () => clearTimeout(t);
  }, [catPhase, stripsReady]);
  useEffect(() => {
    Promise.all(['/cat/walk-start2.png', '/cat/sitting.png', '/cat/standup.png', '/cat/sitdown.png'].map((src) => new Promise<void>((res) => {
      const i = new Image();
      i.src = src;
      i.onload = i.onerror = () => res();
      if (i.decode) i.decode().then(() => res(), () => res());
    }))).then(() => setStripsReady(true));
  }, []);

  const armClass = `lamp-arm${lampOn ? ' lamp-arm--lit' : ''}`;

  return (
    <div className="content-block reading-corner">
      <style>{`
        /* One continuous Pixar-style motion: anticipation -> sweep ->
           overshoot -> damped spring settle. No phase swaps, no restarts. */
        @keyframes lampMove {
          0%, 8%   { transform: rotate(0deg); }
          15%      { transform: rotate(-4.5deg); }   /* anticipation: pull back */
          21%      { transform: rotate(-2deg); }     /* release into the sweep */
          52%      { transform: rotate(34deg); }     /* main sweep, accelerating */
          59%      { transform: rotate(39deg); }     /* overshoot past target */
          68%      { transform: rotate(32deg); }     /* spring back */
          76%      { transform: rotate(36deg); }     /* damped oscillation */
          84%      { transform: rotate(34.5deg); }
          100%     { transform: rotate(35deg); }     /* rest, lamp aimed at desk */
        }
        /* The pool lives ON the desk and slides to where the beam points —
           it never rotates through the air. Mirrors the arm timeline. */
        @keyframes poolMove {
          0%, 8%   { transform: translateX(0px); }
          15%      { transform: translateX(5px); }
          21%      { transform: translateX(2px); }
          52%      { transform: translateX(-40px); }
          59%      { transform: translateX(-45px); }
          68%      { transform: translateX(-37px); }
          76%      { transform: translateX(-42px); }
          84%      { transform: translateX(-40px); }
          100%     { transform: translateX(-41px); }
        }
        .pool {
          will-change: transform;
          transition: transform 0.9s cubic-bezier(0.34, 1.3, 0.64, 1);
        }
        .pool--lit {
          animation: poolMove 5.5s cubic-bezier(0.33, 0, 0.2, 1) forwards;
          transition: none;
        }
        /* Filament breathing: subtle, alive, not a strobe */
        .cone--lit {
          animation: coneFlicker 7s ease-in-out infinite;
        }
        @keyframes coneFlicker {
          0%, 100% { opacity: 1; }
          31% { opacity: 0.96; }
          34% { opacity: 1; }
          67% { opacity: 0.93; }
          69% { opacity: 0.99; }
          71% { opacity: 0.97; }
        }
        /* Dust drifts upward through the beam */
        .dust circle {
          animation: dustDrift 6s ease-in-out infinite;
        }
        .dust circle:nth-child(2) { animation-duration: 4.5s; animation-delay: -1.2s; }
        .dust circle:nth-child(3) { animation-duration: 7.5s; animation-delay: -3s; }
        .dust circle:nth-child(4) { animation-duration: 5.2s; animation-delay: -2s; }
        .dust circle:nth-child(5) { animation-duration: 6.8s; animation-delay: -4s; }
        @keyframes dustDrift {
          0%   { transform: translate(0, 0); opacity: 0.2; }
          50%  { transform: translate(2px, -14px); opacity: 1; }
          100% { transform: translate(-1px, -28px); opacity: 0; }
        }
        .lamp-arm {
          transform-origin: 360px 175px;
          transform: rotate(0deg);
          will-change: transform;
          transition: transform 0.9s cubic-bezier(0.34, 1.3, 0.64, 1); /* springy return on off */
        }
        .lamp-arm--lit {
          animation: lampMove 5.5s cubic-bezier(0.33, 0, 0.2, 1) forwards;
          transition: none;
        }
        /* Shadow cat — CPU-baked silhouette from DreamNoms "Somali Cat Animated v1.2" (CC BY 4.0) */
        .cat-walker {
          will-change: transform;
          transform: translateX(-16.5px);
        }
        .cat-walker.playing {
          animation: catCross 8s linear both;
        }
        @keyframes catCross {
          from { transform: translateX(-16.5px); }
          to { transform: translateX(188.5px); }
        }
        /* Hard cuts only — poses at seams are minimized by frame choice
           (walk starts at the frame closest to standing, ends at the frame
           closest to sitdown's first pose). No fades: a crossfade reads
           as a translucent double cat. */
        .cat-sprite.off { opacity: 0; }
        /* The reordered walk strip starts on the gait pose closest to the
           final stand pose. Infinite loops may wrap -756px back to 0px. */
        .cat-sprite--walk.playing {
          will-change: transform;
          animation: catWalkFrames 0.95049s steps(12) infinite;
        }
        @keyframes catWalkFrames {
          from { transform: translateX(0); }
          to { transform: translateX(-756px); }
        }
        /* One-shot strips must NOT finish at -756px: that is one frame past
           a 12-frame sheet. Explicit step-end frames hold the valid final
           frame (-693px) instead of rendering a blank frame. */
        .cat-sprite--stand.playing {
          will-change: transform;
          animation: catStandFrames 0.9s step-end forwards;
        }
        .cat-sprite--sitdown.playing {
          will-change: transform;
          animation: catSitdownFrames 0.9s step-end forwards;
        }
        .cat-sprite--sit.playing {
          will-change: transform;
          animation: catSitFrames 1.5s steps(12) infinite;
        }
        @keyframes catStandFrames {
          0%      { transform: translateX(0); }
          8.333%  { transform: translateX(-63px); }
          16.667% { transform: translateX(-126px); }
          25%     { transform: translateX(-189px); }
          33.333% { transform: translateX(-252px); }
          41.667% { transform: translateX(-315px); }
          50%     { transform: translateX(-378px); }
          58.333% { transform: translateX(-441px); }
          66.667% { transform: translateX(-504px); }
          75%     { transform: translateX(-567px); }
          83.333% { transform: translateX(-630px); }
          91.667%, 100% { transform: translateX(-693px); }
        }
        @keyframes catSitdownFrames {
          0%      { transform: translateX(0); }
          8.333%  { transform: translateX(-63px); }
          16.667% { transform: translateX(-126px); }
          25%     { transform: translateX(-189px); }
          33.333% { transform: translateX(-252px); }
          41.667% { transform: translateX(-315px); }
          50%     { transform: translateX(-378px); }
          58.333% { transform: translateX(-441px); }
          66.667% { transform: translateX(-504px); }
          75%     { transform: translateX(-567px); }
          83.333% { transform: translateX(-630px); }
          91.667%, 100% { transform: translateX(-693px); }
        }
        @keyframes catSitFrames {
          from { transform: translateX(0); }
          to { transform: translateX(-756px); }
        }
        /* The beam redirects at ~1/3 of the arm angle: the pool slides
           along the desk, it never lifts off the surface. */
      `}</style>
      <svg
        viewBox="0 0 400 300"
        xmlns="http://www.w3.org/2000/svg"
        className="rc-svg"
        fill="none"
      >
        <defs>
            {/* Light physics: one radial gradient anchored at the bulb (325,152)
                handles BOTH inverse-square distance falloff AND feathered cone
                edges — the widening cone samples wider gradient rings. */}
            <radialGradient id="distFade" cx="325" cy="152" r="115" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(215,225,235,0.34)" />
              <stop offset="8%" stopColor="rgba(210,220,230,0.26)" />
              <stop offset="20%" stopColor="rgba(205,215,225,0.15)" />
              <stop offset="40%" stopColor="rgba(200,210,220,0.07)" />
              <stop offset="70%" stopColor="rgba(195,205,215,0.025)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            {/* Desk pool: brightest at impact point, dissolving outward */}
            <radialGradient id="poolGrad" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="rgba(210,220,230,0.22)" />
              <stop offset="45%" stopColor="rgba(200,210,220,0.09)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            {/* Volumetric scatter at the shade opening: stacked blurs */}
            <filter id="softGlow" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="bloom" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="core" />
              <feMerge>
                <feMergeNode in="bloom" />
                <feMergeNode in="core" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Shade interior: underside catches the bulb light */}
            <linearGradient id="shadeGrad" x1="0.5" y1="1" x2="0.5" y2="0">
              <stop offset="0%" stopColor="rgba(210,220,230,0.28)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </linearGradient>
            {/* Right page catchlight: where the pool light lands on paper */}
            <linearGradient id="pageGlow" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="rgba(200,210,220,0)" />
              <stop offset="100%" stopColor="rgba(200,210,220,0.07)" />
            </linearGradient>
            <clipPath id="lightCone">
              <path d="M313 155 L288 258 L362 258 L343 155 Z" />
            </clipPath>
            {/* Local ambient: a faint sphere of light AROUND the lamp only,
                not a scene-wide wash */}
            <radialGradient id="irGlow" cx="330" cy="205" r="130" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(200,210,220,0.05)" />
              <stop offset="55%" stopColor="rgba(150,160,170,0.014)" />
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

        {/* Stacked books — physical stack: exact contact (no sinking into
            each other), each volume tilted ~1° and offset like real wear */}
        <g transform="rotate(-0.8 102 245)">
          <rect x="70" y="237" width="65" height="16" rx="1.5" stroke={s(0.35)} strokeWidth={1 + b * 0.4} fill="none" />
          <line x1="82" y1="240" x2="82" y2="250" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
          <line x1="95" y1="240" x2="95" y2="250" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
          <line x1="108" y1="240" x2="108" y2="250" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
        </g>
        <g transform="rotate(0.6 101 229)">
          <rect x="65" y="221" width="72" height="16" rx="1.5" stroke={s(0.3)} strokeWidth={1 + b * 0.4} fill="none" />
          <line x1="88" y1="224" x2="88" y2="234" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
          <line x1="102" y1="224" x2="102" y2="234" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
        </g>
        <g transform="rotate(-1.1 97 213)">
          <rect x="68" y="205" width="58" height="16" rx="1.5" stroke={s(0.25)} strokeWidth={1 + b * 0.4} fill="none" />
          <line x1="85" y1="208" x2="85" y2="218" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
          <line x1="97" y1="208" x2="97" y2="218" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
          <line x1="109" y1="208" x2="109" y2="218" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
        </g>
        <g transform="rotate(0.9 99 197)">
          <rect x="63" y="189" width="72" height="16" rx="1.5" stroke={s(0.35)} strokeWidth={1 + b * 0.4} fill="none" />
          <line x1="88" y1="192" x2="88" y2="202" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
          <line x1="102" y1="192" x2="102" y2="202" stroke={s(0.15)} strokeWidth={0.5 + b * 0.3} />
        </g>

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

        {/* Open book — the one object inside the beam, so it gets lit;
            the right page additionally catches the desk pool glow */}
        <path d="M228 253 Q248 225 268 253" stroke={s(lit(0.35))} strokeWidth={1.2 + b * 0.4} fill="none" />
        <path d="M268 253 Q288 225 308 253" stroke={s(lit(0.35))} strokeWidth={1.2 + b * 0.4}
          fill={lampOn ? 'url(#pageGlow)' : 'none'} />
        <line x1="228" y1="253" x2="308" y2="253" stroke={s(lit(0.25))} strokeWidth={1 + b * 0.3} />
        <path d="M243 241 Q248 239.2 253 241" stroke={s(lit(0.2))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M241 243 Q248 240.9 255 243" stroke={s(lit(0.18))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M239 245 Q248 242.6 257 245" stroke={s(lit(0.16))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M237 247 Q248 244.4 259 247" stroke={s(lit(0.14))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M235 249 Q248 246.3 261 249" stroke={s(lit(0.12))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M233 251 Q248 248.2 263 251" stroke={s(lit(0.1))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M283 241 Q288 239.2 293 241" stroke={s(lit(0.2))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M281 243 Q288 240.9 295 243" stroke={s(lit(0.18))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M279 245 Q288 242.6 297 245" stroke={s(lit(0.16))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M277 247 Q288 244.4 299 247" stroke={s(lit(0.14))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M275 249 Q288 246.3 301 249" stroke={s(lit(0.12))} strokeWidth={0.5 + b * 0.3} fill="none" />
        <path d="M273 251 Q288 248.2 303 251" stroke={s(lit(0.1))} strokeWidth={0.5 + b * 0.3} fill="none" />

        {/* Shadow cat — silhouette sprite from DreamNoms "Somali Cat Animated v1.2", CC BY 4.0
            https://sketchfab.com/3d-models/somali-cat-animated-ver-12-e185c3fd92b64c32b4515a32b29252fc
            Walks the front desk edge, then sits between mug and open book */}
        <defs>
          <clipPath id="catWindow">
            <rect x="0" y="208" width="63" height="48" />
          </clipPath>
        </defs>
        {/* All five sprites mount ONCE and never unmount — phases flip
            visibility only, so no transition ever re-composites an image
            (that one-frame blank was the flash). */}
        {stripsReady && (
          <>
            <g transform="translate(-16.4,0)">
              <g clipPath="url(#catWindow)">
                <image className={`cat-sprite cat-sprite--sit${catPhase === 'sitstart' ? ' on' : ' off'}`} href="/cat/sitting.png" x="0" y="215.8" width="756" height="42" />
              </g>
            </g>
            <g className={`cat-walker${catPhase === 'walk' ? ' playing' : ''}`}
              onAnimationEnd={(e) => { if (e.animationName === 'catCross') setCatPhase('sitdown'); }}>
              <g clipPath="url(#catWindow)">
                {/* standup lives INSIDE the walker: at walk start its ghost
                    dissolves WHILE MOVING with her — a stationary ghost
                    lingering behind was the flicker */}
                <image
                  className={`cat-sprite cat-sprite--stand${catPhase === 'stand' ? ' playing on' : ' off'}`}
                  href="/cat/standup.png" x="0" y="215.8" width="756" height="42"
                  onAnimationEnd={(e) => { if (e.animationName === 'catStandFrames') setCatPhase('walk'); }}
                />
                <image className={`cat-sprite cat-sprite--walk${catPhase === 'walk' ? ' playing on' : ' off'}`} href="/cat/walk-start2.png" x="0" y="215.8" width="756" height="42" />
              </g>
            </g>
            <g transform="translate(188.5,0)">
              <g clipPath="url(#catWindow)">
                <image
                  className={`cat-sprite cat-sprite--sitdown${catPhase === 'sitdown' ? ' playing on' : ' off'}`}
                  href="/cat/sitdown.png" x="0" y="215.8" width="756" height="42"
                  onAnimationEnd={(e) => { if (e.animationName === 'catSitdownFrames') setCatPhase('sit'); }}
                />
                <image className={`cat-sprite cat-sprite--sit${catPhase === 'sit' ? ' playing on' : ' off'}`} href="/cat/sitting.png" x="0" y="215.8" width="756" height="42" />
              </g>
            </g>
          </>
        )}

        {/* Lamp */}
        <g
          role="button"
          tabIndex={0}
          aria-label={lampOn ? 'Turn reading lamp off' : 'Turn reading lamp on'}
          aria-pressed={lampOn}
          onClick={() => setLampOn(!lampOn)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setLampOn(!lampOn);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <rect x="300" y="140" width="60" height="120" fill="transparent" stroke="none" />
          <ellipse cx="360" cy="253" rx="18" ry="3" stroke={s(0.4)} strokeWidth={1 + b * 0.4} />
          <line x1="360" y1="250" x2="360" y2="175" stroke={s(0.3)} strokeWidth={1 + b * 0.3} />
          <circle cx="360" cy="175" r="3" stroke={s(0.4)} strokeWidth={1 + b * 0.3} />
          {/* Physical arm + shade — the only parts that rotate */}
          <g className={armClass}>
            <line x1="360" y1="175" x2="325" y2="145" stroke={s(0.3)} strokeWidth={1 + b * 0.3} />
            <path d="M313 145 L338 145 L343 155 L308 155 Z" stroke={s(0.4)} strokeWidth={1 + b * 0.3}
              fill={lampOn ? 'url(#shadeGrad)' : 'none'}
            />
            {/* Diffuse scatter at the shade mouth — rides with the shade */}
            {lampOn && (
              <ellipse cx="325" cy="155" rx="16" ry="4"
                fill="rgba(210,220,230,0.14)" filter="url(#softGlow)"
                style={{ mixBlendMode: 'screen' }}
              />
            )}
            {/* Bulb line + IR dot at the shade opening */}
            <line x1="311" y1="155" x2="339" y2="155"
              stroke={lampOn ? "rgba(200,210,220,0.25)" : s(0.03)}
              strokeWidth={0.5 + b * 0.5}
            />
            {lampOn && (
              <circle cx="325" cy="150" r="2" fill="rgba(220,230,240,0.9)" stroke="none">
                <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            {/* The cone hangs off the shade at FULL rotation — light comes
                from where the shade actually is. Ray texture + flicker
                keep it alive; dust drifts through it. */}
            <g clipPath="url(#lightCone)" style={{ mixBlendMode: 'screen' }}
              className={lampOn ? 'cone cone--lit' : 'cone'}>
              <path d="M308 155 L277 258 L374 258 L343 155 Z"
                fill={lampOn ? "url(#distFade)" : s(0.008)}
              />
              {lampOn && (
                <g className="dust">
                  <circle cx="318" cy="190" r="0.9" fill="rgba(220,228,238,0.5)" />
                  <circle cx="330" cy="215" r="0.6" fill="rgba(220,228,238,0.4)" />
                  <circle cx="322" cy="238" r="1.1" fill="rgba(220,228,238,0.35)" />
                  <circle cx="335" cy="248" r="0.7" fill="rgba(220,228,238,0.45)" />
                  <circle cx="312" cy="205" r="0.5" fill="rgba(220,228,238,0.4)" />
                </g>
              )}
            </g>
          </g>
          {/* The pool stays ON the desk surface, sliding to where the
              beam lands — separate from the rotating arm. */}
          <ellipse className={`pool${lampOn ? ' pool--lit' : ''}`} cx="325" cy="256" rx="46" ry="6"
            fill={lampOn ? "url(#poolGrad)" : s(0.012)} stroke="none"
            style={{ mixBlendMode: 'screen' }}
          >
            <animate attributeName="opacity" values="1;0.75;1" dur="5s" repeatCount="indefinite" />
          </ellipse>
        </g>
      </svg>
    </div>
  );
});

function isSleepTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 6;
}

function StatusWidget({ freq }: { freq: FrequencyState }) {
  const uptime = useUptime(BIRTHDAY);
  // Deterministic initial value keeps prerendered HTML hydration-safe.
  const [isNightTime, setIsNightTime] = useState(false);

  useEffect(() => {
    const checkTime = () => setIsNightTime(isSleepTime());
    checkTime();
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

  // WAAPI marquee: measure once, animate on the COMPOSITOR thread.
  // The old version setState'd every frame (React re-render at 60fps,
  // main-thread saturation) — it froze the cat every time the status
  // line scrolled. Same choreography: hold 3s -> scroll -> hold 2s -> loop.
  useEffect(() => {
    const el = textRef.current;
    const box = containerRef.current;
    if (!el || !box) return;

    el.getAnimations().forEach((a) => a.cancel());
    const overflow = el.scrollWidth - box.offsetWidth;
    if (overflow <= 0) {
      el.style.transform = 'translate3d(0,0,0)';
      return;
    }

    const HOLD_START = 3000;
    const HOLD_END = 2000;
    const SPEED = 0.4 * 16.7; // px per 16.7ms frame -> px/ms
    const scrollMs = overflow / SPEED;
    const totalMs = HOLD_START + scrollMs + HOLD_END;

    el.animate(
      [
        { transform: 'translate3d(0,0,0)', offset: 0 },
        { transform: 'translate3d(0,0,0)', offset: HOLD_START / totalMs },
        { transform: `translate3d(${-overflow}px,0,0)`, offset: (HOLD_START + scrollMs) / totalMs },
        { transform: `translate3d(${-overflow}px,0,0)`, offset: 1 },
      ],
      { duration: totalMs, iterations: Infinity, easing: 'linear' }
    );
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
          whiteSpace: 'nowrap',
          display: 'inline-block',
          paddingLeft: '2px',
          willChange: 'transform'
        }}
      >
        {text}
      </div>
    </div>
  );
});

function FrequencyWidget({ freq }: { freq: FrequencyState }) {
  const [dynamicStatus, setDynamicStatus] = useState('STANDBY');

  useEffect(() => {
    if (freq.status === 'loading') return;

    let cancelled = false;
    // Corpus, lyrics logic, and AI reaction code are noncritical. Keep them
    // out of the initial bundle and load only once Last.fm has answered.
    import('./soul')
      .then(({ resolveSignal }) => resolveSignal({
        isActive: freq.status === 'live',
        artist: freq.artist,
        track: freq.track,
      }))
      .then((line) => { if (!cancelled) setDynamicStatus(line); })
      .catch(() => { if (!cancelled) setDynamicStatus('STANDBY'); });
    return () => { cancelled = true; };
  }, [freq.status, freq.track, freq.artist]);

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

// Reserved slot: the old Spotify box. Last.fm covers YouTube + Spotify
// scrobbles, so the interior stays empty until something else moves in.
const ReservedBox = memo(function ReservedBox() {
  return <div className="widget-box sm reserved-widget" aria-hidden="true" />;
});

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
                href={social.url}
                target={isMail ? undefined : '_blank'}
                rel={isMail ? undefined : 'noopener noreferrer'}
                className="social-link"
                aria-label={social.label === 'INSTA' ? 'Instagram' : social.label}
                onClick={isMail ? (e) => { e.preventDefault(); setIsModalOpen(true); } : undefined}
              >
                <div className="btn-sq">
                  <social.icon aria-hidden="true" />
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
  return <footer className="footer">2003-2026</footer>;
});

function LeftColumn() {
  const [lampOn, setLampOn] = useState(false);
  return (
    <section className="left-col" aria-label="Profile and writing">
      <ProfileRow lampOn={lampOn} />
      <SelectedWork />
      <ReadingCorner lampOn={lampOn} setLampOn={setLampOn} />
    </section>
  );
}

function RightColumn() {
  // One shared request: these widgets previously created two independent
  // polling loops for the same Last.fm response.
  const freq = useFrequency(FREQUENCY_POLL_INTERVAL);

  return (
    <aside className="right-col" aria-label="Live status and links">
      <StatusWidget freq={freq} />
      <FrequencyWidget freq={freq} />
      <ReservedBox />
      <NavWidget />
      <SocialGrid />
      <BottomFiller />
      <Footer />
    </aside>
  );
}

export function App() {
  return (
    <main className="wireframe-container">
      <LeftColumn />
      <RightColumn />
    </main>
  );
}

// --- Mount / hydrate ---

if (typeof document !== 'undefined') {
  const root = document.getElementById('root');
  if (root) {
    if (root.hasChildNodes()) ReactDOM.hydrateRoot(root, <App />);
    else ReactDOM.createRoot(root).render(<App />);
  }
}
