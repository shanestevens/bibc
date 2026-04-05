export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Stream a response from the /api/ask proxy.
 * The server owns the API key — no key in client code.
 *
 * Server SSE format:
 *   data: {"text":"..."}   — text chunk
 *   data: {"error":"..."}  — stream-level error
 *   data: [DONE]           — stream complete
 */
export async function streamAsk(
  messages: ApiMessage[],
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch {
    onError('Could not reach the server. Is it running?');
    return;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: `Server error ${response.status}` }));
    onError((body as { error?: string }).error ?? `Server error ${response.status}`);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

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
          const event = JSON.parse(data) as { text?: string; error?: string };
          if (event.error) { onError(event.error); return; }
          if (event.text) {
            fullText += event.text;
            onChunk(event.text);
          }
        } catch { /* ignore malformed lines */ }
      }
    }
  } catch {
    onError('Connection interrupted. Please try again.');
    return;
  }

  onDone(fullText);
}

/** Format the initial user message sent to Claude (via the server) */
export function buildInitialUserMessage(
  selectedText: string,
  reference: string,
  question: string,
): string {
  return `I'm reading ${reference}.\n\nSelected passage:\n"${selectedText}"\n\n${question}`;
}
