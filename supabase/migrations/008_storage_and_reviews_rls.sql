-- ============================================================
-- Storage: avatar policies using stable name prefix (auth.uid)
-- Reviews: require completed session that matches role semantics
-- Run AFTER 006_storage.sql
-- ============================================================

-- ─── avatars: replace foldername() checks with name LIKE ─────
drop policy if exists "avatars_upload_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "avatars_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like (auth.uid()::text || '/%')
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like (auth.uid()::text || '/%')
  )
  with check (
    bucket_id = 'avatars'
    and name like (auth.uid()::text || '/%')
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like (auth.uid()::text || '/%')
  );

-- ─── reviews: direct insert only with matching completed session
drop policy if exists "reviews_insert_participant" on public.reviews;
drop policy if exists "reviews_insert_self" on public.reviews;

create policy "reviews_insert_with_completed_session"
  on public.reviews for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and reviewer_id <> reviewee_id
    and session_id is not null
    and (
      (role = 'as_tutor' and exists (
        select 1 from public.sessions s
        where s.id = session_id
          and s.status = 'completed'
          and s.tutor_id = reviewee_id
          and s.learner_id = auth.uid()
      ))
      or
      (role = 'as_student' and exists (
        select 1 from public.sessions s
        where s.id = session_id
          and s.status = 'completed'
          and s.learner_id = reviewee_id
          and s.tutor_id = auth.uid()
      ))
    )
  );
