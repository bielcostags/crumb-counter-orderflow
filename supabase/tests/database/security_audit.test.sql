-- LOCAL ONLY: additional effective-privilege and catalog audit; rollback at end.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();
create temporary table audit_relations (relation_name text primary key) on commit drop;
insert into audit_relations values
 ('public.profiles'),('public.categories'),('public.products'),('public.orders'),
 ('public.order_items'),('public.order_status_history'),('public.payment_events'),
 ('private.order_customer_data'),('private.order_tracking'),('private.idempotency_requests');
select ok((select relrowsecurity from pg_class where oid = relation_name::regclass),
  relation_name || ': RLS enabled') from audit_relations order by relation_name;
select is((select count(*)::integer from pg_trigger where tgrelid=relation_name::regclass
  and tgname in ('foundation_block_write','foundation_block_truncate') and tgenabled='A'),
  2, relation_name || ': both ALWAYS write gates') from audit_relations order by relation_name;
select ok(not has_table_privilege(actor,relation_name,'INSERT,UPDATE,DELETE,TRUNCATE'),
  relation_name || ': no effective write grants for ' || actor)
from audit_relations cross join (values ('anon'),('authenticated'),('service_role')) roles(actor)
order by relation_name,actor;
select ok(not has_table_privilege('anon',relation_name,'SELECT'),
  relation_name || ': no anonymous read') from audit_relations
where relation_name not in ('public.categories','public.products') order by relation_name;
select ok(not has_table_privilege(actor,relation_name,'SELECT'),
  relation_name || ': no direct private read for ' || actor)
from audit_relations cross join (values ('authenticated'),('service_role')) roles(actor)
where relation_name like 'private.%' order by relation_name,actor;
select ok(not has_sequence_privilege(actor,'public.orders_order_number_seq','USAGE,UPDATE'),
  'Identity sequence inaccessible to ' || actor)
from (values ('anon'),('authenticated'),('service_role')) roles(actor);
select is((select count(*)::integer from pg_policy where polrelid in
  (select relation_name::regclass from audit_relations) and polcmd <> 'r' and (0=any(polroles) or polroles && array['anon'::regrole::oid,'authenticated'::regrole::oid,'service_role'::regrole::oid])),0,'No API write or ALL policies');
select is((select count(*)::integer from pg_policy where polrelid in
  (select relation_name::regclass from audit_relations where relation_name like 'private.%') and (0=any(polroles) or polroles && array['anon'::regrole::oid,'authenticated'::regrole::oid,'service_role'::regrole::oid])),0,
  'No policies expose private records');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname in ('is_staff','is_admin') and p.prosecdef
    and p.proowner=(select relowner from pg_class where oid='public.profiles'::regclass)
    and p.proconfig @> array['search_path=""']),2,'Both definer helpers have table owner and empty search_path');
select is((select pg_get_userbyid(relowner)::text from pg_class where oid='public.profiles'::regclass),
  'postgres','Migration table owner is postgres');
select ok(not has_function_privilege(actor,signature,'EXECUTE'),signature || ': no execute for ' || actor)
from (values ('private.is_staff()'),('private.is_admin()')) helpers(signature)
cross join (values ('anon'),('service_role')) roles(actor);
select ok(has_function_privilege('authenticated',signature,'EXECUTE'),signature || ': authenticated helper allowed')
from (values ('private.is_staff()'),('private.is_admin()')) helpers(signature);
select ok(not has_function_privilege(actor,'private.reject_foundation_write()','EXECUTE'),
  'Trigger function cannot be called by ' || actor)
from (values ('anon'),('authenticated'),('service_role')) roles(actor);
select ok(not has_schema_privilege('anon','private','USAGE'),'Anonymous cannot use private schema');
select ok(not has_schema_privilege('service_role','private','USAGE'),'Service role cannot use private schema');
select is((select count(*)::integer from pg_constraint where conrelid in
  (select relation_name::regclass from audit_relations) and contype='p'),10,'Ten primary keys');
select ok((select attidentity='a' from pg_attribute where attrelid='public.orders'::regclass
  and attname='order_number'),'Order number is GENERATED ALWAYS identity');
select ok((select attgenerated='s' from pg_attribute where attrelid='public.order_items'::regclass
  and attname='subtotal_cents'),'Item subtotal is stored generated expression');
select ok((select condeferrable and condeferred from pg_constraint
  where conrelid='public.orders'::regclass and conname='orders_attempt_fk'),
  'Order attempt FK is deferred for atomic creation');
select is((select count(*)::integer from pg_constraint where conrelid in
  (select relation_name::regclass from audit_relations) and contype='f' and confdeltype <> 'r'),0,
  'No cascading historical foreign keys');
select * from finish();
rollback;
