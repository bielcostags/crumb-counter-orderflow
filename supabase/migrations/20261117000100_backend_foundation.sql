-- External project only: yzxsuoxthkbzbkcumauz (vila-rica-dev, sa-east-1).
-- Sprint 06.2A: structural foundation only; no business writes or accounts enabled.
-- Review + remote dry run + explicit owner approval required before applying remotely.
begin;
-- Tables are created, secured and write-locked within this same transaction.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  role text not null default 'atendente' check (role in ('admin','atendente')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  source_id text unique,
  name text not null check (char_length(name) between 2 and 80
    and name = btrim(regexp_replace(name, '[[:space:]]+', ' ', 'g'))),
  description text not null default '' check (char_length(description) <= 500),
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_name_normalized on public.categories (lower(name));
create index categories_listing on public.categories (active, sort_order, id);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  source_id text unique,
  commercial_code text, -- deliberately not unique: original code 362 occurs twice
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  price_cents bigint not null check (price_cents between 1 and 9007199254740991),
  image_url text not null default '' check (char_length(image_url) <= 2048),
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_catalog on public.products (category_id, available, id);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001)
    unique not null check (order_number between 1 and 9007199254740991),
  channel text not null check (channel in ('online','balcao')),
  fulfillment text not null check (fulfillment in ('retirada','entrega')),
  status text not null default 'pendente'
    check (status in ('pendente','em_preparacao','pronto','saiu_para_entrega','concluido','cancelado')),
  payment_method text not null check (payment_method in ('pix','dinheiro','cartao')),
  payment_status text not null default 'pendente' check (payment_status in ('pendente','pago')),
  total_cents bigint not null check (total_cents between 1 and 9007199254740991),
  created_by uuid references public.profiles(id) on delete restrict,
  idempotency_key uuid not null unique,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (channel <> 'balcao' or (fulfillment = 'retirada' and created_by is not null)),
  check (fulfillment = 'entrega' or status <> 'saiu_para_entrega')
);
create index orders_recent on public.orders (created_at desc, id desc);
create index orders_status on public.orders (status, created_at desc);
create index orders_channel on public.orders (channel, created_at desc);
create index orders_created_by on public.orders (created_by);
create table private.order_customer_data (
  order_id uuid primary key references public.orders(id) on delete restrict,
  customer_name text check (char_length(customer_name) between 1 and 60),
  customer_phone text check (customer_phone ~ '^[0-9]{10,11}$'),
  delivery_address text check (char_length(delivery_address) between 8 and 160),
  notes text check (char_length(notes) <= 200)
);
create table private.order_tracking (
  order_id uuid primary key references public.orders(id) on delete restrict,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null check (char_length(btrim(product_name)) between 2 and 80),
  unit_price_cents bigint not null check (unit_price_cents between 1 and 9007199254740991),
  quantity smallint not null check (quantity between 1 and 99),
  notes text check (char_length(notes) <= 200),
  subtotal_cents bigint generated always as (unit_price_cents * quantity) stored
    check (subtotal_cents between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index order_items_product on public.order_items (product_id);
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  previous_status text check (previous_status in
    ('pendente','em_preparacao','pronto','saiu_para_entrega','concluido','cancelado')),
  new_status text not null check (new_status in
    ('pendente','em_preparacao','pronto','saiu_para_entrega','concluido','cancelado')),
  changed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (previous_status is not null or new_status = 'pendente')
);
create index order_history_order on public.order_status_history (order_id, created_at, id);
create index order_history_actor on public.order_status_history (changed_by);
create unique index order_history_one_creation on public.order_status_history (order_id)
  where previous_status is null;
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_method text not null check (payment_method in ('pix','dinheiro','cartao')),
  amount_cents bigint not null check (amount_cents between 1 and 9007199254740991),
  event_type text not null check (event_type = 'recebido'),
  registered_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (order_id, event_type)
);
create index payment_events_actor on public.payment_events (registered_by);
create table private.idempotency_requests (
  key uuid primary key,
  scope text not null check (scope in ('online','balcao','status','pagamento')),
  actor_id uuid references public.profiles(id) on delete restrict,
  payload_hash bytea not null check (octet_length(payload_hash) = 32),
  order_id uuid references public.orders(id) on delete restrict,
  response_ciphertext bytea,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (scope = 'online' or actor_id is not null),
  check (expires_at > created_at)
);
create index idempotency_order on private.idempotency_requests (order_id);
create index idempotency_actor on private.idempotency_requests (actor_id);
create index idempotency_expiry on private.idempotency_requests (expires_at);
create index tracking_expiry on private.order_tracking (expires_at);
-- The creation reservation exists before orders is inserted; this FK is checked at commit.
alter table public.orders add constraint orders_attempt_fk foreign key (idempotency_key)
  references private.idempotency_requests(key) on delete restrict deferrable initially deferred;

-- Every business table, including private records, is protected before commit.
do $migration$
declare item record;
begin
  for item in
    select * from (values
      ('public','profiles'), ('public','categories'), ('public','products'),
      ('public','orders'), ('public','order_items'), ('public','order_status_history'),
      ('public','payment_events'), ('private','order_customer_data'),
      ('private','order_tracking'), ('private','idempotency_requests')
    ) as tables(schema_name, table_name)
  loop
    execute format('alter table %I.%I enable row level security', item.schema_name, item.table_name);
    execute format('revoke all on table %I.%I from public, anon, authenticated, service_role', item.schema_name, item.table_name);
  end loop;
end
$migration$;
revoke all on sequence public.orders_order_number_seq from public, anon, authenticated, service_role;

-- Current migration owner only. Other future DDL owners must set equivalent defaults.
alter default privileges in schema public revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema private revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated, service_role;

-- Fail closed even if future grants are accidentally added or service_role bypasses RLS.
-- Removal is a separate reviewed migration after business RPCs/invariants are tested.
create function private.reject_foundation_write() returns trigger
language plpgsql security invoker set search_path = '' as $function$
begin
  raise exception 'Backend foundation is read-only until transactional operations are approved'
    using errcode = '42501';
end
$function$;
revoke all on function private.reject_foundation_write() from public, anon, authenticated, service_role;
do $migration$
declare item record;
begin
  for item in
    select * from (values
      ('public','profiles'), ('public','categories'), ('public','products'),
      ('public','orders'), ('public','order_items'), ('public','order_status_history'),
      ('public','payment_events'), ('private','order_customer_data'),
      ('private','order_tracking'), ('private','idempotency_requests')
    ) as tables(schema_name, table_name)
  loop
    execute format('create trigger foundation_block_write before insert or update or delete on %I.%I for each row execute function private.reject_foundation_write()', item.schema_name, item.table_name);
    execute format('create trigger foundation_block_truncate before truncate on %I.%I for each statement execute function private.reject_foundation_write()', item.schema_name, item.table_name);
    execute format('alter table %I.%I enable always trigger foundation_block_write', item.schema_name, item.table_name);
    execute format('alter table %I.%I enable always trigger foundation_block_truncate', item.schema_name, item.table_name);
  end loop;
end
$migration$;
comment on table public.orders is 'Sprint 06.2A foundation: all business writes intentionally blocked; no checkout/PDV RPCs available.';
commit;
