import { useEffect, useRef } from 'react';
import { useSearch, type SearchResult } from '../hooks/useSearch';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (bookAbbrev: string, chapterNum: number) => void;
}

export function SearchModal({ isOpen, onClose, onNavigate }: Props) {
  const { query, results, loading, indexReady, handleQuery, clear } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      clear();
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, clear]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  function handleResult(r: SearchResult) {
    onNavigate(r.a, r.c);
    clear();
    onClose();
  }

  return (
    <>
      <div
        className={`search-backdrop ${isOpen ? 'search-backdrop--open' : ''}`}
        onClick={onClose}
      />
      <div className={`search-modal ${isOpen ? 'search-modal--open' : ''}`}>
        <div className="search-bar">
          <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            placeholder="Search the Bible…"
            value={query}
            onChange={e => handleQuery(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {query && (
            <button className="search-clear" onClick={() => handleQuery('')}>✕</button>
          )}
        </div>

        <div className="search-results">
          {!indexReady && (
            <p className="search-status">Loading search index…</p>
          )}
          {indexReady && query.length < 3 && (
            <p className="search-status">Type at least 3 characters to search</p>
          )}
          {indexReady && query.length >= 3 && loading && (
            <p className="search-status">Searching…</p>
          )}
          {indexReady && !loading && query.length >= 3 && results.length === 0 && (
            <p className="search-status">No results for "{query}"</p>
          )}
          {results.map((r, i) => (
            <button key={i} className="search-result" onClick={() => handleResult(r)}>
              <span className="search-result-ref">{r.n} {r.c}:{r.v}</span>
              <span className="search-result-text">
                {r.t.slice(0, r.matchStart)}
                <mark>{r.t.slice(r.matchStart, r.matchEnd)}</mark>
                {r.t.slice(r.matchEnd, r.matchEnd + 80)}
                {r.t.length > r.matchEnd + 80 ? '…' : ''}
              </span>
            </button>
          ))}
          {results.length === 50 && (
            <p className="search-status search-status--note">Showing first 50 results — refine your search for more</p>
          )}
        </div>
      </div>
    </>
  );
}
