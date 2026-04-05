import { useState, useEffect, useRef, useCallback } from 'react';
import { loadBook, AVAILABLE_BOOKS } from '../lib/books';
import type { BookData } from '../lib/types';
import { BookPicker } from './BookPicker';
import { ChapterNav } from './ChapterNav';
import { ChapterView } from './ChapterView';
import { SelectionButton } from './SelectionButton';
import { AskPanel } from './AskPanel';
import { SearchModal } from './SearchModal';
import { SettingsPanel } from './SettingsPanel';
import { BookmarksPanel } from './BookmarksPanel';
import { InspirationPanel } from './InspirationPanel';
import { useTextSelection } from '../hooks/useTextSelection';
import { useSettings } from '../hooks/useSettings';
import { useBookmarks, savePosition, loadPosition } from '../hooks/useBookmarks';

export function BibleReader() {
  const { theme, fontSize, setTheme, setFontSize } = useSettings();
  const { bookmarks, isBookmarked, toggle: toggleBookmark, remove: removeBookmark } = useBookmarks();

  const savedPos = loadPosition();
  const [bookAbbrev, setBookAbbrev] = useState(savedPos?.bookAbbrev ?? 'GEN');
  const [chapterNum, setChapterNum] = useState(savedPos?.chapterNum ?? 1);
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const readingAreaRef = useRef<HTMLDivElement>(null);

  // Panel / modal state
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelSelection, setPanelSelection] = useState<{ text: string; reference: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [inspirationOpen, setInspirationOpen] = useState(false);

  const bookMeta = AVAILABLE_BOOKS.find(b => b.abbrev === bookAbbrev);
  const bookName = bookMeta?.name ?? '';
  const bookmarkedNow = isBookmarked(bookAbbrev, chapterNum);

  // Text selection hook
  const { selection, clearSelection } = useTextSelection(readingAreaRef, bookName, chapterNum);

  useEffect(() => {
    setLoading(true);
    loadBook(bookAbbrev).then(b => {
      setBook(b);
      setLoading(false);
    });
  }, [bookAbbrev]);

  const navigate = useCallback((abbrev: string, chapter: number) => {
    setBookAbbrev(abbrev);
    setChapterNum(chapter);
    savePosition(abbrev, chapter);
    setPanelOpen(false);
    clearSelection();
    if (readingAreaRef.current) {
      readingAreaRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [clearSelection]);

  const handleBookSelect = useCallback((abbrev: string) => {
    navigate(abbrev, 1);
  }, [navigate]);

  const handleChapterSelect = useCallback((num: number) => {
    navigate(bookAbbrev, num);
  }, [bookAbbrev, navigate]);

  const handleSearchNavigate = useCallback((abbrev: string, chapter: number) => {
    navigate(abbrev, chapter);
    setSearchOpen(false);
  }, [navigate]);

  const handleBookmarkNavigate = useCallback((abbrev: string, chapter: number) => {
    navigate(abbrev, chapter);
    setBookmarksOpen(false);
  }, [navigate]);

  const handleAskClick = useCallback(() => {
    if (!selection) return;
    setPanelSelection({ text: selection.text, reference: selection.reference });
    setPanelOpen(true);
    clearSelection();
  }, [selection, clearSelection]);

  const handlePanelClose = useCallback(() => setPanelOpen(false), []);

  // Swipe left/right for chapter nav (only when all panels closed)
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (panelOpen || searchOpen || settingsOpen || bookmarksOpen) return;
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (panelOpen || searchOpen || settingsOpen || bookmarksOpen) return;
    if (touchStartX.current === null || !book) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 80) return;
    if (dx < 0 && chapterNum < book.chapters.length) handleChapterSelect(chapterNum + 1);
    if (dx > 0 && chapterNum > 1) handleChapterSelect(chapterNum - 1);
    touchStartX.current = null;
  };

  const chapter = book?.chapters.find(c => c.number === chapterNum) ?? null;

  return (
    <div className="reader-shell">
      {/* Top navigation bar */}
      <header className="reader-header">
        <div className="reader-header-inner">
          <BookPicker current={bookAbbrev} onSelect={handleBookSelect} />
          {book && (
            <ChapterNav
              current={chapterNum}
              total={book.chapters.length}
              onSelect={handleChapterSelect}
            />
          )}
          {/* Header action icons */}
          <div className="header-actions">
            <button
              className="header-icon-btn"
              aria-label="Inspiration"
              onClick={() => setInspirationOpen(v => !v)}
              title="Famous passages"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
            <button
              className="header-icon-btn"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              className={`header-icon-btn ${bookmarkedNow ? 'header-icon-btn--active' : ''}`}
              aria-label={bookmarkedNow ? 'Remove bookmark' : 'Bookmark this chapter'}
              onClick={() => toggleBookmark(bookAbbrev, bookName, chapterNum)}
            >
              <svg viewBox="0 0 20 20" fill={bookmarkedNow ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 4a1 1 0 011-1h8a1 1 0 011 1v13l-5-3-5 3V4z" />
              </svg>
            </button>
            <button
              className="header-icon-btn"
              aria-label="Saved bookmarks"
              onClick={() => setBookmarksOpen(v => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
              </svg>
            </button>
            <button
              className="header-icon-btn"
              aria-label="Settings"
              onClick={() => setSettingsOpen(v => !v)}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Reading area */}
      <main
        ref={readingAreaRef}
        className="reader-main"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {loading && <div className="reader-loading">Loading…</div>}
        {!loading && chapter && (
          <div className="reader-content">
            <ChapterView bookName={bookName} chapter={chapter} />
            <p className="reader-hint">Highlight any text to ask a question</p>
          </div>
        )}
      </main>

      {/* Floating ask button */}
      {selection && !panelOpen && (
        <SelectionButton selection={selection} onAsk={handleAskClick} />
      )}

      {/* Ask panel */}
      {panelSelection && (
        <AskPanel
          isOpen={panelOpen}
          selectedText={panelSelection.text}
          reference={panelSelection.reference}
          onClose={handlePanelClose}
        />
      )}

      {/* Search modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleSearchNavigate}
      />

      {/* Settings panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        theme={theme}
        fontSize={fontSize}
        onTheme={setTheme}
        onFontSize={setFontSize}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Bookmarks panel */}
      <BookmarksPanel
        isOpen={bookmarksOpen}
        bookmarks={bookmarks}
        onNavigate={handleBookmarkNavigate}
        onRemove={removeBookmark}
        onClose={() => setBookmarksOpen(false)}
      />

      {/* Inspiration panel */}
      <InspirationPanel
        isOpen={inspirationOpen}
        onNavigate={(abbrev, ch) => { navigate(abbrev, ch); setInspirationOpen(false); }}
        onClose={() => setInspirationOpen(false)}
      />
    </div>
  );
}
