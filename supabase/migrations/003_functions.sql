-- ============================================================
-- Migration 003: Functions & RPCs
-- SkillSwap V2
-- Run AFTER 002_rls.sql
-- ============================================================

-- ─── is_match_member ─────────────────────────────────────────
-- Security-definer helper used in RLS policies for messages & sessions.
-- Returns true if p_user is user_a or user_b of the match.
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

-- ─── find_matches ────────────────────────────────────────────
-- Returns candidates who complement the calling user:
--   • My teach-skills match their want-to-learn skills
--   • Their teach-skills match my want-to-learn skills
-- Filters out users already matched or blocked.
create or replace function public.find_matches(p_user uuid, p_limit int default 20)
returns table (
  other_user  uuid,
  my_skill    uuid,   -- user_skills.id I am offering
  their_skill uuid,   -- user_skills.id they are offering to me
  score       numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with my_teach as (
    select id as user_skill_id, skill_id
    from public.user_skills
    where user_id = p_user and kind = 'teach' and is_active
  ),
  my_learn as (
    select id as user_skill_id, skill_id
    from public.user_skills
    where user_id = p_user and kind = 'learn' and is_active
  ),
  blocked_ids as (
    select blocked_id as uid from public.blocks where blocker_id = p_user
    union
    select blocker_id as uid from public.blocks where blocked_id = p_user
  ),
  matched_users as (
    select case when user_a = p_user then user_b else user_a end as uid
    from public.matches
    where user_a = p_user or user_b = p_user
  )
  select
    us_want.user_id                                    as other_user,
    mt.user_skill_id                                   as my_skill,
    us_offer.id                                        as their_skill,
    coalesce(p.tutor_rating,0) + coalesce(p.learner_rating,0) as score
  from my_teach mt
  -- They want something I teach
  join public.user_skills us_want
    on us_want.skill_id = mt.skill_id
   and us_want.kind = 'learn'
   and us_want.user_id <> p_user
   and us_want.is_active
  -- They also teach something I want
  join my_learn ml
    on true
  join public.user_skills us_offer
    on us_offer.skill_id = ml.skill_id
   and us_offer.kind = 'teach'
   and us_offer.user_id = us_want.user_id
   and us_offer.is_active
  join public.profiles p on p.id = us_want.user_id
  -- Exclude blocked users
  where us_want.user_id not in (select uid from blocked_ids)
  -- Exclude already-matched users
    and us_want.user_id not in (select uid from matched_users)
  order by score desc nulls last
  limit p_limit;
$$;

-- ─── accept_match_request ────────────────────────────────────
-- Atomically:
--   1. Update match_request status to 'accepted'
--   2. Insert a matches row (with user_a < user_b invariant)
--   3. Insert notifications for both parties
-- Called by RPC from the frontend.
create or replace function public.accept_match_request(p_request_id uuid)
returns uuid   -- returns the new match id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req       match_requests;
  v_match_id  uuid;
  v_a         uuid;
  v_b         uuid;
  v_skill_a   uuid;
  v_skill_b   uuid;
begin
  -- Load and lock the request row
  select * into v_req
  from public.match_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Match request not found or already processed';
  end if;

  -- Only the recipient can accept
  if auth.uid() <> v_req.to_user then
    raise exception 'Permission denied';
  end if;

  -- Enforce user_a < user_b ordering
  if v_req.from_user < v_req.to_user then
    v_a := v_req.from_user; v_b := v_req.to_user;
    v_skill_a := v_req.from_skill; v_skill_b := v_req.to_skill;
  else
    v_a := v_req.to_user;   v_b := v_req.from_user;
    v_skill_a := v_req.to_skill;   v_skill_b := v_req.from_skill;
  end if;

  -- Create the match (idempotent)
  insert into public.matches (user_a, user_b, skill_a, skill_b)
  values (v_a, v_b, v_skill_a, v_skill_b)
  on conflict (user_a, user_b, skill_a, skill_b) do nothing
  returning id into v_match_id;

  if v_match_id is null then
    select id into v_match_id from public.matches
    where user_a = v_a and user_b = v_b
      and skill_a = v_skill_a and skill_b = v_skill_b;
  end if;

  -- Update request
  update public.match_requests
  set status = 'accepted'
  where id = p_request_id;

  -- Notify both parties
  insert into public.notifications (user_id, type, payload)
  values
    (v_req.from_user, 'match_accepted', jsonb_build_object('match_id', v_match_id, 'request_id', p_request_id)),
    (v_req.to_user,   'match_accepted', jsonb_build_object('match_id', v_match_id, 'request_id', p_request_id));

  return v_match_id;
end;
$$;

-- ─── get_unread_notification_count ───────────────────────────
create or replace function public.get_unread_notification_count()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select count(*) from public.notifications
  where user_id = auth.uid() and read = false;
$$;
