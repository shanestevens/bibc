import { useState, useRef, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';

interface Props {
  user: User;
  onBookmarks: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}

export function UserMenu({ user, onBookmarks, onHistory, onSettings, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'Account';
  const initial = displayName[0].toUpperCase();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const choose = (fn: () => void) => { fn(); setOpen(false); };

  return (
    <div className="user-menu" ref={ref}>
      <button
        className="header-icon-btn user-menu-trigger"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span className="header-user-avatar">{initial}</span>
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-identity">
            <span className="user-menu-avatar-lg">{initial}</span>
            <span className="user-menu-name">{displayName}</span>
          </div>

          <div className="user-menu-divider" />

          <button className="user-menu-item" role="menuitem" onClick={() => choose(onBookmarks)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path d="M5 4a1 1 0 011-1h8a1 1 0 011 1v13l-5-3-5 3V4z" />
            </svg>
            Bookmarks
          </button>

          <button className="user-menu-item" role="menuitem" onClick={() => choose(onHistory)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Question history
          </button>

          <button className="user-menu-item" role="menuitem" onClick={() => choose(onSettings)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Settings
          </button>

          <div className="user-menu-divider" />

          <button className="user-menu-item user-menu-item--danger" role="menuitem" onClick={() => choose(onSignOut)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 100-2H4V5h6a1 1 0 100-2H3zm10.293 4.293a1 1 0 011.414 0L17 9.586l-2.293 2.293a1 1 0 01-1.414-1.414L14.586 9.5l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M13 10a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
