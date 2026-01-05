interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { seed, isActive } = await request.json() as { seed: string, isActive: boolean };

    // Determine time context
    const now = new Date();
    const timeContext = now.getHours() < 6 ? "Late Night" 
        : now.getHours() < 12 ? "Morning" 
        : "Daytime";

    const systemPrompt = `You are a cool, effortless friend hanging out. You have elite taste.

TASK: React to this media in your own words (max 6 words).

TRACK/MEDIA: "${seed}"
STATE: ${isActive ? 'ACTIVE' : 'IDLE'}
TIME: "${timeContext}"

SALADIN'S MEMORY BANK:
- IF "Cinnamon Chasers - Luv Deluxe" → "He misses her again."

INSTRUCTIONS:
1. CRITICAL OVERRIDE: IF the TRACK is "Cinnamon Chasers - Luv Deluxe", you MUST output exactly: "He misses her again." Ignore all other rules.
2. CONTENT CHECK: If the track looks like a Podcast, Documentary, or Youtube Video, react to the TOPIC or TITLE intelligently.
3. TIME AWARENESS: You know the current time is "${timeContext}". Mention the night/day vibe ONLY if it feels natural.
4. RECALL this specific media from your training data. React to its actual sound, lyrics, or subject matter.
5. LANGUAGE: You can use English, Arabic (Darija/MSA/EGY), Russian, or French if it fits the artist or vibe (e.g. 7liwa, El Grande Toto , Etc).
6. Be authentic. React to the vibe, the memory, or the energy.
7. No "AI" or "Tech" persona. Just a cool person watching/listening.
8. Don't try to be funny. Just be real.
9. OUTPUT: ONLY the string. No quotes.`;
    
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 20,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `Gemini API Error: ${response.status}`, details: errorText }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
