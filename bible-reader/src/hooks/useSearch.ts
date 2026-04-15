import { useState, useEffect, useRef, useCallback } from 'react';

export interface SearchEntry {
  a: string;   // book abbrev
  n: string;   // book name
  c: number;   // chapter
  v: number;   // verse
  t: string;   // text
}

export interface SearchResult extends SearchEntry {
  matchStart: number;
  matchEnd: number;
}

const indexCacheMap = new Map<string, SearchEntry[]>();

async function loadIndex(translation: string): Promise<SearchEntry[]> {
  if (indexCacheMap.has(translation)) return indexCacheMap.get(translation)!;
  const res = await fetch(`/search-index-${translation}.json`);
  const data = await res.json() as SearchEntry[];
  indexCacheMap.set(translation, data);
  return data;
}

function search(index: SearchEntry[], query: string, limit = 50): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return [];
  const results: SearchResult[] = [];
  for (const entry of index) {
    const lower = entry.t.toLowerCase();
    const pos = lower.indexOf(q);
    if (pos !== -1) {
      results.push({ ...entry, matchStart: pos, matchEnd: pos + q.length });
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function useSearch(translation: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexReady, setIndexReady] = useState(false);
  const indexRef = useRef<SearchEntry[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIndexReady(false);
    indexRef.current = null;
    setResults([]);
    loadIndex(translation).then(idx => {
      indexRef.current = idx;
      setIndexReady(true);
    });
  }, [translation]);

  const handleQuery = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.length < 3) { setResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      if (indexRef.current) {
        setResults(search(indexRef.current, q));
      }
      setLoading(false);
    }, 150);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, results, loading, indexReady, handleQuery, clear };
}
