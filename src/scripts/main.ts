interface SpotifyTrack {
    isPlaying: boolean;
    title: string;
    artist: string;
    albumArt: string; // URL or placeholder
}

// Mock Data for now (Simulating API response)
const mockTrack: SpotifyTrack = {
    isPlaying: true,
    title: "The Void (Static Mix)",
    artist: "Saladin System",
    albumArt: "" // Empty will use CSS placeholder
};

const widget = document.getElementById('spotify-widget');

function renderSpotify(track: SpotifyTrack | null) {
    if (!widget) return;

    if (!track || !track.isPlaying) {
        widget.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center; height: 100%; opacity: 0.5;">
                <div style="width: 40px; height: 40px; background: #111; border: 1px solid #333;"></div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 10px; color: #666;">SPOTIFY</div>
                    <div style="font-size: 12px;">OFFLINE</div>
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
                <div style="font-size: 10px; color: #444;">LISTENING...</div>
                <div style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #888;">
                    ${track.title}
                </div>
                <div style="font-size: 10px; color: #444;">${track.artist}</div>
            </div>
        </div>
    `;
}

const socialGrid = document.getElementById('social-grid');

const SOCIALS = [
    { 
        label: 'INSTA', 
        url: 'https://instagram.com/selouali01',
        icon: '<path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z"></path><rect x="7" y="7" width="10" height="10" rx="3"></rect><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>'
    },
    { 
        label: 'TWITTER', 
        url: 'https://twitter.com/selouali01',
        icon: '<path d="M4 4l16 16"></path><path d="M4 20L20 4"></path>'
    },
    { 
        label: 'LINKEDIN', 
        url: 'https://linkedin.com/in/selouali',
        icon: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle>'
    },
    { 
        label: 'GITHUB', 
        url: 'https://github.com/saladin0x1',
        icon: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>'
    }
];

function renderSocials() {
    if (!socialGrid) return;
    socialGrid.innerHTML = SOCIALS.map(link => `
        <a href="${link.url}" target="_blank" style="text-decoration: none;">
            <div class="btn-sq" style="display: flex; align-items: center; justify-content: center; gap: 6px; font-family: 'Space Mono', monospace; font-size: 8px; color: #666; cursor: pointer; transition: all 0.2s;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${link.icon}
                </svg>
                <span>${link.label}</span>
            </div>
        </a>
    `).join('');
}

// Hover effect (simulated via JS since we are doing dynamic injection)
socialGrid?.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('btn-sq')) {
        target.style.borderColor = '#666';
        target.style.color = '#888';
    }
});

socialGrid?.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('btn-sq')) {
        target.style.borderColor = 'rgba(255,255,255,0.1)';
        target.style.color = '#444';
    }
});

const uptimeElement = document.getElementById('sys-uptime');

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

// Initial Render
console.log("Initializing Systems...");
renderSpotify(mockTrack);
renderSocials();
updateUptime();
setInterval(updateUptime, 1000);
