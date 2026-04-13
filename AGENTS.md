# Bible Reader App - Codex Project Guide

## Vision

This app is a modern, beautifully formatted Bible reader that uses AI to make scripture approachable for people exploring or returning to faith. The core interaction is simple: read like a real book, highlight anything confusing, ask a plain-language question, and get a warm, clear explanation.

The reading experience comes first. AI is a companion feature that appears when needed and stays out of the way otherwise.

## Product Principles

- Formatting is everything. The Bible text must feel like a printed Bible, not a verse-per-line database dump.
- Keep the tone warm, patient, and non-preachy. Think knowledgeable friend over coffee, not pulpit lecture.
- Mobile-first. Most use will be on phones and tablets, so touch targets, bottom sheets, and swipe navigation matter.
- Performance matters. Book data is pre-parsed JSON and lazy-loaded by book; do not introduce runtime USFM parsing.
- Respect the text. Avoid gamification, social mechanics, or noisy chrome unless the user explicitly asks for them.

## Current Stack

- React + TypeScript + Vite
- Tailwind CSS v4 via `@tailwindcss/vite`
- Global product styling in `bible-reader/src/index.css`
- Static World English Bible data in `bible-reader/src/data/books`
- Search index in `bible-reader/public/search-index.json`
- Anthropic Claude API for passage explanations
- Supabase for auth, bookmarks, usage quota, and question history
- Netlify Functions for production `/api/ask`
- Express server for local development `/api/ask`
- Vite PWA plugin for install/offline behavior

Do not rename or replace the app's runtime Claude integration just because this file is for Codex. Treat the Anthropic API as the current product implementation unless the user asks for a model/provider migration.

## Important Paths

```text
bible-reader/
  src/
    App.tsx                         # Mounts the app
    main.tsx                        # React entry point
    index.css                       # Main global styling and theme rules
    components/
      BibleReader.tsx               # Main app orchestration
      ChapterView.tsx               # Renders a formatted chapter
      ProseParagraph.tsx            # Prose paragraph rendering
      PoetryParagraph.tsx           # Poetry line rendering
      VerseNumber.tsx               # Superscript verse numbers
      SelectionButton.tsx           # Floating ask/bookmark action on text selection
      AskPanel.tsx                  # Bottom-sheet AI conversation UI
      SearchModal.tsx               # Search UI
      SettingsPanel.tsx             # Theme/text size UI
      BookmarksPanel.tsx            # Saved passages
      HistoryPanel.tsx              # Saved AI conversation history
      AuthModal.tsx                 # Sign-in and quota prompt
      UserMenu.tsx                  # Logged-in account menu
      DebugMenu.tsx                 # Dev-only quota/debug helpers
    hooks/
      useTextSelection.ts           # Text selection capture and reference building
      useConversation.ts            # AI chat state, anon quota, Supabase history saving
      useBookmarks.ts               # Bookmarks and last reading position
      useHistory.ts                 # Conversation history loading/deletion
      useAuth.ts                    # Supabase auth wrappers
      useSearch.ts                  # Static search index hook
      useSettings.ts                # Local theme/font-size settings
    lib/
      books.ts                      # Book metadata and lazy imports
      bible-api.ts                  # Client fetch/SSE wrapper for /api/ask
      supabase.ts                   # Browser Supabase client
      types.ts                      # Bible data types
    data/books/                     # Generated per-book JSON
  server/index.ts                   # Local Express API proxy
  netlify/functions/ask.js          # Production Netlify function
  supabase/migrations/              # Auth-related database schema and quota RPC
  scripts/parse-usfm.ts             # USFM -> JSON/search-index parser
  scripts/check-data.cjs            # Generated data sanity check
  netlify.toml                      # Netlify build/functions/redirects
```

## Data Model

The app uses pre-parsed WEB USFM data. Each book is lazy-loaded as JSON from `src/data/books` via `loadBook()` in `src/lib/books.ts`.

Current rendered data shape is richer than the original brief:

```ts
interface BookData {
  name: string;
  abbrev: string;
  chapters: ChapterData[];
}

interface ChapterData {
  number: number;
  paragraphs: AnyParagraph[];
}

type AnyParagraph = ProseParagraph | PoetryParagraph;

interface ProseParagraph {
  type: 'prose';
  heading?: string;
  description?: string;
  verses: ProseVerse[];
}

interface PoetryParagraph {
  type: 'poetry';
  heading?: string;
  description?: string;
  verses: PoetryVerse[];
}

interface ProseVerse {
  kind: 'prose';
  num: number;
  segments: Segment[];
}

interface PoetryVerse {
  kind: 'poetry';
  num: number;
  lines: PoetryLine[];
}

interface Segment {
  text: string;
  redLetter?: boolean;
}
```

Only edit generated book JSON directly for a narrow emergency. Prefer changing `scripts/parse-usfm.ts` and regenerating data when parser behavior needs to change.

## AI Flow

1. `useTextSelection` captures selected text inside the reading area.
2. It builds a reference from verse elements with `data-verse-num`.
3. `SelectionButton` lets the user ask about or bookmark the passage.
4. `AskPanel` opens as a bottom sheet and calls `useConversation`.
5. `useConversation` builds the first user message with selected text and reference.
6. `bible-api.ts` posts the message history to `/api/ask`.
7. Local dev uses `server/index.ts`; production uses `netlify/functions/ask.js`.
8. Logged-in conversations are saved to Supabase conversation tables.

The system prompt must keep answers passage-focused. Off-topic questions should be declined warmly and redirected to the selected passage.

## Auth, Quota, And Persistence

- Supabase auth supports Google, Facebook, Apple, and magic-link email.
- Anonymous users get a localStorage question counter.
- Logged-in users have a monthly free quota enforced server-side through the `increment_usage` Supabase RPC.
- Bookmarks and question history are Supabase-backed for logged-in users.
- Reading position, settings, and anonymous count are localStorage-backed.

The server uses `SUPABASE_SERVICE_ROLE_KEY` only in server-side code. Never expose it in client code.

## Local Commands

Run from `bible-reader/`:

```bash
npm run dev        # Vite dev server
npm run server     # Local Express /api/ask proxy
npm run dev:full   # Server + Vite together
npm run build      # TypeScript + Vite production build
npm run lint       # ESLint
npm run parse      # Regenerate Bible JSON/search index from usfm/
node scripts/check-data.cjs
```

Environment variables for local AI/auth work live in `.env.local`:

```text
ANTHROPIC_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Current Quality Notes

As of this guide, `npm run build` passes and `node scripts/check-data.cjs` reports `0 issues found`.

`npm run lint` is currently red from a mix of React Hooks lint rules and small cleanup items, including:

- unused parser/server variables
- synchronous state updates inside effects
- a missing `auth.user` memo dependency in `BibleReader.tsx`
- `messagesRef.current = messages` during render in `useConversation.ts`
- an empty `catch {}` in `useSettings.ts`

If the user asks for cleanup, fix these carefully without changing product behavior.

## UI Guidance

- Keep scripture typography serif and UI typography sans-serif.
- Preserve the parchment/light-dark theme variables unless doing a deliberate redesign.
- Keep the main reading column around the existing max-width and line-height.
- Do not convert prose into one verse per line.
- Poetry indentation must preserve `q1`/`q2` visual hierarchy.
- Keep bottom-sheet interactions mobile-friendly.
- Avoid adding large new UI frameworks or unrelated component systems.

## Codex Working Notes

- Read the relevant component/hook before editing; this app is compact but stateful.
- Be careful with the dirty worktree. There are active changes around Netlify, Supabase, auth, bookmarks, and history.
- Prefer focused edits over broad refactors.
- Run `npm run build` after behavior changes. Run `npm run lint` when touching hook/component patterns, but know it may already fail until the current lint debt is addressed.
- Do not commit, reset, or discard user changes unless the user explicitly asks.
