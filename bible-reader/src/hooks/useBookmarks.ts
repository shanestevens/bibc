import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Bookmark {
  id: string;
  bookAbbrev: string;
  bookName: string;
  chapterNum: number;
  reference: string;
  selectedText: string;
  savedAt: number;
}

const KEY = 'bibc_bookmarks';
const MAX = 50;

function loadLocal(): Bookmark[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistLocal(bm: Bookmark[]) {
  localStorage.setItem(KEY, JSON.stringify(bm));
}

export function useBookmarks(userId?: string | null) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadLocal);

  // Load from Supabase when logged in, clear when signed out
  useEffect(() => {
    if (!userId) {
      setBookmarks([]);
      return;
    }

    const sync = async () => {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) return;

      setBookmarks((data ?? []).map(r => ({
        id: r.id,
        bookAbbrev: r.book_abbrev,
        bookName: r.book_name,
        chapterNum: r.chapter_num,
        reference: r.reference ?? `${r.book_name} ${r.chapter_num}`,
        selectedText: r.selected_text ?? '',
        savedAt: new Date(r.saved_at).getTime(),
      })));
    };

    sync();
  }, [userId]);

  const isBookmarked = useCallback((reference: string) =>
    bookmarks.some(b => b.reference === reference),
    [bookmarks]);

  const add = useCallback(async (
    bookAbbrev: string, bookName: string, chapterNum: number,
    reference: string, selectedText: string,
  ) => {
    if (userId) {
      const { data, error } = await supabase.from('bookmarks').insert({
        user_id: userId,
        book_abbrev: bookAbbrev,
        book_name: bookName,
        chapter_num: chapterNum,
        reference,
        selected_text: selectedText,
      }).select().single();
      if (!error && data) {
        const entry: Bookmark = {
          id: data.id,
          bookAbbrev: data.book_abbrev,
          bookName: data.book_name,
          chapterNum: data.chapter_num,
          reference: data.reference,
          selectedText: data.selected_text,
          savedAt: new Date(data.saved_at).getTime(),
        };
        setBookmarks(prev => [entry, ...prev].slice(0, MAX));
      }
    } else {
      const entry: Bookmark = {
        id: `${reference}-${Date.now()}`,
        bookAbbrev, bookName, chapterNum, reference, selectedText,
        savedAt: Date.now(),
      };
      setBookmarks(prev => {
        const next = [entry, ...prev].slice(0, MAX);
        persistLocal(next);
        return next;
      });
    }
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    if (userId) {
      await supabase.from('bookmarks').delete().eq('id', id);
    }
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== id);
      if (!userId) persistLocal(next);
      return next;
    });
  }, [userId]);

  return { bookmarks, isBookmarked, add, remove };
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
