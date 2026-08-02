-- Migration 006 — Enterprise Product Experience (Phase 2D)
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.

-- 1) Badges / merchandising
alter table public.products add column if not exists is_ai_recommended boolean default false;
alter table public.products add column if not exists recommendation_tags text[] default '{}';
-- 'featured' already exists (boolean) — reused, not duplicated.

-- 2) Rich content for Quick View / product detail
alter table public.products add column if not exists datasheet_url text;
alter table public.products add column if not exists installation_guide_url text;
alter table public.products add column if not exists video_url text;
alter table public.products add column if not exists warranty_text text; -- e.g. 'ضمان 3 سنوات من الموزع'

-- 3) Structured specs used by BOTH the comparison table and the compatibility engine.
--    Kept as one jsonb bucket (not a new column per spec) so admin can extend fields
--    per-category without another migration. Suggested keys used by the frontend:
--    resolution, poe, poe_watts, lens, storage, storage_bays, power, dimensions,
--    ai_features (text[]), ports, poe_budget_watts, channels_supported, rack_units
alter table public.products add column if not exists specs jsonb default '{}'::jsonb;

-- 4) Explicit relations (safer & faster than re-deriving on the client every time)
alter table public.products add column if not exists related_product_ids uuid[] default '{}';
alter table public.products add column if not exists compatible_product_ids uuid[] default '{}';

-- 5) Sorting
alter table public.products add column if not exists popularity_score int default 0; -- admin-controlled, drives "الأكثر رواجًا"

-- 6) Badge priority / colors editable from Admin (future-ready, optional per product)
alter table public.products add column if not exists badge_priority int default 0;

create index if not exists idx_products_popularity on public.products (popularity_score desc);
create index if not exists idx_products_ai_recommended on public.products (is_ai_recommended) where is_ai_recommended = true;
