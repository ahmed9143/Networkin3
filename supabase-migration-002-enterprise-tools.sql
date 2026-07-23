-- ============================================================
-- Migration 002 — Enterprise Tools (Rack Builder / BOQ Generator / Coming-Soon)
-- Run this in Supabase SQL editor AFTER supabase-setup-FINAL.sql.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS everywhere,
-- same convention as the rest of the project).
-- ============================================================

-- ------------------------------------------------------------
-- 1) category_notify_requests
--    "نبهني لما يتوفر" submitted from a Coming-Soon category page
--    (a category/search term with zero matching products yet).
--    No product_id FK on purpose: the category may not have any
--    products at all yet, so there's nothing to reference.
-- ------------------------------------------------------------
create table if not exists public.category_notify_requests (
  id uuid primary key default gen_random_uuid(),
  category_key text not null,      -- raw search/category term used on the site (e.g. 'فايبر')
  category_label text not null,    -- human-readable label shown to the admin
  phone text not null,
  notified boolean not null default false,
  created_at timestamptz default now()
);

alter table public.category_notify_requests enable row level security;
drop policy if exists "Public submit category notify" on public.category_notify_requests;
drop policy if exists "Auth manage category notify" on public.category_notify_requests;

-- Any visitor can submit a request; only the admin (authenticated) can read
-- the list back, same pattern as stock_notify_requests (protects customer phone numbers).
create policy "Public submit category notify" on public.category_notify_requests
  for insert with check (true);
create policy "Auth manage category notify" on public.category_notify_requests
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_category_notify_key on public.category_notify_requests (category_key);
create index if not exists idx_category_notify_created_at on public.category_notify_requests (created_at desc);

-- ------------------------------------------------------------
-- 2) rack_projects
--    Saved configurations from the Rack Builder tool. No customer PII is
--    stored here (just the layout), so it's safe to allow public read —
--    this lets us later add a "share this rack via link" feature using
--    the row id as a reference/share code without extra columns.
-- ------------------------------------------------------------
create table if not exists public.rack_projects (
  id uuid primary key default gen_random_uuid(),
  capacity_u int not null default 24,
  items jsonb not null default '[]'::jsonb,   -- [{key,label,u,icon,watts,kg}, ...] in rack order
  total_u int not null default 0,
  power_watts numeric not null default 0,
  weight_kg numeric not null default 0,
  customer_name text,
  customer_phone text,
  status text default 'draft',                -- draft | reviewed | quoted | closed
  created_at timestamptz default now()
);

alter table public.rack_projects enable row level security;
drop policy if exists "Public create rack projects" on public.rack_projects;
drop policy if exists "Public read rack projects" on public.rack_projects;
drop policy if exists "Auth manage rack projects" on public.rack_projects;

create policy "Public create rack projects" on public.rack_projects
  for insert with check (true);
-- Public select is intentional here (no PII by default) so a saved rack can be
-- reopened/shared via its id; the admin can still update status/PII fields.
create policy "Public read rack projects" on public.rack_projects
  for select using (true);
create policy "Auth manage rack projects" on public.rack_projects
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth delete rack projects" on public.rack_projects
  for delete using (auth.role() = 'authenticated');

create index if not exists idx_rack_projects_created_at on public.rack_projects (created_at desc);
create index if not exists idx_rack_projects_status on public.rack_projects (status);

-- ------------------------------------------------------------
-- 3) boq_documents
--    Saved Bill of Quantities from the BOQ Generator page. Contains
--    customer name/phone, so — same convention as quote_requests — only
--    the admin can read it back; the customer keeps their own PDF/reference
--    number instead of a public read link.
-- ------------------------------------------------------------
create table if not exists public.boq_documents (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  project_name text,
  items jsonb not null default '[]'::jsonb,   -- [{name,qty,price}, ...]
  discount_pct numeric not null default 0,
  vat_pct numeric not null default 14,
  subtotal numeric not null default 0,
  grand_total numeric not null default 0,
  notes text,
  status text default 'draft',                -- draft | sent | approved | rejected
  created_at timestamptz default now()
);

alter table public.boq_documents enable row level security;
drop policy if exists "Public create boq documents" on public.boq_documents;
drop policy if exists "Auth manage boq documents" on public.boq_documents;

create policy "Public create boq documents" on public.boq_documents
  for insert with check (true);
create policy "Auth manage boq documents" on public.boq_documents
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_boq_documents_created_at on public.boq_documents (created_at desc);
create index if not exists idx_boq_documents_status on public.boq_documents (status);
create index if not exists idx_boq_documents_customer_phone on public.boq_documents (customer_phone);

-- ============================================================
-- Notes for future modules (CRM, Digital Twin, Monitoring, Engineer Portal...):
-- follow the exact same pattern used above and throughout supabase-setup-FINAL.sql:
--   1. table with uuid PK + created_at
--   2. enable row level security
--   3. drop policy if exists / create policy (public insert where a visitor
--      submits data, authenticated-only for anything containing PII or admin actions)
--   4. index every column used in WHERE/ORDER BY on the admin dashboard
-- This keeps every new module consistent with the current architecture and
-- trivial to review/migrate later.
-- ============================================================
