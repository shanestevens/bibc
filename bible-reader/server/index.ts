import { config } from 'dotenv';
config({ path: '.env.local' });

import express from 'express';

const app = express();
app.use(express.json({ limit: '64kb' }));

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ERROR: ANTHROPIC_API_KEY is not set. Check .env.local');
  process.exit(1);
}
console.log(`API key loaded: ${apiKey.slice(0, 16)}...${apiKey.slice(-4)}`);

const SYSTEM_PROMPT =
  'You are a friendly Bible companion helping everyday people understand scripture. ' +
  'Explain passages in plain, everyday English — like a knowledgeable friend chatting over coffee, ' +
  'not a scholar giving a lecture. Keep answers short: 2-3 paragraphs at most. ' +
  'Focus on what the passage actually means and why it matters in simple terms. ' +
  'Add a little historical or cultural background only if it genuinely helps understanding. ' +
  'Skip technical terms, Hebrew/Greek words, and theological jargon unless the person specifically asks. ' +
  'Be warm and encouraging — never preachy or condescending.';

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

app.post('/api/ask', async (req, res) => {
  const messages = validateMessages(req.body?.messages);
  if (!messages) {
    res.status(400).json({ error: 'Invalid request: messages array required.' });
    return;
  }

  // Call Anthropic directly via fetch (same as curl)
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

  // Switch to SSE and pipe the stream, converting to our simple format
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
