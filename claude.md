# Bible Reader App — Claude Code Project Brief

## Vision
A modern, beautifully formatted Bible reader that uses AI to make scripture approachable for people exploring or returning to faith. The core interaction: read like a real book, highlight anything confusing, ask plain-language questions, and get warm, clear explanations — like a knowledgeable friend sitting beside you.

## Core Concept
- Bible text rendered with **print-quality formatting** — paragraph breaks, poetry indentation (Psalms, Proverbs), section headings, prose flow — NOT one-verse-per-line database dumps
- **Highlight-and-ask**: select any text, get a panel with suggested questions and free-form input, powered by Claude API
- Conversational follow-up: users can ask iterative deepening questions ("but why would that matter to people at the time?")
- Tone: warm, patient, non-preachy. Like explaining over coffee, not lecturing from a pulpit

## Tech Stack
- **React + TypeScript + Vite**
- **Tailwind CSS** for styling
- **Anthropic Claude API** for AI explanations (claude-sonnet-4-20250514)
- Mobile-first responsive design (this will primarily be used on phones/tablets)

## Data Pipeline

### Source: USFM Files
- Start with the **World English Bible (WEB)** — public domain, modern English
- USFM source files available from ebible.org (engwebp_usfm.zip)
- USFM is the Bible publishing standard with formatting metadata:
  - `\p` — paragraph breaks
  - `\q1`, `\q2` — poetry indentation levels
  - `\s` — section headings
  - `\d` — psalm descriptions/attributions
  - `\wj ...\wj*` — words of Jesus (red letter)

### Parse Pipeline
- Build a USFM → JSON parser (or use existing: `usfm-js` npm package)
- Output structured JSON per book with this shape:

```typescript
interface BibleBook {
  name: string;           // "Genesis"
  abbrev: string;         // "GEN"
  chapters: Chapter[];
}

interface Chapter {
  number: number;
  heading?: string;       // section heading from USFM \s
  paragraphs: Paragraph[];
}

interface Paragraph {
  type: 'prose' | 'poetry';
  verses: Verse[];
}

interface Verse {
  num: number;
  text?: string;          // prose verses
  lines?: string[];       // poetry verses (one per indent level)
  redLetter?: boolean;    // words of Jesus
}
```

- Pre-parse all 66 books to static JSON at build time, NOT at runtime
- Store as individual book JSON files for code-splitting/lazy loading

## UI Design

### Aesthetic
- Warm, cream/parchment palette — NOT clinical white
- Serif font for scripture text (Crimson Pro or similar)
- Sans-serif for UI elements (Source Sans 3 or similar)
- Feels like a quality printed Bible, not a tech app
- Minimal chrome — the text is the hero

### Layout
- **Top nav**: Book selector (dropdown) + chapter selector
- **Reading area**: max-width ~640px, generous padding, proper line-height (1.8+)
- **Hint bar**: subtle "highlight text to ask" prompt
- Prose paragraphs: text-indent on first line, flowing verses within paragraphs
- Poetry: indented with hanging indent, indent levels matching USFM \q depth
- Verse numbers: small superscript, muted colour, non-intrusive
- Section headings: italic, centred, lighter weight
- Chapter/book headings: elegant, minimal

### Highlight-and-Ask Panel
- Slides up from bottom on text selection
- Shows: selected text preview, reference (e.g. "John 1:3-5")
- Suggested quick questions: "What does this mean?", "Historical context?", "Explain simply", "Why is this significant?"
- Free-form text input for custom questions
- Response area with conversational AI answer
- Follow-up question capability (maintain conversation context)

### Navigation
- Book picker: grouped by Old/New Testament
- Chapter grid: simple numbered buttons
- Swipe left/right for next/previous chapter (mobile)
- Reading progress indicator (optional)

## AI Integration

### System Prompt for Explanations
```
You are a warm, knowledgeable Bible study companion. The reader has highlighted a passage and has a question. Answer in a warm, clear, accessible way. Keep it concise — 2-3 short paragraphs max. Include historical or cultural context where helpful. Don't be preachy or devotional — be like a knowledgeable friend explaining over coffee. If relevant, mention how the original Hebrew or Greek sheds light on meaning. Reference related passages briefly if they illuminate the point.
```

### API Call Structure
- Send: selected text, full reference (book/chapter/verse range), user's question
- Include surrounding context (full chapter or nearby verses) for better answers
- Maintain conversation history for follow-up questions within a session
- Handle errors gracefully with friendly messages

## Project Structure
```
bible-reader/
├── src/
│   ├── components/
│   │   ├── BibleReader.tsx        # Main reader layout
│   │   ├── ChapterView.tsx        # Renders formatted chapter
│   │   ├── ProseParagraph.tsx     # Prose verse rendering
│   │   ├── PoetryParagraph.tsx    # Poetry verse rendering
│   │   ├── VerseNumber.tsx        # Superscript verse numbers
│   │   ├── BookPicker.tsx         # Book selection UI
│   │   ├── ChapterNav.tsx         # Chapter navigation
│   │   └── AskPanel.tsx           # Highlight-and-ask AI panel
│   ├── data/
│   │   └── books/                 # Pre-parsed JSON per book
│   ├── lib/
│   │   ├── usfm-parser.ts        # USFM → structured JSON
│   │   ├── bible-api.ts           # Claude API integration
│   │   └── types.ts               # TypeScript interfaces
│   ├── hooks/
│   │   ├── useTextSelection.ts    # Text highlight detection
│   │   └── useConversation.ts     # AI chat state management
│   └── App.tsx
├── scripts/
│   └── parse-usfm.ts             # Build-time USFM parsing script
├── usfm/                          # Raw USFM source files (gitignored)
└── package.json
```

## Phase 1 — MVP
1. USFM parser: download WEB USFM, parse to structured JSON with paragraph/poetry formatting
2. Reader UI: render Genesis, Psalms, and John with proper formatting as proof of concept
3. Highlight detection: text selection triggers ask panel
4. AI integration: Claude API for passage explanation with suggested + free-form questions
5. Basic navigation: book/chapter selection

## Phase 2 — Polish
1. All 66 books parsed and loadable
2. Search functionality
3. Bookmarks / reading history (local storage)
4. Reading plans
5. Cross-reference links (when AI mentions related passages, make them tappable)
6. Dark mode / reading mode options
7. Font size controls
8. Offline support (PWA with cached book data)

## Key Principles
- **Formatting is everything** — the #1 differentiator. If it reads like a verse-per-line database, it's failed. It must feel like a printed Bible.
- **AI is the companion, not the feature** — the reading experience comes first. AI is there when you need it, invisible when you don't.
- **Mobile-first** — most people will read on their phone. Touch targets, swipe nav, bottom-sheet panels.
- **Performance** — lazy-load books, pre-parsed JSON, no runtime parsing. Instant chapter transitions.
- **Respect the text** — no gamification, no streaks, no social features in v1. Just beautiful reading with understanding on demand.
