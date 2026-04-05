import type { BookData } from './types';

export interface BookMeta {
  name: string;
  abbrev: string;
  testament: 'OT' | 'NT';
}

export const AVAILABLE_BOOKS: BookMeta[] = [
  // Old Testament
  { name: 'Genesis',          abbrev: 'GEN', testament: 'OT' },
  { name: 'Exodus',           abbrev: 'EXO', testament: 'OT' },
  { name: 'Leviticus',        abbrev: 'LEV', testament: 'OT' },
  { name: 'Numbers',          abbrev: 'NUM', testament: 'OT' },
  { name: 'Deuteronomy',      abbrev: 'DEU', testament: 'OT' },
  { name: 'Joshua',           abbrev: 'JOS', testament: 'OT' },
  { name: 'Judges',           abbrev: 'JDG', testament: 'OT' },
  { name: 'Ruth',             abbrev: 'RUT', testament: 'OT' },
  { name: '1 Samuel',         abbrev: '1SA', testament: 'OT' },
  { name: '2 Samuel',         abbrev: '2SA', testament: 'OT' },
  { name: '1 Kings',          abbrev: '1KI', testament: 'OT' },
  { name: '2 Kings',          abbrev: '2KI', testament: 'OT' },
  { name: '1 Chronicles',     abbrev: '1CH', testament: 'OT' },
  { name: '2 Chronicles',     abbrev: '2CH', testament: 'OT' },
  { name: 'Ezra',             abbrev: 'EZR', testament: 'OT' },
  { name: 'Nehemiah',         abbrev: 'NEH', testament: 'OT' },
  { name: 'Esther',           abbrev: 'EST', testament: 'OT' },
  { name: 'Job',              abbrev: 'JOB', testament: 'OT' },
  { name: 'Psalms',           abbrev: 'PSA', testament: 'OT' },
  { name: 'Proverbs',         abbrev: 'PRO', testament: 'OT' },
  { name: 'Ecclesiastes',     abbrev: 'ECC', testament: 'OT' },
  { name: 'Song of Songs',    abbrev: 'SNG', testament: 'OT' },
  { name: 'Isaiah',           abbrev: 'ISA', testament: 'OT' },
  { name: 'Jeremiah',         abbrev: 'JER', testament: 'OT' },
  { name: 'Lamentations',     abbrev: 'LAM', testament: 'OT' },
  { name: 'Ezekiel',          abbrev: 'EZK', testament: 'OT' },
  { name: 'Daniel',           abbrev: 'DAN', testament: 'OT' },
  { name: 'Hosea',            abbrev: 'HOS', testament: 'OT' },
  { name: 'Joel',             abbrev: 'JOL', testament: 'OT' },
  { name: 'Amos',             abbrev: 'AMO', testament: 'OT' },
  { name: 'Obadiah',          abbrev: 'OBA', testament: 'OT' },
  { name: 'Jonah',            abbrev: 'JON', testament: 'OT' },
  { name: 'Micah',            abbrev: 'MIC', testament: 'OT' },
  { name: 'Nahum',            abbrev: 'NAM', testament: 'OT' },
  { name: 'Habakkuk',         abbrev: 'HAB', testament: 'OT' },
  { name: 'Zephaniah',        abbrev: 'ZEP', testament: 'OT' },
  { name: 'Haggai',           abbrev: 'HAG', testament: 'OT' },
  { name: 'Zechariah',        abbrev: 'ZEC', testament: 'OT' },
  { name: 'Malachi',          abbrev: 'MAL', testament: 'OT' },
  // New Testament
  { name: 'Matthew',          abbrev: 'MAT', testament: 'NT' },
  { name: 'Mark',             abbrev: 'MRK', testament: 'NT' },
  { name: 'Luke',             abbrev: 'LUK', testament: 'NT' },
  { name: 'John',             abbrev: 'JHN', testament: 'NT' },
  { name: 'Acts',             abbrev: 'ACT', testament: 'NT' },
  { name: 'Romans',           abbrev: 'ROM', testament: 'NT' },
  { name: '1 Corinthians',    abbrev: '1CO', testament: 'NT' },
  { name: '2 Corinthians',    abbrev: '2CO', testament: 'NT' },
  { name: 'Galatians',        abbrev: 'GAL', testament: 'NT' },
  { name: 'Ephesians',        abbrev: 'EPH', testament: 'NT' },
  { name: 'Philippians',      abbrev: 'PHP', testament: 'NT' },
  { name: 'Colossians',       abbrev: 'COL', testament: 'NT' },
  { name: '1 Thessalonians',  abbrev: '1TH', testament: 'NT' },
  { name: '2 Thessalonians',  abbrev: '2TH', testament: 'NT' },
  { name: '1 Timothy',        abbrev: '1TI', testament: 'NT' },
  { name: '2 Timothy',        abbrev: '2TI', testament: 'NT' },
  { name: 'Titus',            abbrev: 'TIT', testament: 'NT' },
  { name: 'Philemon',         abbrev: 'PHM', testament: 'NT' },
  { name: 'Hebrews',          abbrev: 'HEB', testament: 'NT' },
  { name: 'James',            abbrev: 'JAS', testament: 'NT' },
  { name: '1 Peter',          abbrev: '1PE', testament: 'NT' },
  { name: '2 Peter',          abbrev: '2PE', testament: 'NT' },
  { name: '1 John',           abbrev: '1JN', testament: 'NT' },
  { name: '2 John',           abbrev: '2JN', testament: 'NT' },
  { name: '3 John',           abbrev: '3JN', testament: 'NT' },
  { name: 'Jude',             abbrev: 'JUD', testament: 'NT' },
  { name: 'Revelation',       abbrev: 'REV', testament: 'NT' },
];

const cache = new Map<string, BookData>();

export async function loadBook(abbrev: string): Promise<BookData> {
  if (cache.has(abbrev)) return cache.get(abbrev)!;
  const mod = await import(`../data/books/${abbrev.toLowerCase()}.json`);
  const book = mod.default as BookData;
  cache.set(abbrev, book);
  return book;
}
