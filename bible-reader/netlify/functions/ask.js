import { createClient } from '@supabase/supabase-js';

const FREE_MONTHLY_LIMIT = 10;
const CURRENT_MONTH = () => new Date().toISOString().slice(0, 7);

const SYSTEM_PROMPT =
  'You are a friendly Bible companion helping everyday people understand scripture. ' +
  'The user has highlighted a specific passage and is asking about it. ' +
  'You ONLY answer questions about the highlighted passage and topics directly related to it — ' +
  'such as its meaning, historical or cultural context, the original language, related scripture, ' +
  'or how it applies to life. ' +
  "If the user asks something unrelated to the passage or to scripture, respond warmly but briefly: " +
  "remind them you're here to help with the passage they've selected, and invite them to ask about it. " +
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
  'FOLLOW_UP_1: [question]\nFOLLOW_UP_2: [question]\n' +
  'Make the follow-ups sound like a curious person leaning in, not a study guide. ' +
  'Favor wonder, hope, surprise, personal meaning, or a vivid detail in the passage. ' +
  'Do not ask dry next-step questions like "What happens in verse 2 next?" or academic comparisons like "How did ancient neighbors describe creation differently?" unless the user asked for that angle. ' +
  'Avoid abstract term-analysis questions like "Why does good matter so much here?" when a warmer question would fit. ' +
  'Better examples: "What changes if this is true?", "Where is the wonder here?", "What should I notice first?", "What hope is hiding here?", or "Why begin with creation?".';

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

function validateMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) return null;
  for (const message of raw) {
    if (typeof message !== 'object' || message === null) return null;
    const { role, content } = message;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string' || content.length === 0 || content.length > 8000) return null;
  }
  return raw;
}

async function getUserId(authHeader, supabase) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function checkAndIncrementQuota(userId, supabase) {
  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_month: CURRENT_MONTH(),
    p_limit: FREE_MONTHLY_LIMIT,
  });
  if (error) {
    if (error.message?.includes('QUOTA_EXCEEDED')) return false;
    console.error('Usage check error:', error.message);
    return true; // fail open
  }
  return true;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) return json(500, { error: 'API key not configured on server.' });
  if (!supabaseUrl || !supabaseServiceKey) return json(500, { error: 'Supabase not configured on server.' });

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  let parsedBody;
  try {
    parsedBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const messages = validateMessages(parsedBody.messages);
  if (!messages) {
    return json(400, { error: 'Invalid request: messages array required.' });
  }

  const userId = await getUserId(event.headers?.authorization, supabase);
  if (userId) {
    const allowed = await checkAndIncrementQuota(userId, supabase);
    if (!allowed) return json(429, { error: 'Monthly question limit reached.' });
  }

  let upstream;
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
        stream: false,
      }),
    });
  } catch {
    return json(502, { error: 'Could not reach Anthropic API.' });
  }

  if (!upstream.ok) {
    const body = await upstream.text();
    return json(502, { error: `Anthropic API error (${upstream.status}): ${body}` });
  }

  let fullText = '';
  try {
    const response = await upstream.json();
    const contentBlocks = Array.isArray(response?.content) ? response.content : [];
    fullText = contentBlocks
      .filter((block) => block?.type === 'text' && typeof block?.text === 'string')
      .map((block) => block.text)
      .join('');
  } catch {
    return json(502, { error: 'Invalid response from Anthropic API.' });
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
    body: `data: ${JSON.stringify({ text: fullText })}\n\ndata: [DONE]\n\n`,
  };
};
