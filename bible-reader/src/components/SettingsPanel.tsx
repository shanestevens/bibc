import type { Theme, FontSize } from '../hooks/useSettings';

interface Props {
  isOpen: boolean;
  theme: Theme;
  fontSize: FontSize;
  onTheme: (t: Theme) => void;
  onFontSize: (f: FontSize) => void;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, theme, fontSize, onTheme, onFontSize, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-row">
          <span className="settings-label">Theme</span>
          <div className="settings-toggle-group">
            <button
              className={`settings-toggle ${theme === 'light' ? 'settings-toggle--active' : ''}`}
              onClick={() => onTheme('light')}
            >
              ☀️ Light
            </button>
            <button
              className={`settings-toggle ${theme === 'dark' ? 'settings-toggle--active' : ''}`}
              onClick={() => onTheme('dark')}
            >
              🌙 Dark
            </button>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Text size</span>
          <div className="settings-toggle-group">
            <button
              className={`settings-toggle settings-toggle--sm ${fontSize === 'sm' ? 'settings-toggle--active' : ''}`}
              onClick={() => onFontSize('sm')}
            >
              A
            </button>
            <button
              className={`settings-toggle ${fontSize === 'md' ? 'settings-toggle--active' : ''}`}
              onClick={() => onFontSize('md')}
            >
              A
            </button>
            <button
              className={`settings-toggle settings-toggle--lg ${fontSize === 'lg' ? 'settings-toggle--active' : ''}`}
              onClick={() => onFontSize('lg')}
            >
              A
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
