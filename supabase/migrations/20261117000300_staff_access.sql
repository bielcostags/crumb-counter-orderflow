-- LOCAL PREPARATION ONLY. Remote application requires a new explicit approval.
-- No Auth identities or initial admins are created by this migration.
begin;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='vila_rica_staff_writer') then
   create role vila_rica_staff_writer nologin noinherit nobypassrls;
 elsif exists(select 1 from pg_roles where rolname='vila_rica_staff_writer' and (rolcanlogin or rolinherit or rolbypassrls or rolsuper or rolcreaterole)) then
   raise exception 'Unexpected staff writer role configuration';
 end if;
end $$;
revoke vila_rica_staff_writer from anon, authenticated, service_role;
grant usage on schema public, private to vila_rica_staff_writer;
grant select, insert, update on public.profiles to vila_rica_staff_writer;

create table private.staff_access_audit (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.profiles(id) on delete restrict,
 target_id uuid not null references public.profiles(id) on delete restrict,
 operation text not null check (operation in ('bootstrap','link','change')),
 previous_role text, new_role text not null check (new_role in ('admin','atendente')),
 previous_active boolean, new_active boolean not null,
 created_at timestamptz not null default now()
);
alter table private.staff_access_audit enable row level security;
revoke all on private.staff_access_audit from public,anon,authenticated,service_role;
grant insert on private.staff_access_audit to vila_rica_staff_writer;
-- Dedicated owner role has no BYPASSRLS: only these explicit policies allow its bounded operations.
create policy profiles_writer_select on public.profiles for select to vila_rica_staff_writer using (true);
create policy profiles_writer_insert on public.profiles for insert to vila_rica_staff_writer with check (true);
create policy profiles_writer_update on public.profiles for update to vila_rica_staff_writer using (true) with check (true);
create policy audit_writer_insert on private.staff_access_audit for insert to vila_rica_staff_writer with check (true);

-- Append-only, no mutation/deletion/truncation, including via writer functions.
create trigger staff_audit_immutable before update or delete on private.staff_access_audit
 for each row execute function private.reject_foundation_write();
create trigger staff_audit_no_truncate before truncate on private.staff_access_audit
 for each statement execute function private.reject_foundation_write();
alter table private.staff_access_audit enable always trigger staff_audit_immutable;
alter table private.staff_access_audit enable always trigger staff_audit_no_truncate;

-- Only the unassumable, NOLOGIN function-owner role may perform bounded profile writes.
-- No user-controlled GUC, JWT metadata or public flag can bypass this gate.
create function private.guard_staff_profile_write() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if current_user <> 'vila_rica_staff_writer' or tg_op = 'DELETE' then
   raise exception 'Backend foundation is read-only until transactional operations are approved' using errcode='42501';
 end if;
 if tg_op='UPDATE' and (new.id <> old.id or new.created_at <> old.created_at) then
   raise exception 'Immutable profile identity' using errcode='42501';
 end if;
 new.updated_at := pg_catalog.now();
 return new;
end $$;
revoke all on function private.guard_staff_profile_write() from public,anon,authenticated,service_role;
drop trigger foundation_block_write on public.profiles;
create trigger foundation_block_write before insert or update or delete on public.profiles
 for each row execute function private.guard_staff_profile_write();
alter table public.profiles enable always trigger foundation_block_write;
-- Truncate gate, all commercial gates and all direct DML grants remain unchanged.

create function private.write_staff_profile(actor_id uuid,target_id uuid,target_name text,target_role text,target_active boolean,bootstrap boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := actor_id; before_row public.profiles; op text;
begin
 -- Single lock serializes bootstrap, role/active changes and the last-admin invariant.
 perform pg_catalog.pg_advisory_xact_lock(630017);
 if target_role not in ('admin','atendente') or target_active is null or target_id is null
   or target_name is null or char_length(btrim(target_name)) not between 2 and 80 then
   raise exception 'Invalid profile input' using errcode='22023';
 end if;
 if bootstrap then
   -- This function has no API EXECUTE grants. The owner-only wrapper is the sole bootstrap entry.
   if exists(select 1 from public.profiles where role='admin' and active) then
     raise exception 'Bootstrap already completed' using errcode='42501';
   end if;
   if exists(select 1 from public.profiles where id=target_id) then
     raise exception 'Profile already exists' using errcode='42501';
   end if;
   op := 'bootstrap';
 else
   if not exists(select 1 from public.profiles where id=actor and active and role='admin') then
     raise exception 'Active administrator required' using errcode='42501';
   end if;
   if target_id=actor then raise exception 'Self changes forbidden' using errcode='42501'; end if;
   select * into before_row from public.profiles where id=target_id for update;
   op := case when found then 'change' else 'link' end;
   if before_row.active and before_row.role='admin' and (not target_active or target_role<>'admin')
     and (select count(*) from public.profiles where active and role='admin') <= 1 then
     raise exception 'Last administrator must remain active' using errcode='42501';
   end if;
 end if;
 insert into public.profiles(id,full_name,role,active) values(target_id,btrim(target_name),target_role,target_active)
 on conflict(id) do update set full_name=excluded.full_name,role=excluded.role,active=excluded.active;
 insert into private.staff_access_audit(actor_id,target_id,operation,previous_role,new_role,previous_active,new_active)
 values(case when bootstrap then null else actor end,target_id,op,before_row.role,target_role,before_row.active,target_active);
exception when foreign_key_violation then
 raise exception 'Existing Auth identity required' using errcode='22023';
end $$;
-- Grant CREATE temporarily so the role can own only these reviewed functions; remove below.
grant vila_rica_staff_writer to postgres;
grant create on schema private to vila_rica_staff_writer;
alter function private.write_staff_profile(uuid,uuid,text,text,boolean,boolean) owner to vila_rica_staff_writer;
revoke all on function private.write_staff_profile(uuid,uuid,text,text,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function private.write_staff_profile(uuid,uuid,text,text,boolean,boolean) to postgres;

create function public.manage_staff_profile(target_id uuid,target_name text,target_role text,target_active boolean)
returns void language sql security definer set search_path = '' as $$
 select private.write_staff_profile(auth.uid(),target_id,target_name,target_role,target_active,false);
$$;

revoke all on function public.manage_staff_profile(uuid,text,text,boolean) from public,anon,service_role;
grant execute on function public.manage_staff_profile(uuid,text,text,boolean) to authenticated;

-- Owner-only, no signup trigger, no public endpoint, no automatic bootstrap.
create function private.bootstrap_staff_admin(target_id uuid,target_name text)
returns void language sql security definer set search_path = '' as $$
 select private.write_staff_profile(null,target_id,target_name,'admin',true,true);
$$;

revoke all on function private.bootstrap_staff_admin(uuid,text) from public,anon,authenticated,service_role;
grant execute on function private.bootstrap_staff_admin(uuid,text) to postgres;
revoke create on schema public,private from vila_rica_staff_writer;
revoke vila_rica_staff_writer from postgres;
commit;
