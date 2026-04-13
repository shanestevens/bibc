import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useConversation } from '../hooks/useConversation';

interface Props {
  isOpen: boolean;
  selectedText: string;
  reference: string;
  onClose: () => void;
  isLoggedIn: boolean;
  userId: string | null;
  accessToken: string | null;
  bookAbbrev: string;
  chapterNum: number;
  isBookmarked: boolean;
  onBookmark: () => void;
  onAnonLimitReached: () => void;
  onFreeLimitReached: () => void;
}

const SUGGESTED = [
  'What does this mean?',
  'Historical context?',
  'Explain simply',
  'Why is this significant?',
] as const;

/** Split follow-up suggestions out of a response. Returns { body, followUps }. */
function parseFollowUps(content: string): { body: string; followUps: string[] } {
  const lines = content.split('\n');
  const followUps: string[] = [];
  const bodyLines: string[] = [];

  for (const line of lines) {
    const m = line.match(/^FOLLOW_UP_\d+:\s*(.+)/);
    if (m) {
      const question = m[1].trim();
      if (question) followUps.push(question);
    } else {
      bodyLines.push(line);
    }
  }

  return { body: bodyLines.join('\n').trim(), followUps: followUps.slice(0, 2) };
}

export function AskPanel({ isOpen, selectedText, reference, onClose, isLoggedIn, userId, accessToken, bookAbbrev, chapterNum, isBookmarked, onBookmark, onAnonLimitReached, onFreeLimitReached }: Props) {
  const { messages, streaming, error, ask, reset } = useConversation({
    isLoggedIn,
    userId,
    accessToken,
    bookAbbrev,
    chapterNum,
    onAnonLimitReached,
    onFreeLimitReached,
  });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFirstQuestion = messages.length === 0;

  useEffect(() => {
    if (isOpen) {
      reset();
      setInput('');
    }
  }, [isOpen, selectedText, reference, reset]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!streaming && messages.length >= 2) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [streaming, messages.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleAsk = useCallback((question: string) => {
    if (!question.trim() || streaming) return;
    ask(question, isFirstQuestion ? selectedText : undefined, isFirstQuestion ? reference : undefined);
    setInput('');
  }, [ask, streaming, isFirstQuestion, selectedText, reference]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk(input);
    }
  };

  // Parse follow-ups from the last assistant message
  const lastAssistant = !streaming
    ? messages.findLast(m => m.role === 'assistant')
    : null;
  const { followUps } = lastAssistant
    ? parseFollowUps(lastAssistant.content)
    : { followUps: [] };

  return (
    <>
      <div
        className={`ask-backdrop ${isOpen ? 'ask-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`ask-panel ${isOpen ? 'ask-panel--open' : ''}`}
        role="dialog"
        aria-label="Ask about this passage"
        aria-modal="true"
      >
        <div className="ask-handle" />

        <div className="ask-header">
          <span className="ask-reference">{reference}</span>
          <button
            className={`ask-bookmark ${isBookmarked ? 'ask-bookmark--saved' : ''}`}
            onClick={onBookmark}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this passage'}
            title={isBookmarked ? 'Remove bookmark' : 'Save to bookmarks'}
          >
            <svg viewBox="0 0 20 20" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 4a1 1 0 011-1h8a1 1 0 011 1v13l-5-3-5 3V4z" />
            </svg>
          </button>
          <button className="ask-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <blockquote className="ask-quote">
          {selectedText.length > 200 ? selectedText.slice(0, 200) + '…' : selectedText}
        </blockquote>

        {/* Scrollable body */}
        <div className="ask-body">
          {messages.length > 0 && (
            <div className="ask-messages">
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
                const { body } = msg.role === 'assistant'
                  ? parseFollowUps(msg.content)
                  : { body: msg.content };

                return (
                  <div key={i} className={`ask-msg ask-msg--${msg.role}`}>
                    {msg.role === 'user' ? (
                      <p className="ask-msg-text">
                        {i === 0 && msg.content.includes('\n\n')
                          ? msg.content.split('\n\n').at(-1)
                          : msg.content}
                      </p>
                    ) : (
                      <div className="ask-msg-text ask-response">
                        {formatResponse(body)}
                        {streaming && isLastAssistant && (
                          <span className="ask-cursor" aria-hidden="true">▍</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {error && <div className="ask-error">{error}</div>}

          {/* Initial suggested questions */}
          {isFirstQuestion && !streaming && (
            <div className="ask-suggestions">
              {SUGGESTED.map(q => (
                <button key={q} className="ask-suggestion-btn" onClick={() => handleAsk(q)} disabled={streaming}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Follow-up suggestions after a response */}
          {!streaming && followUps.length > 0 && (
            <div className="ask-followups">
              {followUps.map(q => (
                <button key={q} className="ask-followup-btn" onClick={() => handleAsk(q)} disabled={streaming}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input row */}
        <div className="ask-input-row">
          <textarea
            ref={inputRef}
            className="ask-input"
            placeholder={isFirstQuestion ? 'Ask about this passage…' : 'Ask a follow-up about this passage…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={streaming}
          />
          <button
            className="ask-send"
            onClick={() => handleAsk(input)}
            disabled={!input.trim() || streaming}
            aria-label="Send"
          >
            {streaming ? (
              <span className="ask-send-spinner" />
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

/** Render inline markdown: **bold**, *italic* */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/** Render markdown paragraphs, bullets, bold, italic */
function formatResponse(text: string) {
  if (!text) return null;

  const blocks = text.split(/\n\n+/).filter(Boolean);

  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const isList = lines.every(l => /^[-•*]\s/.test(l.trim()) || l.trim() === '');

        if (isList) {
          return (
            <ul key={i} className="ask-response-list">
              {lines.filter(l => l.trim()).map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^[-•*]\s/, ''))}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{renderInline(block)}</p>;
      })}
    </>
  );
}
