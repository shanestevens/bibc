import type { ProseParagraph as ProseParagraphType } from '../lib/types';
import { VerseNumber } from './VerseNumber';

interface Props {
  paragraph: ProseParagraphType;
  isFirst: boolean;
}

export function ProseParagraph({ paragraph, isFirst }: Props) {
  return (
    <>
      {paragraph.heading && (
        <div className="section-heading">{paragraph.heading}</div>
      )}
      {paragraph.description && (
        <div className="psalm-description">{paragraph.description}</div>
      )}
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
    </>
  );
}
