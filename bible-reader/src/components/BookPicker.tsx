import { AVAILABLE_BOOKS } from '../lib/books';

interface Props {
  current: string;
  onSelect: (abbrev: string) => void;
}

const OT = AVAILABLE_BOOKS.filter(b => b.testament === 'OT');
const NT = AVAILABLE_BOOKS.filter(b => b.testament === 'NT');

export function BookPicker({ current, onSelect }: Props) {
  return (
    <div className="book-picker-wrapper">
      <select
        className="book-picker-select"
        value={current}
        onChange={e => onSelect(e.target.value)}
        aria-label="Select book"
      >
        <optgroup label="Old Testament">
          {OT.map(b => (
            <option key={b.abbrev} value={b.abbrev}>{b.name}</option>
          ))}
        </optgroup>
        <optgroup label="New Testament">
          {NT.map(b => (
            <option key={b.abbrev} value={b.abbrev}>{b.name}</option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
