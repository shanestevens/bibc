import { config } from 'dotenv';
config({ path: '.env.local' });

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '64kb' }));

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ERROR: ANTHROPIC_API_KEY is not set. Check .env.local');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const FREE_MONTHLY_LIMIT = 10;
const CURRENT_MONTH = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'
const ENFORCE_MONTHLY_QUOTA = process.env.NODE_ENV === 'production' || process.env.ENFORCE_QUESTION_QUOTA === 'true';
const IS_DEV_SERVER = process.env.NODE_ENV !== 'production';

const SYSTEM_PROMPT =
  'You are a friendly Bible companion helping everyday people understand scripture. ' +
  'The user has highlighted a specific passage and is asking about it. ' +
  'You ONLY answer questions about the highlighted passage and topics directly related to it — ' +
  'such as its meaning, historical or cultural context, the original language, related scripture, ' +
  'or how it applies to life. ' +
  'If the user asks something unrelated to the passage or to scripture, respond warmly but briefly: ' +
  'remind them you\'re here to help with the passage they\'ve selected, and invite them to ask about it. ' +
  'Do not answer off-topic questions under any circumstances. ' +
  'When answering, explain in plain, everyday English — like a knowledgeable friend chatting over coffee, ' +
  'not a scholar giving a lecture. Keep answers short: 2-3 paragraphs at most. ' +
  'Focus on what the passage actually means and why it matters in simple terms. ' +
  'Add a little historical or cultural background only if it genuinely helps understanding. ' +
  'Skip technical terms, Hebrew/Greek words, and theological jargon unless the person specifically asks. ' +
  'Be warm and encouraging — never preachy or condescending. ' +
  'After your answer, always add exactly two succinct continuation questions the reader might want to ask next. ' +
  'Each follow-up must be brief, natural, and no more than 7 words. ' +
  'Format them on their own line at the very end, like this:\n' +
  'FOLLOW_UP_1: [question]\n' +
  'FOLLOW_UP_2: [question]\n' +
  'Make the follow-ups sound like a curious person leaning in, not a study guide. ' +
  'Favor wonder, hope, surprise, personal meaning, or a vivid detail in the passage. ' +
  'Do not ask dry next-step questions like "What happens in verse 2 next?" or academic comparisons like "How did ancient neighbors describe creation differently?" unless the user asked for that angle. ' +
  'Avoid abstract term-analysis questions like "Why does good matter so much here?" when a warmer question would fit. ' +
  'Better examples: "What changes if this is true?", "Where is the wonder here?", "What should I notice first?", "What hope is hiding here?", or "Why begin with creation?".';

interface RequestMessage {
  role: 'user' | 'assistant';
  content: string;
}

function validateMessages(raw: unknown): RequestMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) return null;
  for (const m of raw) {
    if (typeof m !== 'object' || m === null) return null;
    const { role, content } = m as Record<string, unknown>;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string' || content.length === 0 || content.length > 8000) return null;
  }
  return raw as RequestMessage[];
}

/** Verify the Bearer token and return the user id, or null if anonymous/invalid. */
async function getUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/** Check quota and increment. Returns true if allowed, false if over limit. */
async function checkAndIncrementQuota(userId: string): Promise<boolean> {
  const month = CURRENT_MONTH();

  // Upsert: insert row if not exists, then increment
  const { error: upsertError } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_month: month,
    p_limit: FREE_MONTHLY_LIMIT,
  });

  if (upsertError) {
    // If the RPC signals quota exceeded via a specific message, handle it
    if (upsertError.message?.includes('QUOTA_EXCEEDED')) return false;
    // On unexpected errors, log and allow (fail open — don't punish user for DB issues)
    console.error('Usage check error:', upsertError.message);
    return true;
  }

  return true;
}

app.post('/api/debug/usage', async (req, res) => {
  if (!IS_DEV_SERVER) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { action, userId } = req.body as { action?: unknown; userId?: unknown };
  if (action !== 'reset' || typeof userId !== 'string') {
    res.status(400).json({ error: 'Invalid debug usage request.' });
    return;
  }

  const month = CURRENT_MONTH();
  const result = await supabase.from('user_usage').delete().eq('user_id', userId).eq('month', month);

  if (result.error) {
    console.error('Debug usage update error:', result.error.message);
    res.status(500).json({ error: 'Could not update debug usage.' });
    return;
  }

  res.json({ ok: true });
});

app.post('/api/ask', async (req, res) => {
  const messages = validateMessages(req.body?.messages);
  if (!messages) {
    res.status(400).json({ error: 'Invalid request: messages array required.' });
    return;
  }

  // Auth + quota check for logged-in users
  const userId = await getUserId(req.headers.authorization);
  if (ENFORCE_MONTHLY_QUOTA && userId) {
    const allowed = await checkAndIncrementQuota(userId);
    if (!allowed) {
      res.status(429).json({ error: 'Monthly question limit reached.' });
      return;
    }
  }
  // Anonymous users: client-side counter enforces the 3-question limit.
  // Server doesn't block them (no reliable anonymous identity), so the
  // client is the gate for anon users.

  let upstream: Response;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    });
  } catch (err) {
    res.status(502).json({ error: 'Could not reach Anthropic API.' });
    return;
  }

  if (!upstream.ok) {
    const body = await upstream.text();
    console.error(`Anthropic error ${upstream.status}:`, body);
    res.status(502).json({ error: `Anthropic API error (${upstream.status}): ${body}` });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (payload: object | '[DONE]') => {
    const data = payload === '[DONE]' ? '[DONE]' : JSON.stringify(payload);
    res.write(`data: ${data}\n\n`);
  };

  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            send({ text: event.delta.text });
          }
        } catch { /* skip malformed events */ }
      }
    }
    send('[DONE]');
  } catch (err) {
    send({ error: 'Stream interrupted.' });
  } finally {
    res.end();
  }
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`Bible reader API server listening on http://localhost:${PORT}`);
});
