-- Atomically increment usage and enforce the monthly limit.
-- Raises an exception with 'QUOTA_EXCEEDED' if the user is at or over the limit.
create or replace function increment_usage(
  p_user_id uuid,
  p_month text,
  p_limit integer
) returns void
language plpgsql
security definer
as $$
declare
  current_count integer;
begin
  -- Upsert the row, initialising count to 0 if first question this month
  insert into user_usage (user_id, month, question_count)
  values (p_user_id, p_month, 0)
  on conflict (user_id, month) do nothing;

  -- Lock the row and read current count
  select question_count into current_count
  from user_usage
  where user_id = p_user_id and month = p_month
  for update;

  if current_count >= p_limit then
    raise exception 'QUOTA_EXCEEDED';
  end if;

  update user_usage
  set question_count = question_count + 1
  where user_id = p_user_id and month = p_month;
end;
$$;
