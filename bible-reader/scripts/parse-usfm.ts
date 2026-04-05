#!/usr/bin/env tsx
/**
 * parse-usfm.ts
 * Converts WEB USFM files to structured JSON for the Bible reader.
 * Run: npx tsx scripts/parse-usfm.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const USFM_DIR = path.join(ROOT, 'usfm');
const OUT_DIR = path.join(ROOT, 'src', 'data', 'books');
const SEARCH_OUT = path.join(ROOT, 'public', 'search-index.json');

// All 66 canonical books — key is USFM abbrev, prefix matches filename
const TARGET_BOOKS: Record<string, { name: string; prefix: string }> = {
  GEN: { name: 'Genesis',         prefix: '02-GEN' },
  EXO: { name: 'Exodus',          prefix: '03-EXO' },
  LEV: { name: 'Leviticus',       prefix: '04-LEV' },
  NUM: { name: 'Numbers',         prefix: '05-NUM' },
  DEU: { name: 'Deuteronomy',     prefix: '06-DEU' },
  JOS: { name: 'Joshua',          prefix: '07-JOS' },
  JDG: { name: 'Judges',          prefix: '08-JDG' },
  RUT: { name: 'Ruth',            prefix: '09-RUT' },
  '1SA': { name: '1 Samuel',      prefix: '10-1SA' },
  '2SA': { name: '2 Samuel',      prefix: '11-2SA' },
  '1KI': { name: '1 Kings',       prefix: '12-1KI' },
  '2KI': { name: '2 Kings',       prefix: '13-2KI' },
  '1CH': { name: '1 Chronicles',  prefix: '14-1CH' },
  '2CH': { name: '2 Chronicles',  prefix: '15-2CH' },
  EZR: { name: 'Ezra',            prefix: '16-EZR' },
  NEH: { name: 'Nehemiah',        prefix: '17-NEH' },
  EST: { name: 'Esther',          prefix: '18-EST' },
  JOB: { name: 'Job',             prefix: '19-JOB' },
  PSA: { name: 'Psalms',          prefix: '20-PSA' },
  PRO: { name: 'Proverbs',        prefix: '21-PRO' },
  ECC: { name: 'Ecclesiastes',    prefix: '22-ECC' },
  SNG: { name: 'Song of Songs',   prefix: '23-SNG' },
  ISA: { name: 'Isaiah',          prefix: '24-ISA' },
  JER: { name: 'Jeremiah',        prefix: '25-JER' },
  LAM: { name: 'Lamentations',    prefix: '26-LAM' },
  EZK: { name: 'Ezekiel',         prefix: '27-EZK' },
  DAN: { name: 'Daniel',          prefix: '28-DAN' },
  HOS: { name: 'Hosea',           prefix: '29-HOS' },
  JOL: { name: 'Joel',            prefix: '30-JOL' },
  AMO: { name: 'Amos',            prefix: '31-AMO' },
  OBA: { name: 'Obadiah',         prefix: '32-OBA' },
  JON: { name: 'Jonah',           prefix: '33-JON' },
  MIC: { name: 'Micah',           prefix: '34-MIC' },
  NAM: { name: 'Nahum',           prefix: '35-NAM' },
  HAB: { name: 'Habakkuk',        prefix: '36-HAB' },
  ZEP: { name: 'Zephaniah',       prefix: '37-ZEP' },
  HAG: { name: 'Haggai',          prefix: '38-HAG' },
  ZEC: { name: 'Zechariah',       prefix: '39-ZEC' },
  MAL: { name: 'Malachi',         prefix: '40-MAL' },
  MAT: { name: 'Matthew',         prefix: '70-MAT' },
  MRK: { name: 'Mark',            prefix: '71-MRK' },
  LUK: { name: 'Luke',            prefix: '72-LUK' },
  JHN: { name: 'John',            prefix: '73-JHN' },
  ACT: { name: 'Acts',            prefix: '74-ACT' },
  ROM: { name: 'Romans',          prefix: '75-ROM' },
  '1CO': { name: '1 Corinthians', prefix: '76-1CO' },
  '2CO': { name: '2 Corinthians', prefix: '77-2CO' },
  GAL: { name: 'Galatians',       prefix: '78-GAL' },
  EPH: { name: 'Ephesians',       prefix: '79-EPH' },
  PHP: { name: 'Philippians',     prefix: '80-PHP' },
  COL: { name: 'Colossians',      prefix: '81-COL' },
  '1TH': { name: '1 Thessalonians', prefix: '82-1TH' },
  '2TH': { name: '2 Thessalonians', prefix: '83-2TH' },
  '1TI': { name: '1 Timothy',     prefix: '84-1TI' },
  '2TI': { name: '2 Timothy',     prefix: '85-2TI' },
  TIT: { name: 'Titus',           prefix: '86-TIT' },
  PHM: { name: 'Philemon',        prefix: '87-PHM' },
  HEB: { name: 'Hebrews',         prefix: '88-HEB' },
  JAS: { name: 'James',           prefix: '89-JAS' },
  '1PE': { name: '1 Peter',       prefix: '90-1PE' },
  '2PE': { name: '2 Peter',       prefix: '91-2PE' },
  '1JN': { name: '1 John',        prefix: '92-1JN' },
  '2JN': { name: '2 John',        prefix: '93-2JN' },
  '3JN': { name: '3 John',        prefix: '94-3JN' },
  JUD: { name: 'Jude',            prefix: '95-JUD' },
  REV: { name: 'Revelation',      prefix: '96-REV' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Segment   { text: string; redLetter?: boolean }
interface PoetryLine { level: 1 | 2; segments: Segment[] }

interface ProseVerse  { kind: 'prose';  num: number; segments: Segment[] }
interface PoetryVerse { kind: 'poetry'; num: number; lines: PoetryLine[] }
type AnyVerse = ProseVerse | PoetryVerse;

interface ProseParagraph  { type: 'prose';  heading?: string; description?: string; verses: ProseVerse[] }
interface PoetryParagraph { type: 'poetry'; heading?: string; description?: string; verses: PoetryVerse[] }
type AnyParagraph = ProseParagraph | PoetryParagraph;

interface ChapterData { number: number; paragraphs: AnyParagraph[] }
interface BookData    { name: string; abbrev: string; chapters: ChapterData[] }

// ─── Text preprocessing ───────────────────────────────────────────────────────

/**
 * A "processed line" after all inline markup is extracted into structured tokens.
 * We represent the line as an array of { text, redLetter } segments.
 */
function preprocessLine(raw: string): { marker: string; rest: string } | null {
  const m = raw.match(/^\\([a-zA-Z0-9+]+\*?)(.*)$/);
  if (!m) return null;
  return { marker: m[1], rest: m[2].trim() };
}

/**
 * Strip Strong's number markup from a text fragment:
 *   \w word|strong="H1234"\w*  →  word
 *   \+w word|strong="G5101"\+w* → word
 * Also handles split contractions like  didn'\w t|...\w*  →  didn't
 */
function stripStrongs(text: string): string {
  // \+w word|...\+w* (inside red-letter wj blocks)
  text = text.replace(/\\\+w\s([^|\\]+)\|[^\\]*\\\+w\*/g, '$1');
  // \w word|...\w*
  text = text.replace(/\\w\s([^|\\]+)\|[^\\]*\\w\*/g, '$1');
  // Any remaining \w or \w* artifacts
  text = text.replace(/\\w\s/g, '');
  text = text.replace(/\\w\*/g, '');
  text = text.replace(/\\\+w\s/g, '');
  text = text.replace(/\\\+w\*/g, '');
  return text;
}

/**
 * Remove footnotes and cross-references from a text string.
 * They are always on a single line in WEB USFM.
 *   \f + \fr 1:1 \ft ... \f*
 *   \x + \xo 1:1 \xt ... \x*
 */
function stripNotes(text: string): string {
  // Replace footnotes/cross-refs with a single space to preserve word boundaries
  text = text.replace(/\\f\s\+\s.*?\\f\*/g, ' ');
  text = text.replace(/\\x\s\+\s.*?\\x\*/g, ' ');
  text = text.replace(/\\fe\s.*?\\fe\*/g, ' ');
  return text;
}

/**
 * Parse inline text into segments (splitting on \wj ... \wj* red-letter markers).
 * Input text has already had Strong's numbers stripped.
 */
function parseSegments(text: string): Segment[] {
  // Split on \wj and \wj* to find red-letter sections
  const parts = text.split(/(\\wj\s|\\wj\*)/);

  let inRedLetter = false;
  // Accumulate runs keyed by redLetter flag, merging adjacent same-type runs
  const runs: { text: string; redLetter: boolean }[] = [];

  for (const part of parts) {
    if (part === '\\wj ') { inRedLetter = true; continue; }
    if (part === '\\wj*') { inRedLetter = false; continue; }
    if (!part) continue;

    const last = runs.at(-1);
    if (last && last.redLetter === inRedLetter) {
      last.text += part;  // merge into previous run (preserve spacing)
    } else {
      runs.push({ text: part, redLetter: inRedLetter });
    }
  }

  // Normalize whitespace within each run but don't trim interior spaces
  // (trailing space on a run acts as word separator from the next run)
  const result: Segment[] = [];
  for (let i = 0; i < runs.length; i++) {
    const isFirst = i === 0;
    const isLast = i === runs.length - 1;
    let text = runs[i].text.replace(/\s+/g, ' ');
    if (isFirst) text = text.trimStart();
    if (isLast) text = text.trimEnd();
    if (!text) continue;
    const seg: Segment = { text };
    if (runs[i].redLetter) seg.redLetter = true;
    result.push(seg);
  }
  return result;
}

function cleanText(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseUSFM(usfmRaw: string, bookName: string, abbrev: string): BookData {
  const chapters: ChapterData[] = [];

  let currentChapter: ChapterData | null = null;
  let currentParagraphs: AnyParagraph[] = [];
  let currentPara: AnyParagraph | null = null;

  let currentVerseNum = 0;
  let pendingHeading: string | undefined;
  let pendingDescription: string | undefined;

  // Poetry state
  let inPoetryLine = false;
  let poetryLineLevel: 1 | 2 = 1;
  let poetryLineSegs: Segment[] = [];

  // Prose state
  let proseSegs: Segment[] = [];

  // ── Helpers ──

  function flushPoetryLine() {
    if (!inPoetryLine || poetryLineSegs.length === 0) return;
    if (currentPara?.type === 'poetry') {
      const lastVerse = (currentPara as PoetryParagraph).verses.at(-1);
      if (lastVerse) {
        lastVerse.lines.push({ level: poetryLineLevel, segments: poetryLineSegs });
      }
    }
    poetryLineSegs = [];
    inPoetryLine = false;
  }

  function flushProseVerse() {
    if (currentVerseNum === 0 || proseSegs.length === 0) return;
    if (currentPara?.type === 'prose') {
      (currentPara as ProseParagraph).verses.push({
        kind: 'prose', num: currentVerseNum, segments: proseSegs,
      });
    }
    proseSegs = [];
  }

  function flushCurrentPara() {
    if (!currentPara) return;
    if (currentPara.type === 'prose') flushProseVerse();
    else flushPoetryLine();
    if (currentPara.verses.length > 0) currentParagraphs.push(currentPara);
    currentPara = null;
  }

  function startPara(type: 'prose' | 'poetry') {
    flushCurrentPara();
    if (type === 'prose') {
      currentPara = { type: 'prose', heading: pendingHeading, description: pendingDescription, verses: [] };
    } else {
      currentPara = { type: 'poetry', heading: pendingHeading, description: pendingDescription, verses: [] };
    }
    pendingHeading = undefined;
    pendingDescription = undefined;
  }

  function ensurePara(type: 'prose' | 'poetry') {
    if (!currentPara || currentPara.type !== type) startPara(type);
  }

  function addTextToVerse(segs: Segment[]) {
    if (segs.length === 0) return;
    if (currentPara?.type === 'prose') {
      proseSegs.push(...segs);
    } else if (currentPara?.type === 'poetry' && inPoetryLine) {
      poetryLineSegs.push(...segs);
    }
  }

  function processInlineText(raw: string): Segment[] {
    let text = stripNotes(raw);
    text = stripStrongs(text);
    return parseSegments(text);
  }

  // ── Main line loop ──

  const lines = usfmRaw.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parsed = preprocessLine(line);

    if (!parsed) {
      // Continuation text (rare in WEB)
      if (currentVerseNum > 0) addTextToVerse(processInlineText(line));
      continue;
    }

    const { marker, rest } = parsed;

    // ── Skip header / metadata markers ──
    if (['id','usfm','ide','sts','rem','h','toc1','toc2','toc3',
         'mt','mt1','mt2','mt3','imt','imt1','is','ip','cl','cp',
         'ca','ca*','va','va*','vp','vp*'].includes(marker)) continue;

    // ── Chapter ──
    if (marker === 'c') {
      flushCurrentPara();
      if (currentChapter) {
        currentChapter.paragraphs = currentParagraphs;
        chapters.push(currentChapter);
      }
      currentChapter = { number: parseInt(rest, 10), paragraphs: [] };
      currentParagraphs = [];
      currentVerseNum = 0;
      proseSegs = [];
      poetryLineSegs = [];
      inPoetryLine = false;
      continue;
    }

    if (!currentChapter) continue; // skip pre-book content

    // ── Verse ──
    if (marker === 'v') {
      const vm = rest.match(/^(\d+)(?:-\d+)?\s*(.*)/);
      if (!vm) continue;
      const newNum = parseInt(vm[1], 10);
      const inlineText = vm[2];

      // Flush current verse
      if (currentPara?.type === 'prose') {
        flushProseVerse();
      } else if (currentPara?.type === 'poetry') {
        flushPoetryLine();
      }

      currentVerseNum = newNum;

      if (!currentPara) startPara('prose');

      if (currentPara.type === 'poetry') {
        // Add verse container — lines will be added by subsequent \q markers or inline text
        (currentPara as PoetryParagraph).verses.push({ kind: 'poetry', num: newNum, lines: [] });
        // If there's inline text after \v in a poetry paragraph, it starts the first line
        if (inlineText) {
          inPoetryLine = true;
          addTextToVerse(processInlineText(inlineText));
        }
      } else {
        // prose — start collecting
        proseSegs = [];
        if (inlineText) proseSegs.push(...processInlineText(inlineText));
      }
      continue;
    }

    // ── Prose paragraph markers ──
    if (['p', 'pi', 'pi1', 'pi2'].includes(marker)) {
      startPara('prose');
      if (rest && currentVerseNum > 0) proseSegs.push(...processInlineText(rest));
      continue;
    }
    if (['m', 'mi', 'pm', 'pmo', 'pmc'].includes(marker)) {
      ensurePara('prose');
      if (rest && currentVerseNum > 0) proseSegs.push(...processInlineText(rest));
      continue;
    }

    // ── Poetry paragraph markers ──
    if (marker === 'q' || marker === 'q1' || marker === 'qc' || marker === 'qm' || marker === 'qm1') {
      flushPoetryLine();
      ensurePara('poetry');
      poetryLineLevel = 1;
      if (rest && currentVerseNum > 0) {
        const lastVerse = (currentPara as PoetryParagraph).verses.at(-1);
        if (lastVerse) {
          inPoetryLine = true;
          addTextToVerse(processInlineText(rest));
        }
      }
      continue;
    }
    if (marker === 'q2' || marker === 'qm2') {
      flushPoetryLine();
      ensurePara('poetry');
      poetryLineLevel = 2;
      if (rest && currentVerseNum > 0) {
        const lastVerse = (currentPara as PoetryParagraph).verses.at(-1);
        if (lastVerse) {
          inPoetryLine = true;
          addTextToVerse(processInlineText(rest));
        }
      }
      continue;
    }
    if (marker === 'q3' || marker === 'qm3') {
      flushPoetryLine();
      ensurePara('poetry');
      poetryLineLevel = 2; // render q3 as q2 visually
      if (rest && currentVerseNum > 0) {
        const lastVerse = (currentPara as PoetryParagraph).verses.at(-1);
        if (lastVerse) {
          inPoetryLine = true;
          addTextToVerse(processInlineText(rest));
        }
      }
      continue;
    }

    // ── Blank line between poetry stanzas ──
    if (marker === 'b') {
      flushPoetryLine();
      continue;
    }

    // ── Section headings ──
    if (['s', 's1', 's2', 's3', 'ms', 'ms1', 'ms2'].includes(marker)) {
      pendingHeading = rest || undefined;
      continue;
    }

    // ── Speaker labels ──
    if (marker === 'sp') {
      pendingHeading = rest || undefined;
      continue;
    }

    // ── Psalm description ──
    if (marker === 'd') {
      pendingDescription = rest || undefined;
      continue;
    }

    // ── List items ──
    if (['li', 'li1', 'li2'].includes(marker)) {
      ensurePara('prose');
      if (rest && currentVerseNum > 0) proseSegs.push(...processInlineText(rest));
      continue;
    }

    // ── Selah (\qs) ──
    if (marker === 'qs' || marker === 'qs*') {
      if (rest && currentVerseNum > 0) addTextToVerse(processInlineText(rest));
      continue;
    }

    // ── Character markers that wrap text on the same line ──
    // (these appear as \marker text — the text is the rest of the line)
    const charMarkers = ['em','em*','bd','bd*','it','it*','bdit','bdit*',
      'nd','nd*','sc','sc*','add','add*','sls','sls*','tl','tl*',
      'w*','+w*','wh','wh*','+wh','+wh*',
      'rq','rq*','sig','sig*','pn','pn*','ord','ord*'];
    if (charMarkers.includes(marker)) {
      if (rest && currentVerseNum > 0) addTextToVerse(processInlineText(rest));
      continue;
    }

    // ── Paragraph continuation with inline text ──
    // If the line starts with a known structural marker but has text, add it
    if (rest && currentVerseNum > 0 && currentPara) {
      // Don't add text from unknown markers we haven't explicitly handled
      // to avoid garbage. Only handle known text-bearing markers.
    }
  }

  // Flush final state
  flushCurrentPara();
  if (currentChapter) {
    currentChapter.paragraphs = currentParagraphs;
    chapters.push(currentChapter);
  }

  // Clean up: remove empty paragraphs and chapters
  const cleanChapters = chapters
    .filter(ch => ch.number > 0)
    .map(ch => ({
      ...ch,
      paragraphs: ch.paragraphs
        .filter(p => p.verses.length > 0)
        .map(p => {
          if (p.type === 'poetry') {
            // Remove poetry verses with no lines
            return { ...p, verses: (p as PoetryParagraph).verses.filter(v => v.lines.length > 0) };
          }
          return p;
        })
        .filter(p => p.verses.length > 0),
    }))
    .filter(ch => ch.paragraphs.length > 0);

  return { name: bookName, abbrev, chapters: cleanChapters };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface SearchEntry {
  a: string;   // abbrev e.g. "GEN"
  n: string;   // book name e.g. "Genesis"
  c: number;   // chapter number
  v: number;   // verse number
  t: string;   // verse text (plain)
}

function verseText(verse: ProseVerse | PoetryVerse): string {
  if (verse.kind === 'prose') {
    return verse.segments.map(s => s.text).join('').trim();
  } else {
    return verse.lines.map(l => l.segments.map(s => s.text).join('')).join(' ').trim();
  }
}

let parsed = 0;
let failed = 0;
const searchEntries: SearchEntry[] = [];

for (const [abbrev, { name, prefix }] of Object.entries(TARGET_BOOKS)) {
  const files = fs.readdirSync(USFM_DIR);
  const filename = files.find(f => f.startsWith(prefix) && f.endsWith('.usfm'));

  if (!filename) {
    console.error(`✗ USFM file not found for ${abbrev} (prefix: ${prefix})`);
    failed++;
    continue;
  }

  const filePath = path.join(USFM_DIR, filename);
  try {
    console.log(`Parsing ${name} from ${filename}...`);
    const usfm = fs.readFileSync(filePath, 'utf8');
    const book = parseUSFM(usfm, name, abbrev);

    const outFile = path.join(OUT_DIR, `${abbrev.toLowerCase()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(book, null, 2));

    // Accumulate search entries
    for (const ch of book.chapters) {
      for (const para of ch.paragraphs) {
        for (const verse of para.verses) {
          const t = verseText(verse as ProseVerse | PoetryVerse);
          if (t) {
            searchEntries.push({ a: abbrev, n: name, c: ch.number, v: verse.num, t });
          }
        }
      }
    }

    const totalVerses = book.chapters.reduce(
      (sum, ch) => sum + ch.paragraphs.reduce((s, p) => s + p.verses.length, 0), 0
    );
    console.log(`  ✓ ${book.chapters.length} chapters, ${totalVerses} verses → ${path.basename(outFile)}`);
    parsed++;
  } catch (err) {
    console.error(`  ✗ Failed to parse ${name}:`, err);
    failed++;
  }
}

// Write search index
fs.mkdirSync(path.dirname(SEARCH_OUT), { recursive: true });
fs.writeFileSync(SEARCH_OUT, JSON.stringify(searchEntries));
console.log(`\nSearch index: ${searchEntries.length} verses → ${SEARCH_OUT}`);

console.log(`Done: ${parsed} books parsed, ${failed} failed.`);
