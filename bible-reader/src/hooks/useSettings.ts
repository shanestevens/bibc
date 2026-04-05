import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
export type FontSize = 'sm' | 'md' | 'lg';

interface Settings {
  theme: Theme;
  fontSize: FontSize;
}

const DEFAULTS: Settings = { theme: 'light', fontSize: 'md' };

function load(): Settings {
  try {
    const raw = localStorage.getItem('bibc_settings');
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

function persist(s: Settings) {
  localStorage.setItem('bibc_settings', JSON.stringify(s));
}

function apply(s: Settings) {
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.dataset.fontsize = s.fontSize;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    apply(settings);
    persist(settings);
  }, [settings]);

  // Apply on first render before paint
  useEffect(() => { apply(load()); }, []);

  const setTheme = (theme: Theme) => setSettings(s => ({ ...s, theme }));
  const setFontSize = (fontSize: FontSize) => setSettings(s => ({ ...s, fontSize }));

  return { ...settings, setTheme, setFontSize };
}
