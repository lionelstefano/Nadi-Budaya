-- Nadi Budaya V10 — minimal schema for server-side service-role access.
-- Run this in Supabase SQL Editor. Keep the bucket private.
create table if not exists public.nadi_participant_states (
  participant_id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nadi_participant_states enable row level security;
revoke all on table public.nadi_participant_states from anon, authenticated;
grant all on table public.nadi_participant_states to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nadi-performances',
  'nadi-performances',
  false,
  20971520,
  array['video/webm', 'video/mp4']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array['video/webm', 'video/mp4'];

-- No anon/authenticated policies are added. Server-only service_role calls are used
-- to issue signed uploads/downloads and manipulate the private bucket.
