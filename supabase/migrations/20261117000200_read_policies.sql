-- Read policies only; never removes foundation write gates.
begin;
-- Explicit function owner must be the trusted migration/table owner (postgres in hosted Supabase).
-- RLS is not FORCEd on profiles: its owner must avoid recursive policy evaluation.
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
revoke all on function private.is_staff() from public, anon, service_role;
revoke all on function private.is_admin() from public, anon, service_role;
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

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products to anon, authenticated;
grant select on public.profiles, public.orders, public.order_items,
  public.order_status_history, public.payment_events to authenticated;
-- No grants to private tables, no sequence privileges, no business mutation functions.
commit;
