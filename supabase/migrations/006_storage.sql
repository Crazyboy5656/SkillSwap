-- ============================================================
-- Migration 006: Storage bucket policies
-- SkillSwap V2
-- Run AFTER 005_seed.sql
-- ============================================================

-- NOTE: Create buckets manually in the Supabase dashboard first:
--   1. avatars      — public: true
--   2. attachments  — public: false
-- Then run this migration to set up storage RLS policies.

-- ─── avatars bucket ──────────────────────────────────────────
-- Public read (already handled by the bucket being public)
-- Authenticated users can upload to their own folder only

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload avatars scoped to their UID folder
create policy "avatars_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── attachments bucket ──────────────────────────────────────
create policy "attachments_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
