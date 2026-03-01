-- ══════════════════════════════════════════════════════════════
-- CbX0 St0r3 — Schéma Supabase
-- Colle tout dans SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- CATÉGORIES
create table if not exists categories (
  id         text primary key,
  name       text not null,
  emoji      text default '🌿',
  color      text default '#7C3AED',
  created_at timestamptz default now()
);
insert into categories (id,name,emoji,color) values
  ('fleur','Fleurs','🌸','#7C3AED'),
  ('resine','Résines','🍫','#4F46E5')
on conflict (id) do nothing;

-- PRODUITS
create table if not exists products (
  id          bigint primary key,
  emoji       text default '🌿',
  name        text not null,
  cat_id      text references categories(id),
  taux        text default '10% CBD',
  thc         text default '< 0,3%',
  origine     text default '',
  mode        text default '',
  desc        text default '',
  stock       integer default 0,
  badge       text default '',
  tiers       jsonb default '[]',
  images      jsonb default '[]',
  lab_pdf_url text,
  sort_order  integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create or replace function set_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

-- UTILISATEURS
create table if not exists users (
  id            bigint primary key generated always as identity,
  name          text not null,
  email         text unique not null,
  password_hash text not null,
  role          text default 'user' check (role in ('user','admin')),
  created_at    timestamptz default now()
);

-- COMMANDES
create table if not exists orders (
  id         bigint primary key,
  user_email text not null,
  user_id    bigint references users(id) on delete set null,
  items      jsonb not null default '[]',
  total      numeric(10,2) not null,
  promo      text,
  method     text default 'livraison',
  date       text,
  created_at timestamptz default now()
);
create index if not exists idx_orders_email on orders(user_email);

-- PROMOS
create table if not exists promos (
  code       text primary key,
  discount   integer not null check (discount between 1 and 100),
  uses       integer default 0,
  max_uses   integer default 0,
  active     boolean default true,
  created_at timestamptz default now()
);
insert into promos (code,discount,uses,max_uses,active) values
  ('BIENVENUE10',10,0,0,true),
  ('CBD15',15,0,50,true)
on conflict (code) do nothing;

-- NOTIFICATIONS
create table if not exists notifications (
  id           bigint primary key,
  to_type      text default 'all' check (to_type in ('all','selected')),
  to_ids       jsonb,
  subject      text not null,
  message      text not null,
  read_by      jsonb default '[]',
  created_date text,
  created_at   timestamptz default now()
);

-- PARAMÈTRES
create table if not exists settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);
insert into settings (key,value) values (
  'cc','{"enabled":false,"address":"","hours":{"lun":{"open":"10:00","close":"19:00","active":true},"mar":{"open":"10:00","close":"19:00","active":true},"mer":{"open":"10:00","close":"20:00","active":true},"jeu":{"open":"10:00","close":"19:00","active":true},"ven":{"open":"10:00","close":"20:00","active":true},"sam":{"open":"10:00","close":"18:00","active":true},"dim":{"open":"10:00","close":"12:00","active":false}}}'::jsonb
) on conflict (key) do nothing;

-- FONCTIONS RPC
create or replace function decrement_stock(product_id bigint, quantity integer)
returns void as $$
begin update products set stock = greatest(0, stock - quantity) where id = product_id; end;
$$ language plpgsql security definer;

create or replace function increment_promo_uses(promo_code text)
returns void as $$
begin update promos set uses = uses + 1 where code = promo_code; end;
$$ language plpgsql security definer;

-- RLS — SERVICE_ROLE_KEY bypass automatiquement ces policies côté API
alter table users        enable row level security;
alter table orders       enable row level security;
alter table settings     enable row level security;
alter table products     enable row level security;
alter table categories   enable row level security;
alter table promos       enable row level security;
alter table notifications enable row level security;

-- Nettoyer les anciennes policies pour éviter les conflits
drop policy if exists "deny_public"          on users;
drop policy if exists "deny_public"          on orders;
drop policy if exists "deny_public"          on settings;
drop policy if exists "public_read"          on products;
drop policy if exists "public_read"          on categories;
drop policy if exists "public_read"          on promos;
drop policy if exists "public_read"          on notifications;
drop policy if exists "deny_write"           on products;
drop policy if exists "deny_write"           on categories;
drop policy if exists "deny_write"           on promos;
drop policy if exists "deny_write"           on notifications;
drop policy if exists "block_anon_users"     on users;
drop policy if exists "block_anon_orders"    on orders;
drop policy if exists "block_anon_settings"  on settings;
drop policy if exists "anon_read_products"   on products;
drop policy if exists "anon_read_categories" on categories;
drop policy if exists "anon_read_promos"     on promos;
drop policy if exists "anon_read_notifications" on notifications;
drop policy if exists "block_write_products"    on products;
drop policy if exists "block_write_categories"  on categories;
drop policy if exists "block_write_promos"      on promos;
drop policy if exists "block_write_notifications" on notifications;

-- Tables sensibles : bloqué pour tout accès anon
create policy "no_anon_users"    on users    for all to anon using (false);
create policy "no_anon_orders"   on orders   for all to anon using (false);
create policy "no_anon_settings" on settings for all to anon using (false);

-- Tables publiques : lecture anon OK
create policy "anon_select_products"   on products      for select to anon using (true);
create policy "anon_select_categories" on categories    for select to anon using (true);
create policy "anon_select_promos"     on promos        for select to anon using (true);
create policy "anon_select_notifs"     on notifications for select to anon using (true);

-- Écriture publique bloquée
create policy "no_anon_write_products"   on products      for insert to anon with check (false);
create policy "no_anon_write_categories" on categories    for insert to anon with check (false);
create policy "no_anon_write_promos"     on promos        for insert to anon with check (false);
create policy "no_anon_write_notifs"     on notifications for insert to anon with check (false);

-- ══════════════════════════════════════════════════════════════
-- FIN
-- ══════════════════════════════════════════════════════════════
