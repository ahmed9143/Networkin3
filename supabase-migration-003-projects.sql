-- ============================================================
-- Migration 003: Projects Module (Phase 2)
-- ------------------------------------------------------------
-- Adds: public.projects, public.project_devices, public.project_gallery
-- Follows the exact conventions used in supabase-setup-FINAL.sql:
--   - public read where content is meant to be public-facing
--   - "authenticated" (admin) required for all writes
--   - drop policy if exists before create, so this is safely re-runnable
--   - gen_random_uuid() ids, timestamptz timestamps
-- Safe to run: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS,
-- no destructive statements.
-- ============================================================

-- ============================================================
-- 1) Projects (case studies / portfolio)
-- ============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                -- SEO URL, e.g. /projects/bank-nvr-rollout
  title text not null,
  summary text,
  description text,
  category text,                            -- CCTV | Networking | Access Control | Structured Cabling ...
  status text not null default 'draft',     -- draft | published
  customer_name text,
  customer_logo_url text,
  location_text text,
  location_lat numeric(9,6),
  location_lng numeric(9,6),
  engineer_name text,
  cover_image_url text,
  before_image_url text,
  after_image_url text,
  timeline jsonb default '[]'::jsonb,       -- [{ "label": "...", "date": "...", "note": "..." }]
  boq jsonb default '[]'::jsonb,            -- [{ "item": "...", "qty": 1, "unit_price": 0 }]
  related_product_ids uuid[] default '{}',
  featured boolean default false,
  pdf_url text,
  views int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;
drop policy if exists "Public read published projects" on public.projects;
drop policy if exists "Auth manage projects" on public.projects;

create policy "Public read published projects" on public.projects
  for select using (status = 'published' or auth.role() = 'authenticated');
create policy "Auth manage projects" on public.projects for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_projects_slug on public.projects (slug);
create index if not exists idx_projects_category on public.projects (category);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_projects_featured on public.projects (featured) where featured = true;

-- keep updated_at current on edit, same pattern the project should use elsewhere
create or replace function public.touch_projects_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.touch_projects_updated_at();

-- ============================================================
-- 2) Project gallery (multiple images per project)
-- ============================================================
create table if not exists public.project_gallery (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.project_gallery enable row level security;
drop policy if exists "Public read project gallery" on public.project_gallery;
drop policy if exists "Auth manage project gallery" on public.project_gallery;

create policy "Public read project gallery" on public.project_gallery
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.status = 'published' or auth.role() = 'authenticated')
    )
  );
create policy "Auth manage project gallery" on public.project_gallery for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_project_gallery_project on public.project_gallery (project_id);

-- ============================================================
-- 3) Project devices (equipment installed, links to Phase 4 asset mgmt)
-- ============================================================
create table if not exists public.project_devices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  device_name text not null,
  quantity int not null default 1,
  serial_number text,
  notes text,
  created_at timestamptz default now()
);

alter table public.project_devices enable row level security;
drop policy if exists "Auth read project devices" on public.project_devices;
drop policy if exists "Auth manage project devices" on public.project_devices;

-- device/serial detail stays admin-only (not public), unlike the project itself
create policy "Auth read project devices" on public.project_devices
  for select using (auth.role() = 'authenticated');
create policy "Auth manage project devices" on public.project_devices for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_project_devices_project on public.project_devices (project_id);
create index if not exists idx_project_devices_product on public.project_devices (product_id);

-- ============================================================
-- 4) view counter (matches the low-privilege RPC pattern already used
--    for public write-only actions elsewhere in this project, e.g.
--    order_rate_limit inserts via SECURITY DEFINER function)
-- ============================================================
create or replace function public.increment_project_views(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects set views = views + 1
  where slug = p_slug and status = 'published';
end;
$$;

grant execute on function public.increment_project_views(text) to anon, authenticated;
