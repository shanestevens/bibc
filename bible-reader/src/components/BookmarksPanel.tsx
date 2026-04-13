import type { Bookmark } from '../hooks/useBookmarks';

interface Props {
  isOpen: boolean;
  bookmarks: Bookmark[];
  onNavigate: (bookAbbrev: string, chapterNum: number) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export function BookmarksPanel({ isOpen, bookmarks, onNavigate, onRemove, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} />
      <div className="bookmarks-panel">
        <div className="bookmarks-header">
          <span className="settings-label">Bookmarks</span>
          <button className="ask-close" onClick={onClose}>✕</button>
        </div>
        {bookmarks.length === 0 ? (
          <p className="bookmarks-empty">No bookmarks yet — highlight a passage and tap the bookmark icon to save it.</p>
        ) : (
          <div className="bookmarks-list">
            {bookmarks.map(b => (
              <div key={b.id} className="bookmark-item">
                <button
                  className="bookmark-nav"
                  onClick={() => { onNavigate(b.bookAbbrev, b.chapterNum); onClose(); }}
                >
                  <span className="bookmark-title">{b.reference}</span>
                  {b.selectedText && (
                    <span className="bookmark-passage">
                      {b.selectedText.length > 80 ? b.selectedText.slice(0, 80) + '…' : b.selectedText}
                    </span>
                  )}
                  <span className="bookmark-date">{new Date(b.savedAt).toLocaleDateString()}</span>
                </button>
                <button
                  className="bookmark-remove"
                  onClick={() => onRemove(b.id)}
                  aria-label="Remove bookmark"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
