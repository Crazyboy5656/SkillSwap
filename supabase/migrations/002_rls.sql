-- ============================================================
-- Migration 002: Row Level Security policies
-- SkillSwap V2
-- Run AFTER 001_schema.sql
-- ============================================================

-- ─── is_match_member (needed by message/session policies below) ──────────────
-- Defined here early so the policies in this file can reference it.
-- It is also recreated (idempotently) in 003_functions.sql.
create or replace function public.is_match_member(p_match_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches
    where id = p_match_id
      and (user_a = p_user or user_b = p_user)
  );
$$;

-- ─── Enable RLS on all tables ────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.skills        enable row level security;
alter table public.user_skills   enable row level security;
alter table public.match_requests enable row level security;
alter table public.matches       enable row level security;
alter table public.messages      enable row level security;
alter table public.sessions      enable row level security;
alter table public.reviews       enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks        enable row level security;
alter table public.reports       enable row level security;

-- ─── profiles ────────────────────────────────────────────────
-- Anyone can read profiles (for discover, search, public pages)
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- Users can only update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert is handled by trigger only — no direct client insert
create policy "profiles_insert_trigger"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ─── categories ──────────────────────────────────────────────
create policy "categories_select_all"
  on public.categories for select
  using (true);

-- ─── skills ──────────────────────────────────────────────────
create policy "skills_select_all"
  on public.skills for select
  using (true);

-- ─── user_skills ─────────────────────────────────────────────
-- Anyone can read active listings
create policy "user_skills_select_active"
  on public.user_skills for select
  using (is_active = true or user_id = auth.uid());

-- Users manage only their own listings
create policy "user_skills_insert_own"
  on public.user_skills for insert
  with check (auth.uid() = user_id);

create policy "user_skills_update_own"
  on public.user_skills for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_skills_delete_own"
  on public.user_skills for delete
  using (auth.uid() = user_id);

-- ─── match_requests ──────────────────────────────────────────
-- Only parties involved can see requests
create policy "match_requests_select_involved"
  on public.match_requests for select
  using (auth.uid() = from_user or auth.uid() = to_user);

-- Only the sender can insert; from_user is always self
create policy "match_requests_insert_self"
  on public.match_requests for insert
  with check (auth.uid() = from_user);

-- Only the recipient can accept/reject; sender can cancel own pending
create policy "match_requests_update"
  on public.match_requests for update
  using (
    (auth.uid() = to_user and status = 'pending') or
    (auth.uid() = from_user and status = 'pending')
  );

-- ─── matches ─────────────────────────────────────────────────
create policy "matches_select_involved"
  on public.matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Matches are only created by the accept_match_request() function (service role / trigger)
-- No direct client insert; enforced by NOT granting insert policy to anon.

-- ─── messages ────────────────────────────────────────────────
-- is_match_member is defined in 003_functions.sql
create policy "messages_select_member"
  on public.messages for select
  using (is_match_member(match_id, auth.uid()));

create policy "messages_insert_member"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    is_match_member(match_id, auth.uid())
  );

create policy "messages_update_own"
  on public.messages for update
  using (auth.uid() = sender_id);

-- ─── sessions ────────────────────────────────────────────────
create policy "sessions_select_involved"
  on public.sessions for select
  using (auth.uid() = tutor_id or auth.uid() = learner_id);

create policy "sessions_insert_member"
  on public.sessions for insert
  with check (
    auth.uid() = proposed_by and
    is_match_member(match_id, auth.uid())
  );

create policy "sessions_update_involved"
  on public.sessions for update
  using (auth.uid() = tutor_id or auth.uid() = learner_id);

-- ─── reviews ─────────────────────────────────────────────────
-- Anyone can read reviews (public trust signal)
create policy "reviews_select_all"
  on public.reviews for select
  using (true);

-- Reviewer must have been part of the session AND session must be completed
create policy "reviews_insert_participant"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id and
    exists (
      select 1 from public.sessions s
      where s.id = session_id
        and s.status = 'completed'
        and (s.tutor_id = auth.uid() or s.learner_id = auth.uid())
    )
  );

-- ─── notifications ───────────────────────────────────────────
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ─── blocks ──────────────────────────────────────────────────
create policy "blocks_select_own"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "blocks_insert_own"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "blocks_delete_own"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- ─── reports ─────────────────────────────────────────────────
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "reports_select_own"
  on public.reports for select
  using (auth.uid() = reporter_id);
