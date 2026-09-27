-- M5: manual project updates (docs/PLAN.md D7, D8, §4). Separate from the
-- auto-generated activity log: editable free text plus an optional "next
-- step", posted by the project's owner or an admin.

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  next_step text check (next_step is null or char_length(next_step) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_updates_project_idx
  on public.project_updates (project_id, created_at desc);
create index project_updates_workspace_idx
  on public.project_updates (workspace_id, created_at desc);

create trigger project_updates_set_updated_at
  before update on public.project_updates
  for each row execute function public.set_updated_at();

-- workspace_id is copied from the project, the same way prepare_task() does it.
create or replace function public.prepare_project_update()
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

create trigger project_updates_prepare
  before insert or update of project_id on public.project_updates
  for each row execute function public.prepare_project_update();

revoke all on public.project_updates from anon;

-- ---------------------------------------------------------------------------
-- Row Level Security: members read; the project's owner or an admin posts,
-- edits and deletes (docs/PLAN.md §10). Nobody posts in someone else's name.
-- ---------------------------------------------------------------------------
alter table public.project_updates enable row level security;

create policy "project_updates_select_member" on public.project_updates
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "project_updates_insert_editor" on public.project_updates
  for insert to authenticated
  with check (public.can_edit_project(project_id) and author_id = auth.uid());

create policy "project_updates_update_editor" on public.project_updates
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "project_updates_delete_editor" on public.project_updates
  for delete to authenticated
  using (public.can_edit_project(project_id));
