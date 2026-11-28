-- DxDrill Phase 6: account-synchronised spaced-repetition card schedules.
-- Run once in Supabase SQL Editor. Safe to run again.

create table if not exists public.card_reviews (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id text not null check (char_length(card_id) between 1 and 300),
  card_kind text not null check (card_kind in ('term','question')),
  topic_id text not null check (char_length(topic_id) between 1 and 160),
  box_no smallint not null default 0 check (box_no between 0 and 6),
  due_date date not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.card_reviews enable row level security;
drop policy if exists card_reviews_read_own on public.card_reviews;
create policy card_reviews_read_own on public.card_reviews for select to authenticated using (auth.uid() = user_id);
drop policy if exists card_reviews_insert_own on public.card_reviews;
create policy card_reviews_insert_own on public.card_reviews for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists card_reviews_update_own on public.card_reviews;
create policy card_reviews_update_own on public.card_reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.card_reviews to authenticated;
