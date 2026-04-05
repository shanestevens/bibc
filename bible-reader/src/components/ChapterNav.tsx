interface Props {
  current: number;
  total: number;
  onSelect: (num: number) => void;
}

export function ChapterNav({ current, total, onSelect }: Props) {
  return (
    <div className="chapter-nav">
      <button
        className="chapter-nav-arrow"
        onClick={() => onSelect(current - 1)}
        disabled={current <= 1}
        aria-label="Previous chapter"
      >
        ‹
      </button>

      <select
        className="chapter-nav-select"
        value={current}
        onChange={e => onSelect(Number(e.target.value))}
        aria-label="Select chapter"
      >
        {Array.from({ length: total }, (_, i) => i + 1).map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      <button
        className="chapter-nav-arrow"
        onClick={() => onSelect(current + 1)}
        disabled={current >= total}
        aria-label="Next chapter"
      >
        ›
      </button>
    </div>
  );
}
