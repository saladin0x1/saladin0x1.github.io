import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config';

// 1. Load Environment Variables from .env
const envPath = path.resolve(process.cwd(), '.env');
const env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) env[key.trim()] = val.trim();
    });
}

const LASTFM_USER = env.VITE_LASTFM_USER || env.LASTFM_USER;
const LASTFM_KEY = env.VITE_LASTFM_API_KEY || env.LASTFM_API_KEY;
const GEMINI_KEY = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

// Confirmed working model ID for Gemini 3 Pro
const MODEL = 'gemini-3-pro-preview';

if (!LASTFM_USER || !LASTFM_KEY || !GEMINI_KEY) {
    console.error('[ERROR] Missing API keys in .env. Need LASTFM_USER, LASTFM_API_KEY, GEMINI_API_KEY.');
    process.exit(1);
}

// 2. Fetch Top Tracks from Last.fm
async function getTopTracks(limit = 50) {
    console.log(`[STATUS] Fetching top ${limit} tracks for user: ${LASTFM_USER}...`);
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${LASTFM_USER}&api_key=${LASTFM_KEY}&format=json&limit=${limit}&period=12month`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.toptracks || !data.toptracks.track) {
            console.error('[ERROR] Invalid Last.fm response structure.');
            process.exit(1);
        }
        
        return data.toptracks.track.map((t: any) => ({
            artist: t.artist?.name || 'Unknown',
            title: t.name || 'Unknown'
        }));
    } catch (e) {
        console.error('[ERROR] Last.fm API Connection Failed.');
        process.exit(1);
    }
}

// 3. Extract Catchy Lyric via Gemini
async function getCatchyLine(artist: string, title: string) {
    const prompt = `
TASK: Search for the lyrics of this song and extract the single most CATCHY, OBSESSIVE, or ICONIC short lyric/hook.
SONG: "${title}" by ${artist}
STYLE: Catchy, cool, pop-culture fragment. Keep the core lyric original but ensure it fits a minimalist aesthetic.
EXAMPLE: For "TKO" by JT -> "Kill me with the coo-coochie-coo"
INSTRUCTIONS:
- Use Google Search to verify the exact lyric.
- Output ONLY the lyric text.
- No quotes.
- If you don't know the song, output "SKIP".
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ google_search: {} }]
            })
        });
        
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
            console.error(`[HTTP ${res.status}] ${JSON.stringify(err, null, 2)}`);
            return 'SKIP';
        }

        const data = await res.json();
        
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            
            // Check for grounding (Web Search activity)
            if (candidate.grounding_metadata) {
                process.stdout.write(`(grounded) `);
            }

            const text = candidate.content?.parts?.[0]?.text?.trim();
            return text || 'SKIP';
        }

        return 'SKIP';
    } catch (e) {
        console.error(`[EXCEPTION] ${e}`);
        return 'SKIP';
    }
}

// 4. Main Loop
async function main() {
    console.clear();
    console.log('GEMINI AUTO-MINER (Last.fm -> Dataset)');
    console.log(`Target: ${CONFIG.OUTPUT_FILE}`);
    console.log(`Model: ${MODEL}\n`);

    const tracks = await getTopTracks(30); 
    console.log(`[SUCCESS] Found ${tracks.length} tracks. Starting mining...\n`);

    let count = 0;
    
    for (const t of tracks) {
        const artist = t.artist;
        const title = t.title;

        // Filter out non-music scrobbles
        const isVideo = artist.toLowerCase().includes('tube') || title.toLowerCase().includes('video');
        if (isVideo) {
            console.log(`Processing: ${artist} - ${title} ... [SKIPPED] Non-music content.`);
            continue;
        }

        process.stdout.write(`Processing: ${artist} - ${title} ... `); 
        
        // 5s delay to avoid Rate Limits (Free tier Pro model is strict)
        await new Promise(r => setTimeout(r, 5000));

        const lyric = await getCatchyLine(artist, title);
        
        if (lyric && lyric !== 'SKIP' && !lyric.includes('I cannot')) {
            const example = {
                messages: [
                    { role: 'system', content: CONFIG.SYSTEM_PROMPT },
                    { role: 'user', content: `Track: ${artist} - ${title}` },
                    { role: 'model', content: lyric }
                ]
            };
            
            fs.appendFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(example) + '\n');
            console.log(`"${lyric}"`);
            count++;
        } else {
            console.log(`[FAILED/SKIPPED]`);
        }
    }

    console.log(`\n[DONE] Generated ${count} training examples.`);
    console.log(`File: ${CONFIG.OUTPUT_FILE}`);
}

main();