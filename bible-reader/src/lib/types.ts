export interface BibleBook {
  name: string;
  abbrev: string;
  chapters: Chapter[];
}

export interface Chapter {
  number: number;
  paragraphs: Paragraph[];
}

export interface Paragraph {
  type: 'prose' | 'poetry';
  heading?: string;       // section heading preceding this paragraph (\s)
  description?: string;   // psalm description (\d)
  verses: Verse[];
}

export interface Verse {
  num: number;
  segments: Segment[];    // text broken into normal/red-letter segments
}

// A segment is a run of text within a verse, optionally red-letter
export interface Segment {
  text: string;
  redLetter?: boolean;
}

// For poetry verses, lines carry indent level
export interface PoetryLine {
  level: 1 | 2;           // q1 or q2 indent
  segments: Segment[];
}

// Extended verse type — poetry verses have lines, prose have segments
export interface ProseVerse extends Verse {
  kind: 'prose';
}

export interface PoetryVerse {
  num: number;
  kind: 'poetry';
  lines: PoetryLine[];
}

export type AnyVerse = ProseVerse | PoetryVerse;

export interface ProseParagraph {
  type: 'prose';
  heading?: string;
  description?: string;
  verses: ProseVerse[];
}

export interface PoetryParagraph {
  type: 'poetry';
  heading?: string;
  description?: string;
  verses: PoetryVerse[];
}

export type AnyParagraph = ProseParagraph | PoetryParagraph;

export interface ChapterData {
  number: number;
  paragraphs: AnyParagraph[];
}

export interface BookData {
  name: string;
  abbrev: string;
  chapters: ChapterData[];
}
