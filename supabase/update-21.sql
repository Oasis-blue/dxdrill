-- ===== Update 21: combined personal learning progress =====
-- Run once after update-20.sql. Safe to run again.
-- The browser supplies the current topic -> question ID map because topic membership
-- lives in the question bank, not in the historical answers table.

create or replace function public.my_learning_progress(p_map jsonb)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_map is null or jsonb_typeof(p_map) <> 'object' or length(p_map::text) > 400000 then
    raise exception 'bad topic map';
  end if;
  with topic_questions as (
    select t.key as topic, q.question_id
    from jsonb_each(p_map) t
    cross join lateral jsonb_array_elements_text(t.value) q(question_id)
  ), mcq as (
    select tq.topic, a.question_id, a.correct, a.created_at
    from topic_questions tq
    join public.answers a on a.question_id = tq.question_id
    where a.user_id = auth.uid()
  ), tf as (
    select t.topic_id as topic, t.stem_id, t.answered_count, t.correct_count,
      t.total_count, t.created_at
    from public.tf_attempts t where t.user_id = auth.uid()
  ), mcq_topic as (
    select topic, count(*)::bigint as attempts,
      count(*) filter (where correct)::bigint as correct,
      round(100.0 * count(*) filter (where correct) / nullif(count(*), 0))::int as accuracy
    from mcq group by topic
  ), tf_topic as (
    select topic, count(*)::bigint as stems,
      coalesce(sum(answered_count), 0)::bigint as statements,
      coalesce(sum(correct_count), 0)::bigint as correct,
      case when coalesce(sum(answered_count), 0) = 0 then null
        else round(100.0 * sum(correct_count) / sum(answered_count))::int end as accuracy
    from tf group by topic
  ), topic_rows as (
    select coalesce(m.topic, t.topic) as topic,
      coalesce(m.attempts, 0)::bigint as mcq_attempts,
      coalesce(m.correct, 0)::bigint as mcq_correct,
      m.accuracy as mcq_accuracy,
      coalesce(t.stems, 0)::bigint as tf_stems,
      coalesce(t.statements, 0)::bigint as tf_statements,
      coalesce(t.correct, 0)::bigint as tf_correct,
      t.accuracy as tf_accuracy
    from mcq_topic m full join tf_topic t on t.topic = m.topic
  ), recent as (
    select 'mcq'::text as kind, question_id as item_id, topic,
      1::bigint as answered, (case when correct then 1 else 0 end)::bigint as correct,
      created_at
    from mcq
    union all
    select 'tf', stem_id, topic, answered_count::bigint, correct_count::bigint, created_at
    from tf
  )
  select jsonb_build_object(
    'mcq_attempts', (select count(*) from mcq),
    'mcq_correct', (select count(*) from mcq where correct),
    'mcq_questions', (select count(distinct question_id) from mcq),
    'mcq_accuracy', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where correct) / count(*))::int end from mcq),
    'tf_stems_attempted', (select count(*) from tf),
    'tf_stems_completed', (select count(*) from tf where answered_count = total_count),
    'tf_statements', (select coalesce(sum(answered_count), 0) from tf),
    'tf_correct', (select coalesce(sum(correct_count), 0) from tf),
    'tf_accuracy', (select case when coalesce(sum(answered_count), 0) = 0 then null else round(100.0 * sum(correct_count) / sum(answered_count))::int end from tf),
    'overall_attempts', (select count(*) from mcq) + (select coalesce(sum(answered_count), 0) from tf),
    'overall_correct', (select count(*) from mcq where correct) + (select coalesce(sum(correct_count), 0) from tf),
    'overall_accuracy', (select case when (select count(*) from mcq) + (select coalesce(sum(answered_count), 0) from tf) = 0 then null
      else round(100.0 * ((select count(*) from mcq where correct) + (select coalesce(sum(correct_count), 0) from tf)) /
        ((select count(*) from mcq) + (select coalesce(sum(answered_count), 0) from tf)))::int end),
    'last_activity', greatest((select max(created_at) from mcq), (select max(created_at) from tf)),
    'topics', coalesce((select jsonb_agg(to_jsonb(topic_rows) order by (mcq_attempts + tf_statements) desc, topic) from topic_rows), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(to_jsonb(r) order by created_at desc) from (select * from recent order by created_at desc limit 12) r), '[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.my_learning_progress(jsonb) from public, anon;
grant execute on function public.my_learning_progress(jsonb) to authenticated;
