-- Private storage bucket + RLS policies for chat uploads.
-- Run in Supabase SQL editor.

-- 1) Create bucket (private)
insert into storage.buckets (id, name, public)
values ('chat-uploads', 'chat-uploads', false)
on conflict (id) do update set public = false;

-- 2) Policies on storage.objects
-- We store files under: chat-uploads/<user_id>/<file>
-- Only authenticated users can manage their own objects.

drop policy if exists "Chat uploads read own files" on storage.objects;
drop policy if exists "Chat uploads insert own files" on storage.objects;
drop policy if exists "Chat uploads update own files" on storage.objects;
drop policy if exists "Chat uploads delete own files" on storage.objects;

create policy "Chat uploads read own files"
on storage.objects for select
using (
  bucket_id = 'chat-uploads'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Chat uploads insert own files"
on storage.objects for insert
with check (
  bucket_id = 'chat-uploads'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Chat uploads update own files"
on storage.objects for update
using (
  bucket_id = 'chat-uploads'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chat-uploads'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Chat uploads delete own files"
on storage.objects for delete
using (
  bucket_id = 'chat-uploads'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

