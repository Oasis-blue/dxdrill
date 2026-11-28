-- ===== Update 22: signed-in review of previously missed MCQs =====
-- Run once after update-21.sql. Safe to run again.
-- Returns question IDs and aggregate history only; question text and explanations
-- remain in the current question bank. Only the authenticated learner's rows are read.

create or replace function public.my_review_mistakes()
returns table (
  question_id text,
  attempts bigint,
  wrong_attempts bigint,
  last_attempt_correct boolean,
  last_attempt_at timestamptz
)
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  return query
    select a.question_id,
      count(*)::bigint as attempts,
      count(*) filter (where not a.correct)::bigint as wrong_attempts,
      (array_agg(a.correct order by a.created_at desc, a.id desc))[1] as last_attempt_correct,
      max(a.created_at) as last_attempt_at
    from public.answers a
    where a.user_id = auth.uid()
    group by a.question_id
    having bool_or(not a.correct)
    order by max(a.created_at) desc
    limit 500;
end $$;

revoke all on function public.my_review_mistakes() from public, anon;
grant execute on function public.my_review_mistakes() to authenticated;
