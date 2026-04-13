import { useState } from 'react';
import { getAnonCount } from '../hooks/useConversation';
import { ANON_LIMIT, FREE_LIMIT } from './AuthModal';

interface Props {
  userId?: string | null;
  onMonthlyLimitReached?: () => void;
}

export function DebugMenu({ userId, onMonthlyLimitReached }: Props) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2000);
  };

  const resetAnon = () => {
    localStorage.removeItem('bib_anon_questions');
    flash(`Anon counter reset (was ${getAnonCount()})`);
  };

  const setAnonToLimit = () => {
    localStorage.setItem('bib_anon_questions', String(ANON_LIMIT));
    flash(`Anon counter set to ${ANON_LIMIT} — next question will trigger auth modal`);
  };

  const updateMonthlyQuota = async (action: 'reset' | 'limit'): Promise<boolean> => {
    if (!userId) { flash('Not logged in'); return false; }

    try {
      const response = await fetch('/api/debug/usage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, userId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Debug request failed' }));
        flash(body.error ?? 'Debug request failed');
        return false;
      }

      flash(action === 'reset'
        ? 'Monthly quota reset to 0'
        : `Monthly quota set to ${FREE_LIMIT}`);
      return true;
    } catch {
      flash('Debug API unavailable. Is the local server running?');
      return false;
    }
  };

  const resetMonthlyQuota = async () => {
    await updateMonthlyQuota('reset');
  };

  const setQuotaToLimit = async () => {
    const updated = await updateMonthlyQuota('limit');
    if (updated) onMonthlyLimitReached?.();
  };

  return (
    <div style={{ position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 999, fontFamily: 'monospace' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background: '#1a1208', color: '#f5f0e4', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', opacity: 0.7 }}
      >
        🛠 debug
      </button>

      {open && (
        <div style={{ background: '#1a1208', color: '#f5f0e4', borderRadius: 8, padding: '0.75rem', marginBottom: '0.5rem', position: 'absolute', bottom: '2rem', left: 0, minWidth: 240, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem', opacity: 0.6 }}>AUTH DEBUG</div>

          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ opacity: 0.5, marginBottom: 4 }}>Anonymous ({ANON_LIMIT} question limit)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn onClick={resetAnon}>Reset counter</Btn>
              <Btn onClick={setAnonToLimit}>Trigger limit</Btn>
            </div>
          </div>

          <div>
            <div style={{ opacity: 0.5, marginBottom: 4 }}>Monthly quota ({FREE_LIMIT} question limit)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn onClick={resetMonthlyQuota}>Reset quota</Btn>
              <Btn onClick={setQuotaToLimit}>Trigger limit</Btn>
            </div>
          </div>

          {msg && (
            <div style={{ marginTop: '0.6rem', color: '#c9b88a', fontSize: 11 }}>{msg}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ background: '#2d2010', color: '#f5f0e4', border: '1px solid #4a3820', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
    >
      {children}
    </button>
  );
}
