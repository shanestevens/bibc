import { useState, useCallback } from 'react';

export interface Bookmark {
  id: string;
  bookAbbrev: string;
  bookName: string;
  chapterNum: number;
  savedAt: number;
}

const KEY = 'bibc_bookmarks';
const MAX = 50;

function load(): Bookmark[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persist(bm: Bookmark[]) {
  localStorage.setItem(KEY, JSON.stringify(bm));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(load);

  const isBookmarked = useCallback((bookAbbrev: string, chapterNum: number) =>
    bookmarks.some(b => b.bookAbbrev === bookAbbrev && b.chapterNum === chapterNum),
    [bookmarks]);

  const toggle = useCallback((bookAbbrev: string, bookName: string, chapterNum: number) => {
    setBookmarks(prev => {
      const exists = prev.findIndex(b => b.bookAbbrev === bookAbbrev && b.chapterNum === chapterNum);
      let next: Bookmark[];
      if (exists >= 0) {
        next = prev.filter((_, i) => i !== exists);
      } else {
        const entry: Bookmark = {
          id: `${bookAbbrev}-${chapterNum}-${Date.now()}`,
          bookAbbrev, bookName, chapterNum,
          savedAt: Date.now(),
        };
        next = [entry, ...prev].slice(0, MAX);
      }
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { bookmarks, isBookmarked, toggle, remove };
}

// ─── Last reading position ─────────────────────────────────────────────────

const POS_KEY = 'bibc_position';

export function savePosition(bookAbbrev: string, chapterNum: number) {
  localStorage.setItem(POS_KEY, JSON.stringify({ bookAbbrev, chapterNum }));
}

export function loadPosition(): { bookAbbrev: string; chapterNum: number } | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
