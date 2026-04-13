import { useState, useCallback, useRef } from 'react';
import { streamAsk, buildInitialUserMessage, type ApiMessage } from '../lib/bible-api';
import { ANON_LIMIT, FREE_LIMIT } from '../components/AuthModal';
import { supabase } from '../lib/supabase';

const ANON_COUNT_KEY = 'bib_anon_questions';
const ENFORCE_MONTHLY_QUOTA = import.meta.env.PROD || import.meta.env.VITE_ENFORCE_QUESTION_QUOTA === 'true';
const MAX_INTERACTIONS = 10;
const MAX_COMPLETED_MESSAGES = MAX_INTERACTIONS * 2;

export function getAnonCount(): number {
  return parseInt(localStorage.getItem(ANON_COUNT_KEY) ?? '0', 10);
}

function incrementAnonCount(): number {
  const next = getAnonCount() + 1;
  localStorage.setItem(ANON_COUNT_KEY, String(next));
  return next;
}

async function hasMonthlyQuotaRemaining(userId: string): Promise<boolean> {
  const month = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from('user_usage')
    .select('question_count')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();

  // If the client-side preflight cannot read usage, let the server decide.
  if (error) return true;
  return (data?.question_count ?? 0) < FREE_LIMIT;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

function trimConversationMessages(
  messages: ConversationMessage[],
  maxMessages = MAX_COMPLETED_MESSAGES,
): ConversationMessage[] {
  let trimmed = messages.slice(-maxMessages);

  // Keep the transcript valid for chat APIs and display by starting on a user turn.
  while (trimmed.length > 0 && trimmed[0].role === 'assistant') {
    trimmed = trimmed.slice(1);
  }

  return trimmed;
}

function buildApiHistory(
  messages: ConversationMessage[],
  passage: { selectedText: string; reference: string } | null,
): ApiMessage[] {
  const maxMessages = messages.at(-1)?.role === 'user'
    ? MAX_COMPLETED_MESSAGES - 1
    : MAX_COMPLETED_MESSAGES;
  const trimmed = trimConversationMessages(messages, maxMessages);

  return trimmed.map((message, index) => {
    if (message.role === 'user' && index === 0 && passage) {
      return {
        role: message.role,
        content: buildInitialUserMessage(passage.selectedText, passage.reference, message.content),
      };
    }

    return { role: message.role, content: message.content };
  });
}

async function saveConversation(
  userId: string,
  reference: string,
  selectedText: string,
  bookAbbrev: string,
  chapterNum: number,
  messages: ConversationMessage[],
) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, reference, selected_text: selectedText, book_abbrev: bookAbbrev, chapter_num: chapterNum })
    .select('id')
    .single();

  if (error || !data) return;

  await supabase.from('conversation_messages').insert(
    messages.map(m => ({
      conversation_id: data.id,
      role: m.role,
      content: m.content,
    }))
  );
}

export function useConversation(opts?: {
  isLoggedIn: boolean;
  userId?: string | null;
  accessToken: string | null;
  bookAbbrev?: string;
  chapterNum?: number;
  onAnonLimitReached?: () => void;
  onFreeLimitReached?: () => void;
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<ConversationMessage[]>([]);
  messagesRef.current = messages;
  const inFlightRef = useRef(false);

  // Track the passage context for saving history
  const passageRef = useRef<{ selectedText: string; reference: string } | null>(null);

  const reset = useCallback(() => {
    setMessages([]);
    setStreaming(false);
    setError(null);
    inFlightRef.current = false;
    messagesRef.current = [];
    passageRef.current = null;
  }, []);

  const ask = useCallback(
    async (question: string, selectedText?: string, reference?: string) => {
      if (!question.trim() || inFlightRef.current) return;
      inFlightRef.current = true;
      setError(null);

      // Anonymous limit check — every question counts
      if (!opts?.isLoggedIn) {
        const count = getAnonCount();
        if (count >= ANON_LIMIT) {
          inFlightRef.current = false;
          opts?.onAnonLimitReached?.();
          return;
        }
        incrementAnonCount();
      }

      // Avoid sending a request that the server will reject for monthly quota.
      if (ENFORCE_MONTHLY_QUOTA && opts?.isLoggedIn && opts.userId) {
        const hasQuota = await hasMonthlyQuotaRemaining(opts.userId);
        if (!hasQuota) {
          inFlightRef.current = false;
          opts?.onFreeLimitReached?.();
          return;
        }
      }

      // Store passage context on first question
      if (selectedText && reference) {
        passageRef.current = { selectedText, reference };
      }

      const previousMessages = messagesRef.current;
      const userMsg: ConversationMessage = { role: 'user', content: question.trim() };
      const history = buildApiHistory([...previousMessages, userMsg], passageRef.current);
      const placeholder: ConversationMessage = { role: 'assistant', content: '' };
      const pendingMessages = trimConversationMessages([...previousMessages, userMsg, placeholder]);
      setMessages(pendingMessages);
      messagesRef.current = pendingMessages;
      setStreaming(true);

      let accumulated = '';

      streamAsk(
        history,
        opts?.accessToken ?? null,
        (chunk) => {
          accumulated += chunk;
          const text = accumulated;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: text };
            messagesRef.current = updated;
            return updated;
          });
        },
        (fullText) => {
          setStreaming(false);
          inFlightRef.current = false;
          const finalMessages = trimConversationMessages([
            ...messagesRef.current.slice(0, -1),
            { role: 'assistant', content: fullText },
          ]);
          setMessages(finalMessages);
          messagesRef.current = finalMessages;

          // Save conversation to Supabase for logged-in users
          if (opts?.userId && passageRef.current && opts.bookAbbrev && opts.chapterNum) {
            saveConversation(
              opts.userId,
              passageRef.current.reference,
              passageRef.current.selectedText,
              opts.bookAbbrev,
              opts.chapterNum,
              finalMessages,
            );
          }
        },
        (err) => {
          setStreaming(false);
          inFlightRef.current = false;
          if (err === 'QUOTA_EXCEEDED') {
            setMessages(previousMessages);
            messagesRef.current = previousMessages;
            opts?.onFreeLimitReached?.();
          } else {
            setMessages(prev => {
              const updated = trimConversationMessages(prev.slice(0, -1));
              messagesRef.current = updated;
              return updated;
            });
            setError(err);
          }
        },
      );
    },
    [opts],
  );

  return { messages, streaming, error, ask, reset };
}
