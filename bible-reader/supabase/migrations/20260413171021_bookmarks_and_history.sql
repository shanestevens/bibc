-- ── Bookmarks ────────────────────────────────────────────────────────────────
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  book_abbrev text not null,
  book_name text not null,
  chapter_num integer not null,
  saved_at timestamptz default now(),
  unique(user_id, book_abbrev, chapter_num)
);

alter table bookmarks enable row level security;

create policy "Users manage own bookmarks"
  on bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Conversation history ──────────────────────────────────────────────────────
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  reference text not null,
  selected_text text not null,
  book_abbrev text not null,
  chapter_num integer not null,
  created_at timestamptz default now()
);

alter table conversations enable row level security;

create policy "Users manage own conversations"
  on conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

alter table conversation_messages enable row level security;

create policy "Users manage own conversation messages"
  on conversation_messages for all
  using (
    auth.uid() = (
      select user_id from conversations where id = conversation_id
    )
  );
