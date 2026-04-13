import type { ChapterData } from '../lib/types';
import type { BookmarkedVerseSelection } from '../lib/bookmark-selection';
import { ProseParagraph } from './ProseParagraph';
import { PoetryParagraph } from './PoetryParagraph';

interface Props {
  bookName: string;
  chapter: ChapterData;
  bookmarkedVerseSelections?: Map<number, BookmarkedVerseSelection>;
  onBookmarkedVerseClick?: (bookmark: BookmarkedVerseSelection, event: React.MouseEvent<HTMLElement>) => void;
}

export function ChapterView({ bookName, chapter, bookmarkedVerseSelections, onBookmarkedVerseClick }: Props) {
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
              bookmarkedVerseSelections={bookmarkedVerseSelections}
              onBookmarkedVerseClick={onBookmarkedVerseClick}
            />
          );
        }
        return (
          <PoetryParagraph
            key={i}
            paragraph={para}
            bookmarkedVerseSelections={bookmarkedVerseSelections}
            onBookmarkedVerseClick={onBookmarkedVerseClick}
          />
        );
      })}
    </article>
  );
}
