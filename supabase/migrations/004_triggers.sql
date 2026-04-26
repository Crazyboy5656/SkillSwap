-- ============================================================
-- Migration 004: Triggers
-- SkillSwap V2
-- Run AFTER 003_functions.sql
-- ============================================================

-- ─── 1. Auto-create profile on user signup ───────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
  counter      int := 0;
begin
  -- Generate handle from email (part before @), sanitized
  base_handle := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if length(base_handle) < 3 then
    base_handle := 'user' || substring(new.id::text, 1, 6);
  end if;
  final_handle := base_handle;

  -- Ensure handle uniqueness
  loop
    exit when not exists (select 1 from public.profiles where handle = final_handle);
    counter := counter + 1;
    final_handle := base_handle || counter::text;
  end loop;

  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    final_handle,
    coalesce(new.raw_user_meta_data->>'display_name', final_handle),
    null
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 2. Recompute aggregate ratings after review insert ──────
create or replace function public.update_profile_ratings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Role 'as_tutor' means the reviewee acted as tutor → update tutor stats
  if new.role = 'as_tutor' then
    update public.profiles
    set
      tutor_rating = (
        select round(avg(rating)::numeric, 2)
        from public.reviews
        where reviewee_id = new.reviewee_id and role = 'as_tutor'
      ),
      tutor_reviews_count = (
        select count(*) from public.reviews
        where reviewee_id = new.reviewee_id and role = 'as_tutor'
      )
    where id = new.reviewee_id;
  else
    -- 'as_student' → learner stats
    update public.profiles
    set
      learner_rating = (
        select round(avg(rating)::numeric, 2)
        from public.reviews
        where reviewee_id = new.reviewee_id and role = 'as_student'
      ),
      learner_reviews_count = (
        select count(*) from public.reviews
        where reviewee_id = new.reviewee_id and role = 'as_student'
      )
    where id = new.reviewee_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_review_inserted on public.reviews;
create trigger on_review_inserted
  after insert on public.reviews
  for each row execute procedure public.update_profile_ratings();

-- ─── 3. Notification on new match request ────────────────────
create or replace function public.notify_match_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, payload)
    values (
      new.to_user,
      'match_request',
      jsonb_build_object(
        'request_id', new.id,
        'from_user', new.from_user,
        'from_skill', new.from_skill,
        'to_skill', new.to_skill
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_match_request_created on public.match_requests;
create trigger on_match_request_created
  after insert on public.match_requests
  for each row execute procedure public.notify_match_request();

-- ─── 4. Notification on match_request rejection ──────────────
create or replace function public.notify_match_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'rejected' and old.status = 'pending' then
    insert into public.notifications (user_id, type, payload)
    values (
      new.from_user,
      'match_rejected',
      jsonb_build_object('request_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_match_request_updated on public.match_requests;
create trigger on_match_request_updated
  after update on public.match_requests
  for each row execute procedure public.notify_match_response();

-- ─── 5. Notification on new message ──────────────────────────
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other_user uuid;
begin
  -- Find the other participant of the match
  select case when user_a = new.sender_id then user_b else user_a end
  into v_other_user
  from public.matches
  where id = new.match_id;

  insert into public.notifications (user_id, type, payload)
  values (
    v_other_user,
    'new_message',
    jsonb_build_object(
      'match_id', new.match_id,
      'sender_id', new.sender_id,
      'preview', left(new.body, 80)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_message_inserted on public.messages;
create trigger on_message_inserted
  after insert on public.messages
  for each row execute procedure public.notify_new_message();

-- ─── 6. Notification on session proposed / confirmed ─────────
create or replace function public.notify_session_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notif_user uuid;
  v_type       text;
begin
  if new.status = 'proposed' and (old is null or old.status is distinct from 'proposed') then
    -- Notify the OTHER party (not the proposer)
    if new.proposed_by = new.tutor_id then
      v_notif_user := new.learner_id;
    else
      v_notif_user := new.tutor_id;
    end if;
    v_type := 'session_proposed';
  elsif new.status = 'confirmed' and old.status = 'proposed' then
    v_notif_user := new.proposed_by;
    v_type := 'session_confirmed';
  else
    return new;
  end if;

  insert into public.notifications (user_id, type, payload)
  values (
    v_notif_user,
    v_type,
    jsonb_build_object('session_id', new.id, 'match_id', new.match_id)
  );
  return new;
end;
$$;

drop trigger if exists on_session_insert on public.sessions;
create trigger on_session_insert
  after insert on public.sessions
  for each row execute procedure public.notify_session_change();

drop trigger if exists on_session_update on public.sessions;
create trigger on_session_update
  after update on public.sessions
  for each row execute procedure public.notify_session_change();

-- ─── 7. Notification on review received ──────────────────────
create or replace function public.notify_review_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  values (
    new.reviewee_id,
    'review_received',
    jsonb_build_object(
      'session_id', new.session_id,
      'rating', new.rating,
      'reviewer_id', new.reviewer_id
    )
  );
  return new;
end;
$$;

drop trigger if exists on_review_created on public.reviews;
create trigger on_review_created
  after insert on public.reviews
  for each row execute procedure public.notify_review_received();

-- ─── 8. pg_cron: auto-complete sessions 1h after end ─────────
-- Requires pg_cron extension. Run once; idempotent.
select cron.schedule(
  'auto-complete-sessions',
  '*/15 * * * *',   -- every 15 minutes
  $$
    update public.sessions
    set status = 'completed'
    where status = 'confirmed'
      and (starts_at + (duration_min * interval '1 minute') + interval '1 hour') < now();
  $$
);
