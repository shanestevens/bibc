import type { PoetryParagraph as PoetryParagraphType } from '../lib/types';
import { bookmarkPreview, type BookmarkedVerseSelection } from '../lib/bookmark-selection';
import { VerseNumber } from './VerseNumber';

interface Props {
  paragraph: PoetryParagraphType;
  bookmarkedVerseSelections?: Map<number, BookmarkedVerseSelection>;
  onBookmarkedVerseClick?: (bookmark: BookmarkedVerseSelection, event: React.MouseEvent<HTMLElement>) => void;
}

export function PoetryParagraph({ paragraph, bookmarkedVerseSelections, onBookmarkedVerseClick }: Props) {
  return (
    <div className="poetry-block scripture-text">
      {paragraph.heading && (
        <div className="section-heading">{paragraph.heading}</div>
      )}
      {paragraph.description && (
        <div className="psalm-description">{paragraph.description}</div>
      )}
      {paragraph.verses.map(verse => {
        const bookmark = bookmarkedVerseSelections?.get(verse.num);

        return (
          <div
            key={verse.num}
            data-verse-num={verse.num}
            data-bookmark-preview={bookmarkPreview(bookmark)}
            className={bookmark ? 'verse-bookmarked' : undefined}
            onClick={bookmark ? event => onBookmarkedVerseClick?.(bookmark, event) : undefined}
          >
            {verse.lines.map((line, lineIdx) => (
              <span
                key={lineIdx}
                className={line.level === 1 ? 'poetry-line-q1' : 'poetry-line-q2'}
              >
                {lineIdx === 0 && <VerseNumber num={verse.num} />}
                {line.segments.map((seg, i) => (
                  seg.redLetter
                    ? <span key={i} className="red-letter">{seg.text}</span>
                    : <span key={i}>{seg.text}</span>
                ))}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
