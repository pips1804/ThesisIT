-- Manuscripts
create table if not exists public.manuscripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  filename text not null,
  storage_path text not null,
  extracted_text text not null default '',
  file_size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists manuscripts_user_id_idx on public.manuscripts (user_id);

alter table public.manuscripts enable row level security;

create policy "Users manage own manuscripts"
  on public.manuscripts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Analysis reports
create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  overall_summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists analysis_reports_manuscript_idx
  on public.analysis_reports (manuscript_id, created_at desc);

alter table public.analysis_reports enable row level security;

create policy "Users manage own analysis reports"
  on public.analysis_reports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Chat history (one row per manuscript conversation)
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manuscript_id, user_id)
);

alter table public.chat_history enable row level security;

create policy "Users manage own chat history"
  on public.chat_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Mock defense sessions
create table if not exists public.defense_sessions (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  score numeric,
  summary text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists defense_sessions_manuscript_idx
  on public.defense_sessions (manuscript_id, created_at desc);

alter table public.defense_sessions enable row level security;

create policy "Users manage own defense sessions"
  on public.defense_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Panelist revisions
create table if not exists public.panelist_revisions (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  panelist_comments text not null,
  revised_sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists panelist_revisions_manuscript_idx
  on public.panelist_revisions (manuscript_id, created_at desc);

alter table public.panelist_revisions enable row level security;

create policy "Users manage own panelist revisions"
  on public.panelist_revisions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Private storage bucket for PDFs (server uploads via service role)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'manuscripts',
  'manuscripts',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
