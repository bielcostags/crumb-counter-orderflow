# Proposta SQL para revisão — NÃO APLICAR

Documento de modelagem, não migração executável de produção. Nenhum SQL foi enviado a banco; não há arquivos em supabase/migrations ou drizzle. A aplicação futura depende de autorização e do fluxo de banco do Lovable. O DDL abaixo cobre estrutura e uma base de leitura RLS; **as funções de negócio, triggers de integridade e endpoints descritos adiante ainda precisam ser implementados e testados**. Escritas da API ficam bloqueadas até lá. Rever versão PostgreSQL/extensões do projeto autorizado antes de gerar migração.

## Estrutura relacional proposta

```sql
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

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
-- The creation reservation exists before orders is inserted; this FK is checked at commit.
alter table public.orders add constraint orders_attempt_fk foreign key (idempotency_key)
  references private.idempotency_requests(key) on delete restrict deferrable initially deferred;
```

O cálculo bigint pode estourar antes do CHECK: isso aborta a transação, nunca aceita overflow. A função deverá validar produto × quantidade e SUM usando numeric antes de converter para bigint. Tipos da aplicação continuam com limite Number.MAX_SAFE_INTEGER. A identity assegura geração concorrente, e UNIQUE reforça unicidade; lacunas por rollback são esperadas, sem MAX+1 ou tentativa de numeração fiscal sem lacunas.

## Base de privilégios/RLS proposta

```sql
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payment_events enable row level security;
alter table private.order_customer_data enable row level security;
alter table private.order_tracking enable row level security;
alter table private.idempotency_requests enable row level security;

revoke all on table public.profiles, public.categories, public.products, public.orders,
  public.order_items, public.order_status_history, public.payment_events from anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.categories, public.products to anon, authenticated;
grant select on public.profiles, public.orders, public.order_items,
  public.order_status_history, public.payment_events to authenticated;

-- Must be owned by a narrowly reviewed trusted owner able to read profiles
-- without recursively evaluating its own profile policy. No user-supplied uid.
create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role in ('admin','atendente'));
$$;
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role = 'admin');
$$;
revoke all on function private.is_staff() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_staff(), private.is_admin() to authenticated;
-- Granting schema usage does not grant private table access. Keep schema out of Data API exposure.

create policy categories_public_read on public.categories for select to anon, authenticated
  using (active);
create policy categories_staff_read on public.categories for select to authenticated
  using ((select private.is_staff()));
create policy products_public_read on public.products for select to anon, authenticated
  using (available and exists (select 1 from public.categories c
    where c.id = category_id and c.active));
create policy products_staff_read on public.products for select to authenticated
  using ((select private.is_staff()));
create policy profiles_read on public.profiles for select to authenticated
  using ((active and id = (select auth.uid())) or (select private.is_admin()));
create policy orders_staff_read on public.orders for select to authenticated
  using ((select private.is_staff()));
create policy items_staff_read on public.order_items for select to authenticated
  using ((select private.is_staff()));
create policy history_staff_read on public.order_status_history for select to authenticated
  using ((select private.is_staff()));
create policy payments_staff_read on public.payment_events for select to authenticated
  using ((select private.is_staff()));
-- No direct INSERT/UPDATE/DELETE policies. No anon SELECT on orders or children.
-- Private customer/tracking/idempotency tables deliberately have no API policies.
```

Funções auxiliares não aceitam parâmetros controláveis para escolher outro funcionário. Dono e ausência de recursão RLS devem ser confirmados no ambiente real; não aplicar FORCE RLS indiscriminadamente ao owner dessas funções. Funções expostas futuras terão EXECUTE revogado de PUBLIC por assinatura exata e concedido apenas ao papel necessário. Definir default privileges para **cada role que cria objetos** e conferir grants reais; defaults globais copiados sem revisar owner não garantem proteção. Não expor service_role ao browser nem dar EXECUTE anônimo a função com privilégios amplos.

## Funções e triggers obrigatórios antes de habilitar escrita

Estes itens são especificações para implementação posterior pelo Lovable, não SQL já homologado:

- `create_online_order` / `create_counter_order`: RPC transacional única por intenção. Online só chamada pelo servidor controlado após rate limit e validação, jamais diretamente por anon. Balcão exige JWT verificado e funcionário ativo. Parâmetros não incluem privilégios, ator escolhido, status arbitrário nem total autoritativo.
- `save_category`, `save_product`, `set_category_active`, `set_product_available`: só admin, normalizam/validam como lib/catalog; respeitam edição em categoria inativa atual; bloqueiam categoria ao mover/criar produto.
- `transition_order`: SELECT FOR UPDATE em orders; valida versão e próximo estado ou cancelamento permitido, incrementa versão, atualiza updated_at e acrescenta um histórico na mesma transação. Ator obtido de auth.uid(), sem substituição pelo payload. Estados finais não reabrem.
- `mark_order_paid`: SELECT FOR UPDATE, versão, status não cancelado e pagamento pendente; cria um único evento pelo total/método do pedido, marca pago e incrementa versão. Concluído pode receber; cancelado não. Repetição de mesma tentativa retorna resultado anterior; outra tentativa de pagar já pago é rejeitada.
- BEFORE UPDATE/DELETE em order_items, order_status_history e payment_events rejeitam mutações; BEFORE DELETE em perfis/catálogo/orders rejeita exclusão definitiva operacional. Retenção/anonimização será um procedimento separado autorizado, sem apagar snapshots.
- BEFORE UPDATE em orders bloqueia campos imutáveis (itens não pertencem à linha, mas total/channel/fulfillment/idempotência/created_at/created_by não mudam). Mudança de status/pagamento só por funções autorizadas, com verificação de transição e auditoria; não confiar em flag de sessão que o cliente possa definir.
- Triggers constraint DEFERRABLE INITIALLY DEFERRED, disparados por escrita em orders/itens/histórico/pagamentos/dados pessoais: ao commit exigem ao menos um item, soma igual a orders.total_cents, histórico inicial e último status coerentes, dados online/entrega obrigatórios, evento recebido único com método/valor coerentes e marcação pago correspondente. Cancelamento posterior de pago mantém evento, sem rejeitar a transação.
- BEFORE UPDATE para updated_at em perfis/categorias/produtos/orders. UTC do servidor, não valores enviados pelo cliente.
- Bootstrap de admin e manutenção de papéis exclusivos de operação administrativa verificada, sem permissões de update direto de profiles. Impedir remover/desativar o último admin ativo e registrar auditoria administrativa futura.

## Algoritmo transacional e idempotência

1. API limita tamanho (proposta 64 KiB), máximo proposto 100 linhas, frequência e valida schema completo; nenhuma consulta por número público. Normaliza linhas de forma determinística; produtos repetidos são rejeitados, não somados silenciosamente. Valida UUIDs e resumo obrigatório de nomes/preços/quantidades/notas/categorias revisadas.
2. Inicia transação e reserva `idempotency_requests.key` por INSERT com conflito tratado. Concorrentes na mesma chave esperam a transação original. Verifica scope, actor_id e SHA-256 do payload canônico; divergência devolve IDEMPOTENCY_CONFLICT, sem revelar dados da outra tentativa. Online: chave aleatória de 128 bits atua como segredo de retry, não logar; para maior isolamento, vinculá-la a cookie de tentativa assinado no endpoint. Replays devem passar mesmos controles de origem/rate limit.
3. Se resultado completo existe, retorna a mesma resposta protegida. Token bruto não fica em orders; guardar resposta cifrada no servidor para recuperar após timeout. Chave de cifragem exclusivamente em Secrets, rotação e retenção definidas; alternativa de token derivável só após revisão criptográfica. Não prometer replay do token se só houver hash.
4. Bloqueia categorias/produtos por UUID em ordem estável, consultando de novo após locks. Bloqueio compartilhado compatível entre vendas, conflitante com edição de catálogo. Disponibilidade/categoria são revalidadas nesse snapshot, e alterações de catálogo usam locks correspondentes. Definir ordem única também nas operações de edição para evitar deadlocks.
5. Recalcula itens e soma com numeric, compara com quote; mudanças de nome/preço/categoria ou indisponibilidade abortam sem pedido. Cotação enviada só limita consentimento, nunca define valor. Falha mantém carrinho e exige revisão explícita.
6. Gera UUID, número identity, token criptográfico de 32 bytes e hash; insere orders, dados pessoais, itens, histórico inicial e tracking. Online inicia pendente/pagamento pendente/created_by null. Balcão usa retirada, operador real e pagamento escolhido; pago insere evento pelo total.
7. Persiste resultado cifrado/referência na tentativa e faz commit; triggers diferidos precisam passar. Qualquer erro faz rollback de **todas** as linhas, inclusive reserva da tentativa. Sequence pode consumir número apesar do rollback.
8. Timeout após commit: reenviar mesma chave/corpo recupera resultado; não limpar rascunho até confirmar. Retenção de resposta proposta 7 dias; manter tombstone de chave/scope/hash/resultado após expiração para rejeitar replay antigo, sem permitir nova gravação. Nunca apagar reserva e reutilizar a chave. Falha antes de commit permite mesma tentativa, sem pedido parcial.

Número do pedido é apenas identificador de apresentação. Token de tracking é capacidade limitada de leitura, com hash e expiração; não autoriza edição, acesso administrativo ou recuperação de dados pessoais. Índices e locks precisam ser medidos com concorrência real na Sprint 06.2.

## Referências oficiais consultadas

- [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Supabase — funções e privilégios](https://supabase.com/docs/guides/database/functions).
- [PostgreSQL — identity](https://www.postgresql.org/docs/18/ddl-identity-columns.html).
- [PostgreSQL — lacunas de sequences](https://wiki.postgresql.org/wiki/FAQ#Why_are_there_gaps_in_the_numbering_of_my_sequence.2FSERIAL_column.3F).

São referências de desenho; a proposta ainda exige validação na versão efetivamente fornecida pelo projeto Supabase autorizado.
