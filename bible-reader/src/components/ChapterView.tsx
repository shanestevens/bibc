import type { ChapterData } from '../lib/types';
import { ProseParagraph } from './ProseParagraph';
import { PoetryParagraph } from './PoetryParagraph';

interface Props {
  bookName: string;
  chapter: ChapterData;
}

export function ChapterView({ bookName, chapter }: Props) {
  return (
    <article className="chapter-view">
      <h2 className="chapter-heading">
        <span className="chapter-book">{bookName}</span>
        <span className="chapter-num">{chapter.number}</span>
      </h2>

      {chapter.paragraphs.map((para, i) => {
        if (para.type === 'prose') {
          return (
            <ProseParagraph
              key={i}
              paragraph={para}
              isFirst={i === 0}
            />
          );
        }
        return <PoetryParagraph key={i} paragraph={para} />;
      })}
    </article>
  );
}
