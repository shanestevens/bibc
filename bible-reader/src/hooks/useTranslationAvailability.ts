import { useState, useEffect } from 'react';
import { TRANSLATIONS, type TranslationId } from '../lib/translations';

// Probes each translation's search index with a HEAD request.
// Returns a Set of translation IDs whose data is present on the server.
// WEB is assumed always available (it ships with the build).
export function useTranslationAvailability() {
  const [available, setAvailable] = useState<Set<TranslationId>>(
    () => new Set<TranslationId>(['web'])
  );

  useEffect(() => {
    const checks = TRANSLATIONS
      .filter(t => t.id !== 'web')
      .map(async t => {
        try {
          const res = await fetch(`/search-index-${t.id}.json`, { method: 'HEAD' });
          return res.ok ? t.id : null;
        } catch {
          return null;
        }
      });

    Promise.all(checks).then(results => {
      const ids = results.filter((id): id is TranslationId => id !== null);
      if (ids.length > 0) {
        setAvailable(prev => new Set([...prev, ...ids]));
      }
    });
  }, []);

  return available;
}
