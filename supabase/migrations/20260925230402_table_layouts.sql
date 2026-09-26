-- M3: table layouts, per-person row order and filters, row-move RPCs
-- (docs/PLAN.md §4 "table_layouts" and §8 "Who sees what").

create type public.table_density as enum ('compact', 'default', 'comfortable');

-- ---------------------------------------------------------------------------
-- table_layouts: one shared row per table (user_id null) plus optional
-- personal rows. Which one applies depends on workspace_settings.layout_sharing.
-- ---------------------------------------------------------------------------
create table public.table_layouts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  table_key text not null check (table_key in ('projects', 'tasks', 'milestones', 'report')),
  column_order text[] not null default '{}',
  column_widths jsonb not null default '{}'::jsonb,
  hidden_columns text[] not null default '{}',
  sort jsonb not null default '[]'::jsonb,
  density public.table_density not null default 'default',
  row_height_px integer check (row_height_px is null or row_height_px between 24 and 240),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index table_layouts_shared_unique
  on public.table_layouts (workspace_id, table_key)
  where user_id is null;

create unique index table_layouts_personal_unique
  on public.table_layouts (workspace_id, table_key, user_id)
  where user_id is not null;

create trigger table_layouts_set_updated_at
  before update on public.table_layouts
  for each row execute function public.set_updated_at();

-- Row order that only applies in "everything personal" mode.
create table public.user_row_ranks (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  table_key text not null,
  row_id uuid not null,
  rank text not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id, table_key, row_id)
);

-- Filters are always per person (docs/PLAN.md D25).
create table public.user_table_filters (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  table_key text not null,
  filters jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id, table_key)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.layout_sharing(ws uuid)
returns public.layout_sharing
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.layout_sharing from public.workspace_settings s where s.workspace_id = ws),
    'shared'::public.layout_sharing
  )
$$;

-- Shared layout and shared row order: any member in "shared" mode, admins always.
create or replace function public.can_edit_shared_layout(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_workspace_admin(ws)
      or (public.is_workspace_member(ws) and public.layout_sharing(ws) = 'shared')
$$;

-- Shared row order is also editable by members in "split" mode (row order is
-- the one thing split keeps shared).
create or replace function public.can_edit_shared_order(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_workspace_admin(ws)
      or (public.is_workspace_member(ws) and public.layout_sharing(ws) in ('shared', 'split'))
$$;

-- ---------------------------------------------------------------------------
-- RPCs. Moving a project touches its rank (a layout concern any member may
-- change in shared/split mode) and possibly its department (an edit that
-- follows the project's edit permission), so it runs as SECURITY DEFINER with
-- explicit checks instead of relying on the projects UPDATE policy.
-- ---------------------------------------------------------------------------
create or replace function public.move_project(
  p_project uuid,
  p_rank text default null,
  p_department uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid;
  v_dept uuid;
begin
  select workspace_id, department_id into v_ws, v_dept from public.projects where id = p_project;
  if v_ws is null or not public.is_workspace_member(v_ws) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_department is not null and p_department <> v_dept then
    if not public.can_edit_project(p_project) then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.departments d
      where d.id = p_department and d.workspace_id = v_ws and d.archived_at is null
    ) then
      raise exception 'department_not_found' using errcode = '23503';
    end if;
    update public.projects set department_id = p_department where id = p_project;
  end if;

  if p_rank is not null then
    if not public.can_edit_shared_order(v_ws) then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
    update public.projects set rank = p_rank where id = p_project;
  end if;
end
$$;

-- Bulk rank rewrite, used when a drag happens while the table is sorted:
-- the visible order becomes the manual order (docs/PLAN.md D26).
create or replace function public.set_project_ranks(p_ranks jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid;
  v_count integer := 0;
  r record;
begin
  select distinct p.workspace_id into strict v_ws
  from public.projects p
  where p.id in (select (e->>'id')::uuid from jsonb_array_elements(p_ranks) e);

  if not public.can_edit_shared_order(v_ws) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  for r in select (e->>'id')::uuid as id, e->>'rank' as rank from jsonb_array_elements(p_ranks) e loop
    update public.projects set rank = r.rank where id = r.id and workspace_id = v_ws;
    v_count := v_count + 1;
  end loop;
  return v_count;
exception
  when too_many_rows then
    raise exception 'mixed_workspaces' using errcode = '42501';
end
$$;

revoke all on public.table_layouts, public.user_row_ranks, public.user_table_filters from anon;
revoke all on function
  public.layout_sharing(uuid),
  public.can_edit_shared_layout(uuid),
  public.can_edit_shared_order(uuid),
  public.move_project(uuid, text, uuid),
  public.set_project_ranks(jsonb)
from public, anon;
grant execute on function
  public.layout_sharing(uuid),
  public.can_edit_shared_layout(uuid),
  public.can_edit_shared_order(uuid),
  public.move_project(uuid, text, uuid),
  public.set_project_ranks(jsonb)
to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.table_layouts enable row level security;
alter table public.user_row_ranks enable row level security;
alter table public.user_table_filters enable row level security;

create policy "layouts_select" on public.table_layouts
  for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    and (user_id is null or user_id = (select auth.uid()))
  );

create policy "layouts_insert" on public.table_layouts
  for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
    or (user_id is null and public.can_edit_shared_layout(workspace_id))
  );

create policy "layouts_update" on public.table_layouts
  for update to authenticated
  using (
    (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
    or (user_id is null and public.can_edit_shared_layout(workspace_id))
  )
  with check (
    (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
    or (user_id is null and public.can_edit_shared_layout(workspace_id))
  );

create policy "layouts_delete" on public.table_layouts
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
    or (user_id is null and public.can_edit_shared_layout(workspace_id))
  );

create policy "row_ranks_own" on public.user_row_ranks
  for all to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

create policy "table_filters_own" on public.user_table_filters
  for all to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
