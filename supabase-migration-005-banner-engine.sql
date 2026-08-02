-- ============================================================
-- Migration 005: Banner Engine — analytics + A/B testing events
-- ------------------------------------------------------------
-- The banners themselves stay exactly where they already live:
-- public.site_settings under key 'hero_banners' (jsonb array), same
-- table/policy used since migration 001 — no schema change needed
-- there, we just store richer objects per banner (title, subtitle,
-- CTAs, layout, effect, schedule, accent color, A/B group, etc).
--
-- This migration only adds what didn't exist before: a lightweight
-- events table so the admin can see Views / Clicks / CTR per banner
-- and compare A/B variants. Anonymous visitors can INSERT (that's
-- how a page view/click gets logged) but can never SELECT/UPDATE/
-- DELETE — only an authenticated admin can read the numbers back.
-- Idempotent: safe to re-run, no destructive statements.
-- ============================================================

create table if not exists public.banner_events (
  id bigint generated always as identity primary key,
  banner_id text not null,          -- matches the banner's client-side `id` field in hero_banners
  event_type text not null check (event_type in ('view','click')),
  ab_group text,                    -- 'a' | 'b' | null — which variant was shown, for A/B comparisons
  device text,                      -- 'desktop' | 'tablet' | 'mobile', best-effort from the client
  session_id text,                  -- random id kept in sessionStorage, just to dedupe/inspect, not PII
  page text,                        -- which page the banner was shown/clicked on (usually 'home')
  created_at timestamptz default now()
);

alter table public.banner_events enable row level security;

drop policy if exists "Anyone can log banner events" on public.banner_events;
drop policy if exists "Auth can read banner events" on public.banner_events;
drop policy if exists "Auth can manage banner events" on public.banner_events;

-- Anonymous visitors are allowed to INSERT only (fire-and-forget tracking beacons).
create policy "Anyone can log banner events" on public.banner_events
  for insert with check (true);

-- Only a logged-in admin can read/delete the raw events (used by admin.html analytics tab).
create policy "Auth can manage banner events" on public.banner_events
  for select using (auth.role() = 'authenticated');

create policy "Auth can delete banner events" on public.banner_events
  for delete using (auth.role() = 'authenticated');

create index if not exists idx_banner_events_banner on public.banner_events (banner_id, event_type);
create index if not exists idx_banner_events_created on public.banner_events (created_at);

-- Convenience aggregate view the admin dashboard reads from directly.
create or replace view public.banner_stats as
select
  banner_id,
  ab_group,
  count(*) filter (where event_type = 'view')  as views,
  count(*) filter (where event_type = 'click') as clicks,
  case when count(*) filter (where event_type = 'view') > 0
       then round(100.0 * count(*) filter (where event_type = 'click')
                  / count(*) filter (where event_type = 'view'), 2)
       else 0 end as ctr_pct,
  max(created_at) as last_event_at
from public.banner_events
group by banner_id, ab_group;
