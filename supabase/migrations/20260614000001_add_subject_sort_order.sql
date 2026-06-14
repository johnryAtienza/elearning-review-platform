-- Add admin-managed ordering for subjects across landing, portal, and admin UIs.

alter table public.subjects
  add column if not exists sort_order integer not null default 0;
