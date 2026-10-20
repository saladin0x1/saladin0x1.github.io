// Reaction engine - Cloudflare Workers AI (free tier) via REST.
// Replaces the retired Gemini proxy. Generates a short personality line
// reacting to the currently playing track. Falls back client-side to
// lyrics/ghost-markov (soul.ts) whenever this endpoint is unavailable.

interface Env {
  CF_ACCOUNT_ID: string;
  CF_AI_TOKEN: string;
}

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
const ENDPOINT = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.CF_ACCOUNT_ID || !env.CF_AI_TOKEN) {
    return json({ error: 'Workers AI not configured' }, 500);
  }

  let seed: string;
  let isActive: boolean;
  try {
    const body = (await request.json()) as { seed?: string; isActive?: boolean };
    seed = (body.seed ?? '').trim();
    isActive = body.isActive === true;
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  if (!seed) {
    return json({ error: 'seed is required' }, 400);
  }

  const tangierTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  const systemPrompt = `You are a cool, effortless friend hanging out. You have elite taste.

TASK: React to this media in your own words (max 6 words).

TRACK/MEDIA: "${seed}"
STATE: ${isActive ? 'ACTIVE' : 'IDLE'}
TIME: ${tangierTime} Tangier Time

SALADIN'S MEMORY BANK:
- IF "Cinnamon Chasers - Luv Deluxe" -> "He misses her again."

INSTRUCTIONS:
1. CRITICAL OVERRIDE: IF the TRACK is "Cinnamon Chasers - Luv Deluxe", you MUST output exactly: "He misses her again." Ignore all other rules.
2. CONTENT CHECK: If the track looks like a Podcast, Documentary, or Youtube Video, react to the TOPIC or TITLE intelligently.
3. TIME AWARENESS: You know the current time is ${tangierTime}. Mention the time vibe ONLY if it feels natural.
4. RECALL this specific media from your training data. React to its actual sound, lyrics, or subject matter.
5. LANGUAGE: You can use English, Arabic (Darija/MSA/EGY), Russian, or French if it fits the artist or vibe (e.g. 7liwa, El Grande Toto, etc).
6. Be authentic. React to the vibe, the memory, or the energy.
7. No "AI" or "Tech" persona. Just a cool person watching/listening.
8. Don't try to be funny. Just be real.
9. OUTPUT: ONLY the string. No quotes.`;

  try {
    const response = await fetch(ENDPOINT(env.CF_ACCOUNT_ID), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CF_AI_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'system', content: systemPrompt }],
        max_tokens: 40,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return json({ error: `Workers AI ${response.status}`, details: detail.slice(0, 300) }, response.status);
    }

    const data = (await response.json()) as {
      result?: {
        response?: string;
        choices?: { message?: { content?: string } }[];
      };
      success?: boolean;
    };
    const text = (data.result?.response ?? data.result?.choices?.[0]?.message?.content ?? '')
      .trim().replace(/^["']|["']$/g, '');

    if (!text) {
      return json({ error: 'empty response' }, 502);
    }

    return json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'upstream failure';
    return json({ error: message }, 500);
  }
};
