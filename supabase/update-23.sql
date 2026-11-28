-- ===== Update 23: personal learning analytics =====
-- Run after update-22.sql. Safe to run again; reads existing answer history only.
create or replace function public.my_learning_analytics(p_map jsonb)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare result jsonb; today_local date := (now() at time zone 'Africa/Lagos')::date;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_map is null or jsonb_typeof(p_map) <> 'object' or length(p_map::text) > 400000 then raise exception 'bad topic map'; end if;
  with topic_questions as (
    select t.key as topic, q.question_id from jsonb_each(p_map) t cross join lateral jsonb_array_elements_text(t.value) q(question_id)
  ), activity as (
    select a.created_at, (a.created_at at time zone 'Africa/Lagos')::date as day, tq.topic, 'mcq'::text as kind, 1::bigint as answered, (case when a.correct then 1 else 0 end)::bigint as correct
    from public.answers a join topic_questions tq on tq.question_id = a.question_id where a.user_id = auth.uid() and a.created_at >= now() - interval '28 days'
    union all
    select t.created_at, (t.created_at at time zone 'Africa/Lagos')::date, t.topic_id, 'tf', t.answered_count::bigint, t.correct_count::bigint
    from public.tf_attempts t where t.user_id = auth.uid() and t.created_at >= now() - interval '28 days'
  ), days as (
    select generate_series(today_local - 13, today_local, interval '1 day')::date as day
  ), daily as (
    select d.day, coalesce(sum(a.answered),0)::bigint as responses, coalesce(sum(a.correct),0)::bigint as correct,
      coalesce(sum(a.answered) filter (where a.kind='mcq'),0)::bigint as mcq_responses,
      coalesce(sum(a.answered) filter (where a.kind='tf'),0)::bigint as tf_statements
    from days d left join activity a on a.day=d.day group by d.day
  ), topic_periods as (
    select topic, sum(answered) filter (where day >= today_local - 13)::bigint as current_responses,
      sum(correct) filter (where day >= today_local - 13)::bigint as current_correct,
      sum(answered) filter (where day < today_local - 13)::bigint as previous_responses,
      sum(correct) filter (where day < today_local - 13)::bigint as previous_correct
    from activity group by topic
  ), topic_rows as (
    select topic, coalesce(current_responses,0)::bigint as current_responses, coalesce(previous_responses,0)::bigint as previous_responses,
      case when coalesce(current_responses,0)=0 then null else round(100.0*current_correct/current_responses)::int end as current_accuracy,
      case when coalesce(previous_responses,0)=0 then null else round(100.0*previous_correct/previous_responses)::int end as previous_accuracy
    from topic_periods
  )
  select jsonb_build_object(
    'daily', coalesce((select jsonb_agg(to_jsonb(daily) order by day) from daily),'[]'::jsonb),
    'topics', coalesce((select jsonb_agg(to_jsonb(topic_rows) order by current_responses desc, topic) from topic_rows),'[]'::jsonb),
    'responses_7d', coalesce((select sum(responses) from daily where day >= today_local - 6),0),
    'active_days_14d', (select count(*) from daily where responses > 0),
    'responses_14d', coalesce((select sum(responses) from daily),0)
  ) into result;
  return result;
end $$;
revoke all on function public.my_learning_analytics(jsonb) from public, anon;
grant execute on function public.my_learning_analytics(jsonb) to authenticated;
