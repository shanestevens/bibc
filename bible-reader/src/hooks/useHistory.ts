import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const MAX_HISTORY_MESSAGES = 20;

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface HistoryEntry {
  id: string;
  reference: string;
  selectedText: string;
  bookAbbrev: string;
  chapterNum: number;
  createdAt: string;
  messages: HistoryMessage[];
}

function trimHistoryMessages(messages: HistoryMessage[]): HistoryMessage[] {
  let trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
  while (trimmed.length > 0 && trimmed[0].role === 'assistant') {
    trimmed = trimmed.slice(1);
  }
  return trimmed;
}

export function useHistory(userId?: string | null) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('conversations')
      .select(`id, reference, selected_text, book_abbrev, chapter_num, created_at,
               conversation_messages(role, content, created_at)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    setLoading(false);
    if (error || !data) return;

    setEntries(data.map(c => ({
      id: c.id,
      reference: c.reference,
      selectedText: c.selected_text,
      bookAbbrev: c.book_abbrev,
      chapterNum: c.chapter_num,
      createdAt: c.created_at,
      messages: trimHistoryMessages(
        (c.conversation_messages as { role: string; content: string; created_at: string }[])
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ),
    })));
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    await supabase.from('conversations').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return { entries, loading, load, remove };
}
