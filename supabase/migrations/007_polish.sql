-- ============================================================
-- Migration 007: Reports table RLS & Block user visibility
-- SkillSwap V2
-- Run AFTER 006_storage.sql
-- ============================================================

-- Already created blocks + reports in 001_schema.sql
-- This migration adds the RLS policy to hide blocked users from listing queries
-- and enables full text search on skills/listings.

-- ─── Hide blocked users from profiles select ─────────────────
-- Drop the permissive "select all" policy and replace with a filtered one
drop policy if exists "profiles_select_all" on public.profiles;

create policy "profiles_select_no_blocked"
  on public.profiles for select
  using (
    -- Auth users cannot see profiles they have blocked or who blocked them
    case
      when auth.uid() is null then true  -- anon users see all
      else not exists (
        select 1 from public.blocks
        where (blocker_id = auth.uid() and blocked_id = id)
           or (blocker_id = id and blocked_id = auth.uid())
      )
    end
  );

-- ─── Hide blocked users from user_skills ─────────────────────
drop policy if exists "user_skills_select_active" on public.user_skills;

create policy "user_skills_select_active"
  on public.user_skills for select
  using (
    (is_active = true or user_id = auth.uid())
    and case
      when auth.uid() is null then true
      else not exists (
        select 1 from public.blocks
        where (blocker_id = auth.uid() and blocked_id = user_id)
           or (blocker_id = user_id and blocked_id = auth.uid())
      )
    end
  );

-- ─── pg_trgm extension for search ────────────────────────────
create extension if not exists pg_trgm;

-- GIN indexes for fast ilike search on skills + user_skills
create index if not exists skills_name_trgm_idx
  on public.skills using gin (name gin_trgm_ops);

create index if not exists user_skills_title_trgm_idx
  on public.user_skills using gin (title gin_trgm_ops);
