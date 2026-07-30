-- ============================================================
-- Migration 004: Digital Passport (QR) for Projects & Rack Devices
-- ------------------------------------------------------------
-- Builds on top of migration 003 (public.projects, public.project_gallery,
-- public.project_devices). Adds:
--   - passport_enabled flag on projects (only these are QR/publicly viewable)
--   - warranty + maintenance fields + a stable qr_token per device
--   - public.device_maintenance_log (history shown on the passport)
--   - two SECURITY DEFINER RPCs, safe for anon (QR scanners are anonymous):
--       get_project_passport(p_slug)   -> whole project passport (no serials)
--       get_device_by_qr(p_token)      -> single device (rack scanner lookup)
--   - a public storage bucket for project gallery images
-- Idempotent: safe to re-run, no destructive statements.
-- ============================================================

-- 1) Projects: passport visibility flag ------------------------------------
alter table public.projects
  add column if not exists passport_enabled boolean not null default false;

-- 2) Project devices: warranty / maintenance / QR token ---------------------
alter table public.project_devices
  add column if not exists warranty_until date,
  add column if not exists last_maintenance_date date,
  add column if not exists maintenance_notes text,
  add column if not exists qr_token uuid not null default gen_random_uuid(),
  add column if not exists device_type text; -- e.g. switch | patch_panel | ups | nvr | camera | router | other

create unique index if not exists idx_project_devices_qr_token on public.project_devices (qr_token);

-- 3) Maintenance log (history entries shown on the device/project passport) -
create table if not exists public.device_maintenance_log (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.project_devices(id) on delete cascade,
  performed_at date not null default current_date,
  summary text not null,
  engineer_name text,
  created_at timestamptz default now()
);

alter table public.device_maintenance_log enable row level security;
drop policy if exists "Auth manage maintenance log" on public.device_maintenance_log;
create policy "Auth manage maintenance log" on public.device_maintenance_log for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- no public select policy here on purpose: public access only goes through
-- the SECURITY DEFINER RPCs below, which hand back a curated field list.

create index if not exists idx_maint_log_device on public.device_maintenance_log (device_id);

-- 4) Public passport RPC: whole project ------------------------------------
-- Returns json with project info + gallery + devices (NO serial_number) +
-- maintenance history. Only works for projects with passport_enabled = true
-- AND status = 'published' — anything else returns null on purpose.
create or replace function public.get_project_passport(p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'project', json_build_object(
      'id', p.id, 'slug', p.slug, 'title', p.title, 'summary', p.summary,
      'description', p.description, 'category', p.category,
      'customer_name', p.customer_name, 'customer_logo_url', p.customer_logo_url,
      'location_text', p.location_text, 'engineer_name', p.engineer_name,
      'cover_image_url', p.cover_image_url, 'before_image_url', p.before_image_url,
      'after_image_url', p.after_image_url, 'timeline', p.timeline, 'pdf_url', p.pdf_url
    ),
    'gallery', coalesce((
      select json_agg(json_build_object('image_url', g.image_url, 'caption', g.caption) order by g.sort_order)
      from public.project_gallery g where g.project_id = p.id
    ), '[]'::json),
    'devices', coalesce((
      select json_agg(json_build_object(
        'id', d.id, 'device_name', d.device_name, 'device_type', d.device_type,
        'quantity', d.quantity, 'warranty_until', d.warranty_until,
        'last_maintenance_date', d.last_maintenance_date, 'notes', d.maintenance_notes,
        'qr_token', d.qr_token
      ))
      from public.project_devices d where d.project_id = p.id
    ), '[]'::json),
    'maintenance_log', coalesce((
      select json_agg(json_build_object(
        'performed_at', m.performed_at, 'summary', m.summary, 'engineer_name', m.engineer_name,
        'device_name', d.device_name
      ) order by m.performed_at desc)
      from public.device_maintenance_log m
      join public.project_devices d on d.id = m.device_id
      where d.project_id = p.id
    ), '[]'::json)
  ) into result
  from public.projects p
  where p.slug = p_slug and p.status = 'published' and p.passport_enabled = true;

  return result;
end;
$$;

grant execute on function public.get_project_passport(text) to anon, authenticated;

-- 5) Public rack-scanner RPC: single device lookup by its QR token ---------
-- Deliberately excludes serial_number (that stays admin-only, matches the
-- existing "Auth read project devices" policy on project_devices).
create or replace function public.get_device_by_qr(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'device_name', d.device_name, 'device_type', d.device_type, 'quantity', d.quantity,
    'warranty_until', d.warranty_until, 'last_maintenance_date', d.last_maintenance_date,
    'notes', d.maintenance_notes,
    'project_title', p.title, 'project_slug', p.slug, 'customer_name', p.customer_name
  ) into result
  from public.project_devices d
  join public.projects p on p.id = d.project_id
  where d.qr_token = p_token and p.passport_enabled = true and p.status = 'published';

  return result;
end;
$$;

grant execute on function public.get_device_by_qr(uuid) to anon, authenticated;

-- 6) Storage bucket for project gallery images (public read, like `products`)
insert into storage.buckets (id, name, public)
values ('projects', 'projects', true)
on conflict (id) do nothing;

drop policy if exists "Public read projects bucket" on storage.objects;
create policy "Public read projects bucket" on storage.objects
  for select using (bucket_id = 'projects');

drop policy if exists "Auth write projects bucket" on storage.objects;
create policy "Auth write projects bucket" on storage.objects
  for all using (bucket_id = 'projects' and auth.role() = 'authenticated')
  with check (bucket_id = 'projects' and auth.role() = 'authenticated');
