-- CU FDE2 Kanban board database
create table if not exists public.cards (
  id bigint generated always as identity primary key,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  created_at timestamptz not null default now()
);

alter table public.cards enable row level security;

-- The FastAPI backend uses SUPABASE_SECRET_KEY.
-- Do not expose this secret in frontend code or commit it to git.
-- No public RLS policy is needed for this backend-only access pattern.
