import { useEffect, useState } from 'react';
import type { HistoryEntry } from '../hooks/useHistory';

interface Props {
  isOpen: boolean;
  entries: HistoryEntry[];
  loading: boolean;
  onNavigate: (bookAbbrev: string, chapterNum: number) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export function HistoryPanel({ isOpen, entries, loading, onNavigate, onRemove, onClose }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) setExpanded(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="side-panel-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="side-panel" role="dialog" aria-label="Question history">
        <div className="side-panel-header">
          <span className="side-panel-title">History</span>
          <button className="side-panel-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="side-panel-body">
          {loading && <p className="history-empty">Loading…</p>}

          {!loading && entries.length === 0 && (
            <p className="history-empty">
              Your question history will appear here after you ask about a passage.
            </p>
          )}

          {!loading && entries.map(entry => (
            <div key={entry.id} className="history-entry">
              <div className="history-entry-header">
                <button
                  className="history-reference"
                  onClick={() => onNavigate(entry.bookAbbrev, entry.chapterNum)}
                >
                  {entry.reference}
                </button>
                <span className="history-date">
                  {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <button
                  className="history-delete"
                  onClick={() => onRemove(entry.id)}
                  aria-label="Delete"
                >✕</button>
              </div>

              <p className="history-passage">
                {entry.selectedText.length > 120
                  ? entry.selectedText.slice(0, 120) + '…'
                  : entry.selectedText}
              </p>

              <button
                className="history-toggle"
                onClick={() => setExpanded(prev => prev === entry.id ? null : entry.id)}
              >
                {expanded === entry.id ? 'Hide conversation' : `Show conversation (${Math.floor(entry.messages.length / 2)} Q&A)`}
              </button>

              {expanded === entry.id && (
                <div className="history-messages">
                  {entry.messages.map((msg, i) => (
                    <div key={i} className={`history-msg history-msg--${msg.role}`}>
                      {msg.role === 'user' ? (
                        <p className="history-msg-text">
                          {i === 0 && msg.content.includes('\n\n')
                            ? msg.content.split('\n\n').at(-1)
                            : msg.content}
                        </p>
                      ) : (
                        <p className="history-msg-text">{msg.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
