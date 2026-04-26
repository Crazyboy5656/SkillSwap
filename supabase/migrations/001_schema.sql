-- ============================================================
-- Migration 001: Schema
-- SkillSwap V2 — Supabase / PostgreSQL
-- Run this in the Supabase SQL editor FIRST.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";    -- for auto-completing sessions

-- ─── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  handle               text unique not null,
  display_name         text,
  bio                  text,
  avatar_url           text,
  location             text,
  tutor_rating         numeric(3,2) not null default 0 check (tutor_rating >= 0 and tutor_rating <= 5),
  tutor_reviews_count  int         not null default 0,
  learner_rating       numeric(3,2) not null default 0 check (learner_rating >= 0 and learner_rating <= 5),
  learner_reviews_count int        not null default 0,
  last_seen_at         timestamptz,
  onboarded            bool        not null default false,
  created_at           timestamptz not null default now()
);

create index if not exists profiles_handle_idx on public.profiles (lower(handle));

-- ─── categories ──────────────────────────────────────────────
create table if not exists public.categories (
  id    smallserial primary key,
  slug  text unique not null,
  name  text        not null,
  icon  text        not null default 'category'
);

-- ─── skills ──────────────────────────────────────────────────
create table if not exists public.skills (
  id          uuid primary key default gen_random_uuid(),
  category_id smallint    not null references public.categories(id) on delete restrict,
  name        text unique not null,
  slug        text unique not null,
  created_at  timestamptz not null default now()
);

create index if not exists skills_category_idx on public.skills (category_id);

-- ─── user_skills ─────────────────────────────────────────────
create table if not exists public.user_skills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  skill_id    uuid        not null references public.skills(id) on delete cascade,
  kind        text        not null check (kind in ('teach', 'learn')),
  level       smallint             check (level between 1 and 5),
  title       text,
  description text,
  mode        text        not null default 'both' check (mode in ('online', 'in_person', 'both')),
  location    text,
  is_active   bool        not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, skill_id, kind)
);

create index if not exists user_skills_skill_kind_idx on public.user_skills (skill_id, kind, is_active);
create index if not exists user_skills_user_idx       on public.user_skills (user_id);

-- ─── match_requests ──────────────────────────────────────────
create table if not exists public.match_requests (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references public.profiles(id) on delete cascade,
  to_user     uuid not null references public.profiles(id) on delete cascade,
  from_skill  uuid not null references public.user_skills(id) on delete cascade,
  to_skill    uuid not null references public.user_skills(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at  timestamptz not null default now(),
  unique (from_user, to_user, from_skill, to_skill),
  check (from_user <> to_user)
);

create index if not exists match_requests_to_user_idx   on public.match_requests (to_user, status);
create index if not exists match_requests_from_user_idx on public.match_requests (from_user, status);

-- ─── matches ─────────────────────────────────────────────────
create table if not exists public.matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.profiles(id) on delete cascade,
  user_b     uuid not null references public.profiles(id) on delete cascade,
  skill_a    uuid not null references public.user_skills(id) on delete cascade,
  skill_b    uuid not null references public.user_skills(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b, skill_a, skill_b),
  check (user_a < user_b)
);

create index if not exists matches_user_a_idx on public.matches (user_a);
create index if not exists matches_user_b_idx on public.matches (user_b);

-- ─── messages ────────────────────────────────────────────────
create table if not exists public.messages (
  id             bigserial primary key,
  match_id       uuid         not null references public.matches(id) on delete cascade,
  sender_id      uuid         not null references public.profiles(id) on delete cascade,
  body           text         not null check (length(trim(body)) > 0 or attachment_url is not null),
  attachment_url text,
  created_at     timestamptz  not null default now(),
  read_at        timestamptz
);

create index if not exists messages_match_created_idx on public.messages (match_id, created_at desc);
create index if not exists messages_sender_idx        on public.messages (sender_id);

-- ─── sessions ────────────────────────────────────────────────
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid         not null references public.matches(id) on delete cascade,
  tutor_id     uuid         not null references public.profiles(id) on delete cascade,
  learner_id   uuid         not null references public.profiles(id) on delete cascade,
  skill_id     uuid         not null references public.skills(id)   on delete cascade,
  title        text,
  starts_at    timestamptz  not null,
  duration_min int          not null default 60 check (duration_min > 0),
  mode         text         not null check (mode in ('online', 'in_person')),
  location     text,
  status       text         not null default 'proposed' check (status in ('proposed','confirmed','completed','cancelled')),
  proposed_by  uuid         not null references public.profiles(id) on delete cascade,
  created_at   timestamptz  not null default now()
);

create index if not exists sessions_match_idx     on public.sessions (match_id);
create index if not exists sessions_tutor_idx     on public.sessions (tutor_id);
create index if not exists sessions_learner_idx   on public.sessions (learner_id);
create index if not exists sessions_starts_at_idx on public.sessions (starts_at);

-- ─── reviews ─────────────────────────────────────────────────
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid         not null references public.sessions(id) on delete cascade,
  reviewer_id  uuid         not null references public.profiles(id) on delete cascade,
  reviewee_id  uuid         not null references public.profiles(id) on delete cascade,
  role         text         not null check (role in ('as_student','as_tutor')),
  rating       smallint     not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz  not null default now(),
  unique (session_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id);

-- ─── notifications ───────────────────────────────────────────
create table if not exists public.notifications (
  id         bigserial primary key,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  type       text        not null,
  payload    jsonb       not null default '{}',
  read       bool        not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_read_idx on public.notifications (user_id, read, created_at desc);

-- ─── blocks ──────────────────────────────────────────────────
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ─── reports ─────────────────────────────────────────────────
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (length(trim(reason)) > 0),
  resolved    bool not null default false,
  created_at  timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
