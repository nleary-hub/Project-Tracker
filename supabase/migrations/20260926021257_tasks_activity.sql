-- M4b: tasks and the activity log (docs/PLAN.md §4, §10). Activity rows are
-- written by triggers so the report's "activity this period" can't drift
-- from the real data.

create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assignee_id uuid references public.people (id) on delete set null,
  due_date date,
  completed_at timestamptz,
  rank text not null,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_rank_idx on public.tasks (project_id, rank);
create index tasks_open_assignee_idx
  on public.tasks (workspace_id, assignee_id)
  where status <> 'done';
create index tasks_open_due_idx
  on public.tasks (workspace_id, due_date)
  where status <> 'done';

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- workspace_id is copied from the project; the milestone must belong to the
-- same project; the assignee must belong to the workspace; completed_at
-- follows the status.
create or replace function public.prepare_task()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select p.workspace_id into new.workspace_id from public.projects p where p.id = new.project_id;
  if new.workspace_id is null then
    raise exception 'project_not_found' using errcode = '23503';
  end if;
  if new.milestone_id is not null and not exists (
    select 1 from public.milestones m where m.id = new.milestone_id and m.project_id = new.project_id
  ) then
    raise exception 'milestone_project_mismatch' using errcode = '23503';
  end if;
  if not public.person_in_workspace(new.assignee_id, new.workspace_id) then
    raise exception 'person_workspace_mismatch' using errcode = '23503';
  end if;
  if new.status = 'done' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end
$$;

create trigger tasks_prepare
  before insert or update on public.tasks
  for each row execute function public.prepare_task();

-- ---------------------------------------------------------------------------
-- activity_events
-- ---------------------------------------------------------------------------
create type public.activity_kind as enum (
  'project_created',
  'project_status_changed',
  'project_owner_changed',
  'project_department_changed',
  'project_health_overridden',
  'milestone_created',
  'milestone_completed',
  'milestone_reopened',
  'milestone_date_changed',
  'milestone_deleted',
  'task_created',
  'task_completed',
  'task_reopened',
  'task_status_changed',
  'task_assigned',
  'task_date_changed',
  'task_deleted'
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  kind public.activity_kind not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_project_idx on public.activity_events (project_id, created_at desc);
create index activity_events_workspace_idx on public.activity_events (workspace_id, created_at desc);

create or replace function public.log_activity(
  p_workspace uuid,
  p_project uuid,
  p_kind public.activity_kind,
  p_payload jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_events (workspace_id, project_id, actor_id, kind, payload)
  values (p_workspace, p_project, auth.uid(), p_kind, coalesce(p_payload, '{}'::jsonb))
$$;

create or replace function public.person_name(p uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pe.name from public.people pe where pe.id = p
$$;

-- Projects: creation (real rows only), status, owner, department, override.
create or replace function public.log_project_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not new.is_demo then
      perform public.log_activity(new.workspace_id, new.id, 'project_created',
        jsonb_build_object('name', new.name));
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    perform public.log_activity(new.workspace_id, new.id, 'project_status_changed',
      jsonb_build_object('name', new.name, 'from', old.status, 'to', new.status));
  end if;
  if new.owner_id is distinct from old.owner_id then
    perform public.log_activity(new.workspace_id, new.id, 'project_owner_changed',
      jsonb_build_object('name', new.name,
        'from', public.person_name(old.owner_id), 'to', public.person_name(new.owner_id)));
  end if;
  if new.department_id is distinct from old.department_id then
    perform public.log_activity(new.workspace_id, new.id, 'project_department_changed',
      jsonb_build_object('name', new.name,
        'from', (select d.name from public.departments d where d.id = old.department_id),
        'to', (select d.name from public.departments d where d.id = new.department_id)));
  end if;
  if new.health_override is distinct from old.health_override
     or new.health_override_reason is distinct from old.health_override_reason then
    perform public.log_activity(new.workspace_id, new.id, 'project_health_overridden',
      jsonb_build_object('name', new.name, 'health', new.health_override,
        'reason', new.health_override_reason));
  end if;
  return new;
end
$$;

create trigger projects_log_activity
  after insert or update on public.projects
  for each row execute function public.log_project_activity();

-- Milestones: creation (real rows only), complete / reopen, re-dating, deletion.
-- Deletions that cascade from a project delete are skipped: the project row
-- is already gone, so there is nothing to attach the event to.
create or replace function public.log_milestone_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.projects p where p.id = old.project_id) then
      perform public.log_activity(old.workspace_id, old.project_id, 'milestone_deleted',
        jsonb_build_object('name', old.name));
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if not new.is_demo then
      perform public.log_activity(new.workspace_id, new.project_id, 'milestone_created',
        jsonb_build_object('name', new.name, 'due', new.due_date));
    end if;
    return new;
  end if;

  if old.completed_at is null and new.completed_at is not null then
    perform public.log_activity(new.workspace_id, new.project_id, 'milestone_completed',
      jsonb_build_object('name', new.name));
  elsif old.completed_at is not null and new.completed_at is null then
    perform public.log_activity(new.workspace_id, new.project_id, 'milestone_reopened',
      jsonb_build_object('name', new.name));
  end if;
  if new.due_date is distinct from old.due_date then
    perform public.log_activity(new.workspace_id, new.project_id, 'milestone_date_changed',
      jsonb_build_object('name', new.name, 'from', old.due_date, 'to', new.due_date));
  end if;
  return new;
end
$$;

create trigger milestones_log_activity
  after insert or update or delete on public.milestones
  for each row execute function public.log_milestone_activity();

-- Tasks: creation (real rows only), status changes, assignment, re-dating, deletion.
create or replace function public.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.projects p where p.id = old.project_id) then
      perform public.log_activity(old.workspace_id, old.project_id, 'task_deleted',
        jsonb_build_object('title', old.title));
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if not new.is_demo then
      perform public.log_activity(new.workspace_id, new.project_id, 'task_created',
        jsonb_build_object('title', new.title, 'assignee', public.person_name(new.assignee_id)));
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'done' then
      perform public.log_activity(new.workspace_id, new.project_id, 'task_completed',
        jsonb_build_object('title', new.title));
    elsif old.status = 'done' then
      perform public.log_activity(new.workspace_id, new.project_id, 'task_reopened',
        jsonb_build_object('title', new.title, 'to', new.status));
    else
      perform public.log_activity(new.workspace_id, new.project_id, 'task_status_changed',
        jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status));
    end if;
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    perform public.log_activity(new.workspace_id, new.project_id, 'task_assigned',
      jsonb_build_object('title', new.title,
        'from', public.person_name(old.assignee_id), 'to', public.person_name(new.assignee_id)));
  end if;
  if new.due_date is distinct from old.due_date then
    perform public.log_activity(new.workspace_id, new.project_id, 'task_date_changed',
      jsonb_build_object('title', new.title, 'from', old.due_date, 'to', new.due_date));
  end if;
  return new;
end
$$;

create trigger tasks_log_activity
  after insert or update or delete on public.tasks
  for each row execute function public.log_task_activity();

-- ---------------------------------------------------------------------------
-- Row-move RPCs, mirroring move_project / set_project_ranks. Any member may
-- move a task between milestones (tasks are editable by every member, §10);
-- the shared rank follows the layout-sharing rules.
-- ---------------------------------------------------------------------------
create or replace function public.move_task(
  p_task uuid,
  p_rank text default null,
  p_milestone uuid default null,
  p_set_milestone boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid;
  v_project uuid;
begin
  select workspace_id, project_id into v_ws, v_project from public.tasks where id = p_task;
  if v_ws is null or not public.is_workspace_member(v_ws) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_set_milestone then
    if p_milestone is not null and not exists (
      select 1 from public.milestones m where m.id = p_milestone and m.project_id = v_project
    ) then
      raise exception 'milestone_not_found' using errcode = '23503';
    end if;
    update public.tasks set milestone_id = p_milestone where id = p_task;
  end if;

  if p_rank is not null then
    if not public.can_edit_shared_order(v_ws) then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
    update public.tasks set rank = p_rank where id = p_task;
  end if;
end
$$;

create or replace function public.set_task_ranks(p_ranks jsonb)
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
  select distinct t.workspace_id into strict v_ws
  from public.tasks t
  where t.id in (select (e->>'id')::uuid from jsonb_array_elements(p_ranks) e);

  if not public.can_edit_shared_order(v_ws) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  for r in select (e->>'id')::uuid as id, e->>'rank' as rank from jsonb_array_elements(p_ranks) e loop
    update public.tasks set rank = r.rank where id = r.id and workspace_id = v_ws;
    v_count := v_count + 1;
  end loop;
  return v_count;
exception
  when too_many_rows then
    raise exception 'mixed_workspaces' using errcode = '42501';
end
$$;

revoke all on public.tasks, public.activity_events from anon;
revoke all on function
  public.log_activity(uuid, uuid, public.activity_kind, jsonb),
  public.person_name(uuid),
  public.move_task(uuid, text, uuid, boolean),
  public.set_task_ranks(jsonb)
from public, anon;
-- log_activity is only ever called from triggers.
revoke execute on function public.log_activity(uuid, uuid, public.activity_kind, jsonb) from authenticated;
grant execute on function
  public.person_name(uuid),
  public.move_task(uuid, text, uuid, boolean),
  public.set_task_ranks(jsonb)
to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security. Tasks: every member reads, creates and edits (§10);
-- deleting takes the creator, the assignee, or a project editor. Activity:
-- members read; nothing but the triggers writes.
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;
alter table public.activity_events enable row level security;

create policy "tasks_select_member" on public.tasks
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "tasks_insert_member" on public.tasks
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "tasks_update_member" on public.tasks
  for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "tasks_delete_involved" on public.tasks
  for delete to authenticated
  using (
    created_by = auth.uid()
    or assignee_id = public.my_person_id(workspace_id)
    or public.can_edit_project(project_id)
  );

create policy "activity_select_member" on public.activity_events
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
