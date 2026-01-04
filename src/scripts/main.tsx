import { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { FaInstagram, FaLinkedin, FaGithub } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { getNowPlaying, SpotifyCurrentlyPlaying } from './spotify';

// --- Constants ---

const BIRTHDAY = new Date('2003-09-29T00:00:00');
const SPOTIFY_POLL_INTERVAL = 10000;

interface SocialLink {
  label: string;
  url: string;
  icon: React.ComponentType;
}

const SOCIAL_LINKS: SocialLink[] = [
  { label: 'INSTA', url: 'https://instagram.com/selouali01', icon: FaInstagram },
  { label: 'X', url: 'https://x.com/selouali01', icon: FaXTwitter },
  { label: 'LINKEDIN', url: 'https://linkedin.com/in/selouali', icon: FaLinkedin },
  { label: 'GITHUB', url: 'https://github.com/saladin0x1', icon: FaGithub },
];

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
  const [state, setState] = useState<SpotifyState>({
    isPlaying: false,
    title: '',
    artist: '',
    albumArt: '',
    status: 'offline',
  });

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | undefined;

    const fetchStatus = async () => {
      const response = await getNowPlaying();

      if (!isMounted) return;

      if (response.status === 401 || response.status >= 500) {
        setState(prev => ({ ...prev, status: 'error', isPlaying: false }));
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
        return;
      }

      if (!response.data || !response.data.is_playing || !response.data.item) {
        setState(prev => ({ ...prev, status: 'offline', isPlaying: false }));
        return;
      }

      const { item } = response.data;
      setState({
        isPlaying: true,
        title: item.name,
        artist: item.artists.map(a => a.name).join(', '),
        albumArt: item.album.images[0]?.url || '',
        status: 'playing',
      });
    };

    fetchStatus();
    intervalId = window.setInterval(fetchStatus, pollInterval);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollInterval]);

  return state;
}

// --- Components ---

function Avatar() {
  return (
    <div className="avatar-sq">
      <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#050505" />
        <circle cx="50" cy="40" r="20" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" strokeWidth="0.2" />
        <path d="M20 90C20 70 30 60 50 60C70 60 80 70 80 90" fill="#0a0a0a" stroke="rgba(255,255,255,0.3)" strokeWidth="0.2" />
      </svg>
    </div>
  );
}

function Bio() {
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
    </div>
  );
}

function ProfileRow() {
  return (
    <div className="profile-row">
      <Avatar />
      <Bio />
    </div>
  );
}

interface DashContainerProps {
  lines: number;
  className?: string;
}

function DashContainer({ lines, className = '' }: DashContainerProps) {
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
}

function StatusWidget() {
  const uptime = useUptime(BIRTHDAY);

  return (
    <div className="widget-box sm status-widget">
      <div className="status-row">
        STATUS: <span className="status-online">ONLINE</span>
      </div>
      <div className="status-row">
        UPTIME: <span className="uptime-value">{uptime}</span>
      </div>
    </div>
  );
}

function SpotifyWidget() {
  const spotify = useSpotify(SPOTIFY_POLL_INTERVAL);

  if (spotify.status === 'error') {
    return (
      <div className="widget-box sm spotify-widget">
        <div className="spotify-container">
          <div className="spotify-art-placeholder">
            <div className="spotify-disc" />
          </div>
          <div className="spotify-info">
            <div className="spotify-label spotify-label--error">SPOTIFY</div>
            <div className="spotify-status spotify-status--error">UNDER MAINTENANCE</div>
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
            <div className="spotify-status">OFFLINE</div>
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
          <div className="spotify-label">LISTENING...</div>
          <div className="spotify-title">{spotify.title}</div>
          <div className="spotify-artist">{spotify.artist}</div>
        </div>
      </div>
    </div>
  );
}

function NavWidget() {
  return (
    <div className="widget-box md nav-widget">
      <div className="nav-item">_ _ _ _ _ _</div>
      <div className="nav-item">_ _ _ _ _ _</div>
      <div className="nav-item">_ _ _ _ _ _</div>
      <div className="nav-item">_ _ _ _ _ _</div>
    </div>
  );
}

function SocialGrid() {
  return (
    <div className="widget-box social-widget">
      <div className="btn-grid">
        {SOCIAL_LINKS.map((social, index) => (
          <a
            key={index}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
          >
            <div className="btn-sq">
              <social.icon />
              <span>{social.label}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function BottomFiller() {
  return <DashContainer lines={18} className="bottom-filler" />;
}

function Footer() {
  return <div className="footer">2003-2026</div>;
}

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
