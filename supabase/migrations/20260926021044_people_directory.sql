-- M4a: the people directory (docs/PLAN.md D31). Project owners, milestone
-- owners and task assignees are *people*, who may or may not be registered
-- users. Every workspace member gets a person row automatically; anyone can
-- add an owner who never signs in.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or (char_length(email) <= 254 and position('@' in email) > 1)),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index people_workspace_user_unique
  on public.people (workspace_id, user_id)
  where user_id is not null;
create index people_workspace_name_idx on public.people (workspace_id, lower(name));

create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Members are people: created with the membership, kept in sync with the profile.
-- ---------------------------------------------------------------------------
create or replace function public.sync_member_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_email text;
begin
  select coalesce(nullif(p.display_name, ''), p.email), p.email
    into v_name, v_email
  from public.profiles p where p.id = new.user_id;

  insert into public.people (workspace_id, user_id, name, email)
  values (new.workspace_id, new.user_id, coalesce(v_name, 'Member'), v_email)
  on conflict (workspace_id, user_id) where user_id is not null
  do update set name = excluded.name, email = excluded.email;
  return new;
end
$$;

create trigger workspace_members_sync_person
  after insert on public.workspace_members
  for each row execute function public.sync_member_person();

create or replace function public.sync_profile_people()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.people
  set name = coalesce(nullif(new.display_name, ''), new.email), email = new.email
  where user_id = new.id;
  return new;
end
$$;

create trigger profiles_sync_people
  after update of display_name, email on public.profiles
  for each row execute function public.sync_profile_people();

-- Backfill existing members.
insert into public.people (workspace_id, user_id, name, email)
select m.workspace_id, m.user_id, coalesce(nullif(p.display_name, ''), p.email, 'Member'), p.email
from public.workspace_members m
left join public.profiles p on p.id = m.user_id;

-- ---------------------------------------------------------------------------
-- Re-point owner columns from auth.users to people.
-- ---------------------------------------------------------------------------
alter table public.projects drop constraint projects_owner_id_fkey;
update public.projects pr
set owner_id = pe.id
from public.people pe
where pe.workspace_id = pr.workspace_id and pe.user_id = pr.owner_id;
update public.projects
set owner_id = null
where owner_id is not null
  and not exists (select 1 from public.people pe where pe.id = projects.owner_id);
alter table public.projects
  add constraint projects_owner_id_fkey
  foreign key (owner_id) references public.people (id) on delete set null;

alter table public.milestones drop constraint milestones_owner_id_fkey;
update public.milestones m
set owner_id = pe.id
from public.people pe
where pe.workspace_id = m.workspace_id and pe.user_id = m.owner_id;
update public.milestones
set owner_id = null
where owner_id is not null
  and not exists (select 1 from public.people pe where pe.id = milestones.owner_id);
alter table public.milestones
  add constraint milestones_owner_id_fkey
  foreign key (owner_id) references public.people (id) on delete set null;

-- A person referenced by a row must belong to that row's workspace.
create or replace function public.person_in_workspace(p_person uuid, p_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_person is null
    or exists (select 1 from public.people pe where pe.id = p_person and pe.workspace_id = p_workspace)
$$;

create or replace function public.enforce_owner_workspace()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.person_in_workspace(new.owner_id, new.workspace_id) then
    raise exception 'person_workspace_mismatch' using errcode = '23503';
  end if;
  return new;
end
$$;

create trigger projects_enforce_owner
  before insert or update of owner_id on public.projects
  for each row execute function public.enforce_owner_workspace();

-- milestones.workspace_id is set by an earlier BEFORE trigger (alphabetical
-- order: "milestones_enforce_owner" would run before "milestones_set_workspace"),
-- so this one reads the project's workspace directly.
create or replace function public.enforce_milestone_owner_workspace()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ws uuid;
begin
  select workspace_id into v_ws from public.projects where id = new.project_id;
  if not public.person_in_workspace(new.owner_id, v_ws) then
    raise exception 'person_workspace_mismatch' using errcode = '23503';
  end if;
  return new;
end
$$;

create trigger milestones_enforce_owner
  before insert or update of owner_id on public.milestones
  for each row execute function public.enforce_milestone_owner_workspace();

-- "Project owner" edit rights now go through the person's linked user.
create or replace function public.can_edit_project(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects pr
    left join public.people pe on pe.id = pr.owner_id
    where pr.id = p
      and (pe.user_id = auth.uid() or public.is_workspace_admin(pr.workspace_id))
  )
$$;

-- The signed-in user's person row in a workspace (null for non-members).
create or replace function public.my_person_id(ws uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pe.id from public.people pe where pe.workspace_id = ws and pe.user_id = auth.uid()
$$;

-- Demo owners are people too; the wipe removes them with the rest.
create or replace function public.wipe_demo_data(ws uuid)
returns table (projects_removed integer, departments_removed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_projects integer;
  v_departments integer;
begin
  if not public.is_workspace_admin(ws) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  delete from public.projects where workspace_id = ws and is_demo;
  get diagnostics v_projects = row_count;

  delete from public.departments d
  where d.workspace_id = ws and d.is_demo
    and not exists (select 1 from public.projects p where p.department_id = d.id);
  get diagnostics v_departments = row_count;

  delete from public.people pe
  where pe.workspace_id = ws and pe.is_demo and pe.user_id is null
    and not exists (select 1 from public.projects p where p.owner_id = pe.id)
    and not exists (select 1 from public.milestones m where m.owner_id = pe.id);

  return query select v_projects, v_departments;
end
$$;

revoke all on public.people from anon;
revoke all on function
  public.person_in_workspace(uuid, uuid),
  public.my_person_id(uuid)
from public, anon;
grant execute on function
  public.person_in_workspace(uuid, uuid),
  public.my_person_id(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: members read and add unlinked people; admins edit and
-- delete unlinked people. Linked rows are managed by the triggers above.
-- ---------------------------------------------------------------------------
alter table public.people enable row level security;

create policy "people_select_member" on public.people
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "people_insert_member" on public.people
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and user_id is null);

create policy "people_update_admin" on public.people
  for update to authenticated
  using (public.is_workspace_admin(workspace_id) and user_id is null)
  with check (public.is_workspace_admin(workspace_id) and user_id is null);

create policy "people_delete_admin" on public.people
  for delete to authenticated
  using (public.is_workspace_admin(workspace_id) and user_id is null);
