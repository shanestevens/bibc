import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { AuthModal } from './AuthModal';
import { HistoryPanel } from './HistoryPanel';
import { UserMenu } from './UserMenu';
import { DebugMenu } from './DebugMenu';
import { useTextSelection, type SelectionData } from '../hooks/useTextSelection';
import { useSettings } from '../hooks/useSettings';
import { useBookmarks, savePosition, loadPosition } from '../hooks/useBookmarks';
import { useAuth } from '../hooks/useAuth';
import { useHistory } from '../hooks/useHistory';
import type { BookmarkedVerseSelection } from '../lib/bookmark-selection';

export function BibleReader() {
  const { theme, fontSize, setTheme, setFontSize } = useSettings();
  const auth = useAuth();
  const { bookmarks, isBookmarked, add: addBookmark, remove: removeBookmark } = useBookmarks(auth.user?.id);
  const { entries: historyEntries, loading: historyLoading, load: loadHistory, remove: removeHistory } = useHistory(auth.user?.id);

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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authReason, setAuthReason] = useState<'anon_limit' | 'free_limit'>('anon_limit');
  const [historyOpen, setHistoryOpen] = useState(false);

  const bookMeta = AVAILABLE_BOOKS.find(b => b.abbrev === bookAbbrev);
  const bookName = bookMeta?.name ?? '';

  // Text selection hook
  const { selection, clearSelection } = useTextSelection(readingAreaRef, bookName, chapterNum);
  const [bookmarkSelection, setBookmarkSelection] = useState<SelectionData | null>(null);
  const activeSelection = selection ?? bookmarkSelection;

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
    setBookmarkSelection(null);
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
    if (!activeSelection) return;
    setPanelSelection({ text: activeSelection.text, reference: activeSelection.reference });
    setPanelOpen(true);
    setBookmarkSelection(null);
    clearSelection();
  }, [activeSelection, clearSelection]);

  const handleBookmarkedVerseClick = useCallback((
    bookmark: BookmarkedVerseSelection,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    clearSelection();

    const rect = event.currentTarget.getBoundingClientRect();
    const btnW = 160;
    const margin = 8;
    const rawX = event.clientX - btnW / 2;
    const buttonX = Math.max(margin, Math.min(rawX, window.innerWidth - btnW - margin));
    const buttonY = Math.min(rect.bottom + 12, window.innerHeight - 56);

    setPanelOpen(false);
    setBookmarkSelection({
      text: bookmark.selectedText || bookmark.reference,
      reference: bookmark.reference,
      buttonX,
      buttonY,
    });
  }, [clearSelection]);

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

  // Build bookmark selection data by verse for the current chapter (logged-in only)
  const bookmarkedVerseSelections = useMemo(() => {
    const selections = new Map<number, BookmarkedVerseSelection>();
    if (!auth.user) return selections;
    for (const bm of bookmarks) {
      if (bm.bookAbbrev !== bookAbbrev) continue;
      if (bm.chapterNum !== chapterNum) continue;
      // Parse verse range from reference e.g. "Genesis 1:3–7" or "Genesis 1:3"
      const match = bm.reference.match(/:(\d+)(?:[–\-](\d+))?/);
      if (!match) continue;
      const from = parseInt(match[1], 10);
      const to = match[2] ? parseInt(match[2], 10) : from;
      const bookmark = { reference: bm.reference, selectedText: bm.selectedText };
      for (let v = from; v <= to; v++) selections.set(v, bookmark);
    }
    return selections;
  }, [auth.user, bookmarks, bookAbbrev, chapterNum]);

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
            {auth.user ? (
              <UserMenu
                user={auth.user}
                onBookmarks={() => setBookmarksOpen(v => !v)}
                onHistory={() => { setHistoryOpen(v => !v); if (!historyOpen) loadHistory(); }}
                onSettings={() => setSettingsOpen(v => !v)}
                onSignOut={auth.signOut}
              />
            ) : (
              <button
                className="header-icon-btn"
                aria-label="Settings"
                onClick={() => setSettingsOpen(v => !v)}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
            )}
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
            <ChapterView
              bookName={bookName}
              chapter={chapter}
              bookmarkedVerseSelections={bookmarkedVerseSelections}
              onBookmarkedVerseClick={handleBookmarkedVerseClick}
            />
            <p className="reader-hint">Highlight any text to ask a question</p>
          </div>
        )}
      </main>

      {/* Floating ask button */}
      {activeSelection && !panelOpen && (
        <SelectionButton
          selection={activeSelection}
          isBookmarked={isBookmarked(activeSelection.reference)}
          onAsk={handleAskClick}
          onBookmark={() => {
            if (!auth.user) { setAuthReason('anon_limit'); setAuthModalOpen(true); return; }
            const bm = bookmarks.find(b => b.reference === activeSelection.reference);
            if (bm) removeBookmark(bm.id);
            else addBookmark(bookAbbrev, bookName, chapterNum, activeSelection.reference, activeSelection.text);
          }}
        />
      )}

      {/* Ask panel */}
      {panelSelection && (
        <AskPanel
          isOpen={panelOpen}
          selectedText={panelSelection.text}
          reference={panelSelection.reference}
          onClose={handlePanelClose}
          isLoggedIn={!!auth.user}
          userId={auth.user?.id ?? null}
          accessToken={auth.session?.access_token ?? null}
          bookAbbrev={bookAbbrev}
          chapterNum={chapterNum}
          isBookmarked={isBookmarked(panelSelection.reference)}
          onBookmark={() => {
            if (!auth.user) { setAuthReason('anon_limit'); setAuthModalOpen(true); return; }
            const bm = bookmarks.find(b => b.reference === panelSelection.reference);
            if (bm) removeBookmark(bm.id);
            else addBookmark(bookAbbrev, bookName, chapterNum, panelSelection.reference, panelSelection.text);
          }}
          onAnonLimitReached={() => { setAuthReason('anon_limit'); setAuthModalOpen(true); }}
          onFreeLimitReached={() => { setAuthReason('free_limit'); setAuthModalOpen(true); }}
        />
      )}

      {/* History panel */}
      <HistoryPanel
        isOpen={historyOpen}
        entries={historyEntries}
        loading={historyLoading}
        onNavigate={(abbrev, ch) => { navigate(abbrev, ch); setHistoryOpen(false); }}
        onRemove={removeHistory}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Dev-only debug menu */}
      {import.meta.env.DEV && (
        <DebugMenu
          userId={auth.user?.id}
          onMonthlyLimitReached={() => { setAuthReason('free_limit'); setAuthModalOpen(true); }}
        />
      )}

      {/* Auth modal */}
      <AuthModal
        isOpen={authModalOpen}
        reason={authReason}
        anonCount={0}
        auth={auth}
        onClose={() => setAuthModalOpen(false)}
      />

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
