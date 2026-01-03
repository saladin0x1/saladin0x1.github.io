import React from 'react';
import ReactDOM from 'react-dom/client';
import { FaInstagram, FaLinkedin, FaGithub } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { getNowPlaying } from './spotify';

// --- Spotify Widget Logic (Vanilla JS) ---

interface SpotifyTrack {
    isPlaying: boolean;
    title: string;
    artist: string;
    albumArt: string; // URL or placeholder
}

const widget = document.getElementById('spotify-widget');

function renderSpotify(track: SpotifyTrack | null, status?: number) {
    if (!widget) return;

    if (!track || !track.isPlaying) {
        const isError = status && (status === 401 || status > 401);
        const statusText = isError ? 'UNDER MAINTENANCE' : 'OFFLINE';
        const labelColor = isError ? '#ffffff' : '#666';
        const subColor = isError ? '#bbbbbb' : '#444';

        widget.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center; height: 100%;">
                <div style="width: 40px; height: 40px; background: #0a0a0a; border: 1px solid #333; display: flex; align-items: center; justify-content: center;">
                    <div style="width: 12px; height: 12px; border: 1px solid #444; border-radius: 50%; opacity: 0.5;"></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 11px; color: ${labelColor}; letter-spacing: 1px; font-weight: bold;">SPOTIFY</div>
                    <div style="font-size: 10px; color: ${subColor}; opacity: 0.8;">${statusText}</div>
                </div>
            </div>
        `;
        return;
    }

    widget.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; height: 100%;">
            <div style="width: 40px; height: 40px; background: #0a0a0a; border: 1px solid #222; display: flex; align-items: center; justify-content: center;">
                ${track.albumArt ? `<img src="${track.albumArt}" style="width:100%; height:100%; opacity:0.8;">` : '<div style="width:10px; height:10px; background:#333; border-radius:50%;"></div>'}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; overflow: hidden;">
                <div style="font-size: 11px; color: #444;">LISTENING...</div>
                <div style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #888;">
                    ${track.title}
                </div>
                <div style="font-size: 11px; color: #444;">${track.artist}</div>
            </div>
        </div>
    `;
}

// --- React Social Icons ---

const SOCIAL_DATA = [
    { label: 'INSTA', url: 'https://instagram.com/selouali01', icon: FaInstagram },
    { label: 'X', url: 'https://x.com/selouali01', icon: FaXTwitter },
    { label: 'LINKEDIN', url: 'https://linkedin.com/in/selouali', icon: FaLinkedin },
    { label: 'GITHUB', url: 'https://github.com/saladin0x1', icon: FaGithub }
];

function SocialsComponent() {
    return (
        <div className="btn-grid">
            {SOCIAL_DATA.map((social, index) => (
                <a 
                    key={index} 
                    href={social.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                >
                    <div className="btn-sq">
                        <social.icon />
                        <span>{social.label}</span>
                    </div>
                </a>
            ))}
        </div>
    );
}
const socialGrid = document.getElementById('social-grid');
if (socialGrid) {
    socialGrid.innerHTML = '';
    socialGrid.style.display = 'block'; 
    const root = ReactDOM.createRoot(socialGrid);
    root.render(<SocialsComponent />);
}

// --- Uptime Logic (Vanilla JS) ---

const uptimeElement = document.getElementById('saladin-uptime');

function updateUptime() {
    if (!uptimeElement) return;

    const bday = new Date('2003-09-29T00:00:00');
    const now = new Date();
    const diff = now.getTime() - bday.getTime();

    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    uptimeElement.textContent = `${years}Y ${days}D ${hours}H ${minutes}M ${seconds}S`;
}

// --- Initialization ---

console.log("Initializing Systems...");

let spotifyInterval: number | undefined;

async function fetchSpotifyStatus() {
    try {
        const response = await getNowPlaying();

        if (response.status === 401) {
            renderSpotify(null, 401);
            if (spotifyInterval) {
                console.warn('Spotify Auth failed (401). Stopping polling.');
                clearInterval(spotifyInterval);
            }
            return;
        }

        if (response.status === 204) {
            renderSpotify(null, 204); // No content = Offline
            return;
        }

        if (response.status >= 400) {
            renderSpotify(null, response.status); // Error code = Maintenance
            return;
        }

        const song = await response.json();
        
        if (song.is_playing) {
            const title = song.item.name;
            const artist = song.item.artists.map((_artist: any) => _artist.name).join(', ');
            const albumArt = song.item.album.images[0].url;

            renderSpotify({
                isPlaying: true,
                title,
                artist,
                albumArt
            });
        } else {
            renderSpotify(null, 200); // Success but not playing = Offline
        }
    } catch (e) {
        console.warn('Spotify API Error:', e);
        renderSpotify(null, 500); // Catch-all for network errors
    }
}

fetchSpotifyStatus(); 
updateUptime();
setInterval(updateUptime, 1000);
spotifyInterval = window.setInterval(fetchSpotifyStatus, 10000);