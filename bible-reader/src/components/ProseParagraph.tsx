import type { ProseParagraph as ProseParagraphType } from '../lib/types';
import { VerseNumber } from './VerseNumber';

interface Props {
  paragraph: ProseParagraphType;
  isFirst: boolean;
}

// Genealogy/list paragraphs: short average verse length or any verse ending with ','
function isListLike(paragraph: ProseParagraphType): boolean {
  if (paragraph.verses.length < 2) return false;
  const texts = paragraph.verses.map(v => v.segments.map(s => s.text).join('').trim());
  const anyEndsWithComma = texts.some(t => t.endsWith(','));
  const avgLen = texts.reduce((sum, t) => sum + t.length, 0) / texts.length;
  return anyEndsWithComma || avgLen < 50;
}

export function ProseParagraph({ paragraph, isFirst }: Props) {
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
          {paragraph.verses.map(verse => (
            <div key={verse.num} className="prose-list-item" data-verse-num={verse.num}>
              <VerseNumber num={verse.num} />
              {verse.segments.map((seg, i) => (
                seg.redLetter
                  ? <span key={i} className="red-letter">{seg.text}</span>
                  : <span key={i}>{seg.text}</span>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className={`prose-paragraph scripture-text${isFirst ? ' no-indent' : ''}`}>
          {paragraph.verses.map(verse => (
            <span key={verse.num} data-verse-num={verse.num}>
              <VerseNumber num={verse.num} />
              {verse.segments.map((seg, i) => (
                seg.redLetter
                  ? <span key={i} className="red-letter">{seg.text}</span>
                  : <span key={i}>{seg.text}</span>
              ))}
              {' '}
            </span>
          ))}
        </p>
      )}
    </>
  );
}
