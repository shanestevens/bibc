import type { ProseParagraph as ProseParagraphType } from '../lib/types';
import { bookmarkPreview, type BookmarkedVerseSelection } from '../lib/bookmark-selection';
import { VerseNumber } from './VerseNumber';

interface Props {
  paragraph: ProseParagraphType;
  isFirst: boolean;
  bookmarkedVerseSelections?: Map<number, BookmarkedVerseSelection>;
  onBookmarkedVerseClick?: (bookmark: BookmarkedVerseSelection, event: React.MouseEvent<HTMLElement>) => void;
}

// Genealogy/list paragraphs: short average verse length or any verse ending with ','
function isListLike(paragraph: ProseParagraphType): boolean {
  if (paragraph.verses.length < 2) return false;
  const texts = paragraph.verses.map(v => v.segments.map(s => s.text).join('').trim());
  const anyEndsWithComma = texts.some(t => t.endsWith(','));
  const avgLen = texts.reduce((sum, t) => sum + t.length, 0) / texts.length;
  return anyEndsWithComma || avgLen < 50;
}

export function ProseParagraph({ paragraph, isFirst, bookmarkedVerseSelections, onBookmarkedVerseClick }: Props) {
  const listLike = isListLike(paragraph);

  return (
    <>
      {paragraph.heading && (
        <div className="section-heading">{paragraph.heading}</div>
      )}
      {paragraph.description && (
        <div className="psalm-description">{paragraph.description}</div>
      )}
      {listLike ? (
        <div className={`prose-paragraph scripture-text${isFirst ? ' no-indent' : ''} prose-list`}>
          {paragraph.verses.map(verse => {
            const bookmark = bookmarkedVerseSelections?.get(verse.num);

            return (
              <div
                key={verse.num}
                className={`prose-list-item${bookmark ? ' verse-bookmarked' : ''}`}
                data-verse-num={verse.num}
                data-bookmark-preview={bookmarkPreview(bookmark)}
                onClick={bookmark ? event => onBookmarkedVerseClick?.(bookmark, event) : undefined}
              >
                <VerseNumber num={verse.num} />
                {verse.segments.map((seg, i) => (
                  seg.redLetter
                    ? <span key={i} className="red-letter">{seg.text}</span>
                    : <span key={i}>{seg.text}</span>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <p className={`prose-paragraph scripture-text${isFirst ? ' no-indent' : ''}`}>
          {paragraph.verses.map(verse => {
            const bookmark = bookmarkedVerseSelections?.get(verse.num);

            return (
              <span
                key={verse.num}
                data-verse-num={verse.num}
                data-bookmark-preview={bookmarkPreview(bookmark)}
                className={bookmark ? 'verse-bookmarked' : undefined}
                onClick={bookmark ? event => onBookmarkedVerseClick?.(bookmark, event) : undefined}
              >
                <VerseNumber num={verse.num} />
                {verse.segments.map((seg, i) => (
                  seg.redLetter
                    ? <span key={i} className="red-letter">{seg.text}</span>
                    : <span key={i}>{seg.text}</span>
                ))}
                {' '}
              </span>
            );
          })}
        </p>
      )}
    </>
  );
}
