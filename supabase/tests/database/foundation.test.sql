-- LOCAL disposable Supabase only. Never run against the hosted project in Sprint 06.2A.
-- Fixtures/temporary trigger disabling are transaction-local and rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where (n.nspname,c.relname) in (('public','profiles'),('public','categories'),('public','products'),
    ('public','orders'),('public','order_items'),('public','order_status_history'),('public','payment_events'),
    ('private','order_customer_data'),('private','order_tracking'),('private','idempotency_requests'))
  and c.relrowsecurity), 10, 'RLS enabled on all ten tables');
select is((select count(*)::integer from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private')
  and t.tgname in ('foundation_block_write','foundation_block_truncate') and t.tgenabled='A'),
  20, 'All write/truncate gates enabled ALWAYS');
select ok(not has_table_privilege('anon','public.orders','SELECT'), 'Anonymous cannot read orders');
select ok(not has_table_privilege('anon','public.order_items','SELECT'), 'Anonymous cannot read items');
select ok(not has_table_privilege('anon','public.profiles','SELECT'), 'Anonymous cannot read profiles');
select ok(not has_table_privilege('authenticated','public.profiles','UPDATE'), 'No self promotion');
select ok(not has_table_privilege('service_role','public.orders','INSERT'), 'No service role business writes');
select ok(not has_table_privilege('authenticated','private.order_customer_data','SELECT'), 'PII is private');
select ok(not has_table_privilege('authenticated','private.order_tracking','SELECT'), 'Token hashes are private');
select ok(not has_table_privilege('authenticated','private.idempotency_requests','SELECT'), 'Replay data is private');
select throws_ok($$insert into public.categories(name) values ('Blocked')$$,
  '42501', 'Backend foundation is read-only until transactional operations are approved', 'Gate blocks even owner inserts');
select throws_ok($$truncate public.order_items$$,
  '42501', 'Backend foundation is read-only until transactional operations are approved', 'Gate blocks owner truncate');

-- Owner-only fixtures. Never part of migrations, seeds or remote execution.
alter table public.categories disable trigger foundation_block_write;
alter table public.products disable trigger foundation_block_write;
alter table public.profiles disable trigger foundation_block_write;
insert into auth.users(id) values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000004');
insert into public.profiles(id,full_name,role,active) values
  ('10000000-0000-4000-8000-000000000001','Admin de teste','admin',true),
  ('10000000-0000-4000-8000-000000000002','Atendente de teste','atendente',true),
  ('10000000-0000-4000-8000-000000000003','Inativo de teste','admin',false);
insert into public.categories(id,name,active) values
  ('20000000-0000-4000-8000-000000000001','Ativa de teste',true),
  ('20000000-0000-4000-8000-000000000002','Inativa de teste',false);
insert into public.products(id,category_id,name,price_cents,available,commercial_code,source_id) values
  ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Chocolate teste',1300,true,'362','test-chocolate'),
  ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Moça teste',1000,false,'362','test-moca'),
  ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','Categoria oculta',1000,true,'1','test-hidden');
select throws_ok($$insert into public.categories(name) values ('ativa de teste')$$,
  '23505', null, 'Duplicate category name rejected');
select throws_ok($$insert into public.products(category_id,name,price_cents) values
  ('20000000-0000-4000-8000-000000000001','Preço inválido',0)$$,
  '23514', null, 'Nonpositive price rejected');
select is((select count(*)::integer from public.products where commercial_code='362'),2,'Duplicate commercial code preserved');
alter table public.categories enable always trigger foundation_block_write;
alter table public.products enable always trigger foundation_block_write;
alter table public.profiles enable always trigger foundation_block_write;

-- Test harness permissions only; rolled back at the end.
grant usage on schema extensions to anon, authenticated;
grant execute on all functions in schema extensions to anon, authenticated;
set local role anon;
select is((select count(*)::integer from public.categories),1,'Anon sees active categories only');
select is((select count(*)::integer from public.products),1,'Anon sees available products in active categories only');
select throws_ok($$select * from public.orders$$,'42501',null,'Anon order access denied');
select throws_ok($$select * from private.order_tracking$$,'42501',null,'Anon tracking table access denied');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select ok(private.is_staff(),'Active attendant recognized');
select ok(not private.is_admin(),'Attendant cannot become admin');
select is((select count(*)::integer from public.products),3,'Attendant sees operational catalog');
select is((select count(*)::integer from public.profiles),1,'Attendant sees own active profile only');
select throws_ok($$update public.profiles set role='admin'$$,'42501',null,'Direct role escalation denied');
select throws_ok($$insert into public.orders(channel,fulfillment,total_cents,idempotency_key) values
  ('online','retirada',1000,'40000000-0000-4000-8000-000000000001')$$,'42501',null,'Authenticated order insertion denied');
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select ok(private.is_admin(),'Active admin recognized');
select is((select count(*)::integer from public.profiles),3,'Admin reads profiles including inactive');
select throws_ok($$update public.products set price_cents=1$$,'42501',null,'Even admin cannot bypass write freeze');
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select ok(not private.is_staff(),'Inactive staff denied');
select ok(not private.is_admin(),'Inactive admin denied');
select is((select count(*)::integer from public.products),1,'Inactive staff receives public catalog only');
select is((select count(*)::integer from public.profiles),0,'Inactive profile is not exposed');
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000004';
select ok(not private.is_staff(),'Auth account without profile has no staff access');
select is((select count(*)::integer from public.products),1,'Ordinary authenticated account sees public catalog only');
reset role;
select * from finish();
rollback;
