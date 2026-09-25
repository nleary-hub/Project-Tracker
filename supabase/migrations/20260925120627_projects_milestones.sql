-- M2: projects and milestones (docs/PLAN.md §4, §10) and demo-data support (D23).

create type public.project_status as enum ('active', 'on_hold', 'completed', 'cancelled');
create type public.health_status as enum ('on_track', 'at_risk', 'off_track');

-- Demo rows are flagged so "wipe demo data" removes exactly those and nothing real.
alter table public.departments add column is_demo boolean not null default false;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  owner_id uuid references auth.users (id) on delete set null,
  status public.project_status not null default 'active',
  start_date date,
  due_date date,
  health_override public.health_status,
  health_override_reason text,
  health_override_expires_at timestamptz,
  rank text not null,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_dates_ordered
    check (start_date is null or due_date is null or start_date <= due_date),
  constraint projects_override_needs_reason
    check (health_override is null or coalesce(health_override_reason, '') <> '')
);

create index projects_workspace_department_rank_idx
  on public.projects (workspace_id, department_id, rank);
create index projects_owner_idx on public.projects (owner_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- A project's department must belong to the same workspace.
create or replace function public.enforce_project_department()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.departments d
    where d.id = new.department_id and d.workspace_id = new.workspace_id
  ) then
    raise exception 'department_workspace_mismatch' using errcode = '23503';
  end if;
  return new;
end
$$;

create trigger projects_enforce_department
  before insert or update of department_id, workspace_id on public.projects
  for each row execute function public.enforce_project_department();

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  due_date date,
  owner_id uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  rank text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index milestones_project_rank_idx on public.milestones (project_id, rank);
create index milestones_open_due_idx
  on public.milestones (workspace_id, due_date)
  where completed_at is null;

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

-- workspace_id is denormalized for RLS and always copied from the project.
create or replace function public.set_milestone_workspace()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select p.workspace_id into new.workspace_id from public.projects p where p.id = new.project_id;
  if new.workspace_id is null then
    raise exception 'project_not_found' using errcode = '23503';
  end if;
  return new;
end
$$;

create trigger milestones_set_workspace
  before insert or update of project_id on public.milestones
  for each row execute function public.set_milestone_workspace();

-- ---------------------------------------------------------------------------
-- Helpers and RPCs
-- ---------------------------------------------------------------------------

-- Project owner or a workspace admin (docs/PLAN.md §10).
create or replace function public.can_edit_project(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects pr
    where pr.id = p
      and (pr.owner_id = auth.uid() or public.is_workspace_admin(pr.workspace_id))
  )
$$;

-- Removes every demo row in one transaction. Demo departments stay if a real
-- project was moved into them.
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

  return query select v_projects, v_departments;
end
$$;

revoke all on public.projects, public.milestones from anon;
revoke all on function public.can_edit_project(uuid), public.wipe_demo_data(uuid) from public, anon;
grant execute on function public.can_edit_project(uuid), public.wipe_demo_data(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.milestones enable row level security;

-- projects: members read and create; the owner or an admin edits and deletes
create policy "projects_select_member" on public.projects
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "projects_insert_member" on public.projects
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "projects_update_owner_or_admin" on public.projects
  for update to authenticated
  using (public.can_edit_project(id))
  with check (public.is_workspace_member(workspace_id));

create policy "projects_delete_owner_or_admin" on public.projects
  for delete to authenticated
  using (public.can_edit_project(id));

-- milestones: members read; the project's owner or an admin manages them
create policy "milestones_select_member" on public.milestones
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "milestones_insert_editor" on public.milestones
  for insert to authenticated
  with check (public.can_edit_project(project_id));

create policy "milestones_update_editor" on public.milestones
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "milestones_delete_editor" on public.milestones
  for delete to authenticated
  using (public.can_edit_project(project_id));
