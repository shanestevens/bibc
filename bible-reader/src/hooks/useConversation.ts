import { useState, useCallback, useRef } from 'react';
import { streamAsk, buildInitialUserMessage, type ApiMessage } from '../lib/bible-api';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useConversation() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the committed message list so callbacks always see current history
  const messagesRef = useRef<ConversationMessage[]>([]);
  messagesRef.current = messages;

  const reset = useCallback(() => {
    setMessages([]);
    setStreaming(false);
    setError(null);
    messagesRef.current = [];
  }, []);

  /**
   * Send a question to Claude.
   * On the very first call pass selectedText + reference to wrap with context;
   * subsequent follow-ups just send the plain question.
   */
  const ask = useCallback(
    (question: string, selectedText?: string, reference?: string) => {
      if (!question.trim()) return;
      setError(null);

      const userContent =
        selectedText && reference
          ? buildInitialUserMessage(selectedText, reference, question)
          : question;

      // Build the API history from current messages + new user message
      const history: ApiMessage[] = [
        ...messagesRef.current.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userContent },
      ];

      // Append user message + blank assistant placeholder
      const userMsg: ConversationMessage = { role: 'user', content: userContent };
      const placeholder: ConversationMessage = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, userMsg, placeholder]);
      setStreaming(true);

      let accumulated = '';

      streamAsk(
        history,
        // onChunk — update the last (assistant) message incrementally
        (chunk) => {
          accumulated += chunk;
          const text = accumulated;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: text };
            return updated;
          });
        },
        // onDone — finalise
        (fullText) => {
          setStreaming(false);
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: fullText };
            return updated;
          });
        },
        // onError — remove placeholder and show error
        (err) => {
          setStreaming(false);
          setMessages(prev => prev.slice(0, -1)); // drop placeholder
          setError(err);
        },
      );
    },
    [],
  );

  return { messages, streaming, error, ask, reset };
}
