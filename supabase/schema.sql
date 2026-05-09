-- ============================================================================
-- 2026 Japan Trip Planner — Supabase schema
-- Run this in Supabase SQL Editor (or via `supabase db push`).
-- ============================================================================

-- Required extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- trips: a single trip identified by a short shareable code
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null check (char_length(code) between 4 and 12),
  title       text not null default '일본 여행',
  start_date  date,
  end_date    date,
  cover_color text default '#0ea5e9',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- days: one row per calendar day inside a trip
-- ---------------------------------------------------------------------------
create table if not exists public.days (
  id        uuid primary key default gen_random_uuid(),
  trip_id   uuid not null references public.trips(id) on delete cascade,
  date      date not null,
  position  int  not null default 0,
  title     text,
  created_at timestamptz not null default now(),
  unique (trip_id, date)
);
create index if not exists days_trip_idx on public.days(trip_id, position);

-- ---------------------------------------------------------------------------
-- blocks: vertical slots inside a day. Each block has 1+ candidates.
-- selected_candidate_id points to the candidate currently chosen.
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  id                    uuid primary key default gen_random_uuid(),
  day_id                uuid not null references public.days(id) on delete cascade,
  position              int  not null default 0,
  selected_candidate_id uuid,
  created_at            timestamptz not null default now()
);
create index if not exists blocks_day_idx on public.blocks(day_id, position);

-- ---------------------------------------------------------------------------
-- candidates: horizontal-slide options inside a block
-- type: 'move' (이동) | 'place' (장소) | 'other' (기타)
-- ---------------------------------------------------------------------------
create table if not exists public.candidates (
  id          uuid primary key default gen_random_uuid(),
  block_id    uuid not null references public.blocks(id) on delete cascade,
  position    int  not null default 0,
  type        text not null check (type in ('move','place','other')),
  title       text not null default '',
  description text,
  start_time  time,
  end_time    time,
  -- type-specific fields stored loosely:
  --   place: { address, mapUrl, cost, tags[] }
  --   move:  { from, to, transport, durationMin, cost }
  --   other: { ... free form ... }
  meta        jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists candidates_block_idx on public.candidates(block_id, position);

alter table public.blocks
  drop constraint if exists blocks_selected_candidate_fk;
alter table public.blocks
  add constraint blocks_selected_candidate_fk
  foreign key (selected_candidate_id) references public.candidates(id) on delete set null;

-- ---------------------------------------------------------------------------
-- photos: trip-wide photo log. Optionally tied to a day or block.
-- The actual file lives in Storage bucket 'trip-photos'.
-- ---------------------------------------------------------------------------
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  day_id       uuid references public.days(id) on delete set null,
  block_id     uuid references public.blocks(id) on delete set null,
  storage_path text not null,
  caption      text,
  uploader     text,
  taken_at     timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists photos_trip_idx on public.photos(trip_id, taken_at desc);

-- ---------------------------------------------------------------------------
-- participants: lightweight presence (who is part of this trip)
-- ---------------------------------------------------------------------------
create table if not exists public.participants (
  id        uuid primary key default gen_random_uuid(),
  trip_id   uuid not null references public.trips(id) on delete cascade,
  name      text not null,
  color     text not null default '#0ea5e9',
  joined_at timestamptz not null default now(),
  unique (trip_id, name)
);

-- ============================================================================
-- Row Level Security
-- We use a "trip code = password" model rather than auth.users — anyone with
-- the code can read/write that trip. We rely on the anon API key + table
-- scoping. To keep RLS happy without per-user identity, we enable RLS and
-- allow all anon CRUD. (Tighten later if you add real auth.)
-- ============================================================================
alter table public.trips        enable row level security;
alter table public.days         enable row level security;
alter table public.blocks       enable row level security;
alter table public.candidates   enable row level security;
alter table public.photos       enable row level security;
alter table public.participants enable row level security;

do $$
declare t text;
begin
  foreach t in array array['trips','days','blocks','candidates','photos','participants'] loop
    execute format('drop policy if exists "anon all" on public.%I', t);
    execute format(
      'create policy "anon all" on public.%I for all to anon using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ============================================================================
-- Realtime: publish all five tables
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['trips','days','blocks','candidates','photos','participants'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================================
-- Storage bucket for photos
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', true)
on conflict (id) do nothing;

drop policy if exists "anon read photos" on storage.objects;
drop policy if exists "anon write photos" on storage.objects;
drop policy if exists "anon update photos" on storage.objects;
drop policy if exists "anon delete photos" on storage.objects;

create policy "anon read photos"
  on storage.objects for select to anon
  using (bucket_id = 'trip-photos');

create policy "anon write photos"
  on storage.objects for insert to anon
  with check (bucket_id = 'trip-photos');

create policy "anon update photos"
  on storage.objects for update to anon
  using (bucket_id = 'trip-photos');

create policy "anon delete photos"
  on storage.objects for delete to anon
  using (bucket_id = 'trip-photos');
