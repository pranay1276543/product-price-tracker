-- Product Price Tracker - Database Schema
-- Run this in the Supabase SQL editor (or `psql`) before starting the backend.
--
-- Three tables, kept intentionally simple:
--   tracked_products  - one row per product+option the user chose to track
--   price_history     - one row per SUCCESSFUL scrape (price + stock at that time)
--   scrape_logs       - one row per scrape ATTEMPT, success or failure (the honest log)
--
-- price_history only ever gets successful rows. scrape_logs gets every attempt,
-- including failures, which is what the CSV export and the "scrape log" UI need.

create table if not exists tracked_products (
  id              bigint generated always as identity primary key,
  product_id      text not null,        -- the store's own product id (from the store's URL/API, e.g. "2233")
  product_slug    text not null,        -- store's slug, used to build the product page URL
  product_name    text not null,
  product_url     text not null,        -- full URL of the product page on the mock store
  selected_option text not null,        -- the option label the user picked, e.g. "2-pack"
  option_id       text not null,        -- the store's internal id for that option, e.g. "o2"
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- one product+option should only be tracked once while active
create unique index if not exists tracked_products_unique_active
  on tracked_products (product_id, option_id)
  where is_active = true;

create table if not exists price_history (
  id                 bigint generated always as identity primary key,
  tracked_product_id bigint not null references tracked_products (id) on delete cascade,
  "timestamp"        timestamptz not null default now(),
  price              numeric(12, 2) not null,
  stock              text not null   -- raw stock text as shown on the store, e.g. "Sold out" or "118 remaining"
);

create index if not exists price_history_tracked_product_idx
  on price_history (tracked_product_id, "timestamp" desc);

create table if not exists scrape_logs (
  id                 bigint generated always as identity primary key,
  tracked_product_id bigint not null references tracked_products (id) on delete cascade,
  "timestamp"        timestamptz not null default now(),
  outcome            text not null check (outcome in ('success', 'retried', 'failed')),
  price              numeric(12, 2),        -- null when the attempt failed
  stock              text,                  -- null when the attempt failed
  attempts           int not null default 1,
  error_message      text                   -- null on success
);

create index if not exists scrape_logs_tracked_product_idx
  on scrape_logs (tracked_product_id, "timestamp" desc);

-- Row Level Security is meant for apps where browsers talk to Supabase directly with a
-- restricted key. Here, the only client that ever touches these tables is our own Express
-- backend, using the Supabase *service role* key - which already bypasses RLS by design.
-- Some Supabase project setups enable RLS by default on new tables regardless, which then
-- blocks even the service role's writes until policies are added. Since there's no direct
-- browser access to disallow, we explicitly disable RLS rather than writing policies that
-- would just always evaluate to "allow everything" anyway.
alter table tracked_products disable row level security;
alter table price_history disable row level security;
alter table scrape_logs disable row level security;