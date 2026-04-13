create table user_usage (
  user_id uuid references auth.users(id) on delete cascade,
  month text not null,
  question_count integer not null default 0,
  primary key (user_id, month)
);

alter table user_usage enable row level security;

create policy "Users can view own usage"
  on user_usage for select
  using (auth.uid() = user_id);
