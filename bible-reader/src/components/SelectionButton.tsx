import type { SelectionData } from '../hooks/useTextSelection';

interface Props {
  selection: SelectionData;
  onAsk: () => void;
}

export function SelectionButton({ selection, onAsk }: Props) {
  return (
    <button
      className="selection-btn"
      style={{
        left: selection.buttonX,
        top: selection.buttonY,
      }}
      onMouseDown={e => {
        // Prevent the mousedown from clearing the text selection
        e.preventDefault();
      }}
      onClick={onAsk}
    >
      Ask about this
    </button>
  );
}
