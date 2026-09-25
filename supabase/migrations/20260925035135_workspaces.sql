-- M1: identity, workspaces, membership, invites, departments, settings.
-- docs/PLAN.md §4 (data model), §10 (roles). Every table carries workspace_id
-- (or is the profile of a user) and is protected by RLS through the helpers below.

create extension if not exists pgcrypto with schema extensions;

create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.layout_sharing as enum ('shared', 'split', 'personal');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, kept in sync by trigger
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  email text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Google sign-in puts the name under full_name/name and the photo under
-- avatar_url/picture. A name the user later edits in the app is preserved.
create or replace function public.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update set
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    display_name = case
      when public.profiles.display_name = '' then excluded.display_name
      else public.profiles.display_name
    end;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_change();

create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_change();

-- ---------------------------------------------------------------------------
-- workspaces, members, settings
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  -- lowercase letters, digits and hyphens; 1–40 chars; no leading/trailing hyphen
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  timezone text not null default 'America/New_York',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- Exactly one owner per workspace.
create unique index workspace_members_one_owner
  on public.workspace_members (workspace_id)
  where role = 'owner';

create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  layout_sharing public.layout_sharing not null default 'shared',
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger workspace_settings_set_updated_at
  before update on public.workspace_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- invites: single-use links, copied by an admin and pasted to the invitee
-- ---------------------------------------------------------------------------
create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  label text check (label is null or char_length(label) <= 80),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index workspace_invites_workspace_idx on public.workspace_invites (workspace_id);

-- ---------------------------------------------------------------------------
-- departments: exactly one per project (M2); ordered by fractional rank
-- ---------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  rank text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index departments_active_name_unique
  on public.departments (workspace_id, lower(name))
  where archived_at is null;

create index departments_workspace_rank_idx on public.departments (workspace_id, rank);

create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers. SECURITY DEFINER so policies on workspace_members can call them
-- without recursing into their own policy.
-- ---------------------------------------------------------------------------
create or replace function public.workspace_role(ws uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.workspace_members m
  where m.workspace_id = ws and m.user_id = auth.uid()
$$;

create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  )
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.workspace_role(ws) in ('owner', 'admin'), false)
$$;

create or replace function public.shares_workspace_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members me
    join public.workspace_members them on them.workspace_id = me.workspace_id
    where me.user_id = auth.uid() and them.user_id = other_user
  )
$$;

-- ---------------------------------------------------------------------------
-- RPCs. Creating a workspace and accepting an invite each touch several tables
-- and need rows the caller can't yet see, so they run as SECURITY DEFINER.
-- ---------------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_slug text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ws public.workspaces;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (p_name, p_slug, v_uid)
  returning * into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_ws.id, v_uid, 'owner');

  insert into public.workspace_settings (workspace_id, updated_by)
  values (v_ws.id, v_uid);

  return v_ws;
end
$$;

-- What the invite landing page shows before the user accepts. Never lists
-- invites; requires the exact token.
create or replace function public.invite_preview(p_token text)
returns table (
  status text,
  workspace_name text,
  workspace_slug text,
  role public.workspace_role
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.workspace_invites;
  v_ws public.workspaces;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_inv from public.workspace_invites i where i.token = p_token;
  if not found then
    return query select 'not_found'::text, null::text, null::text, null::public.workspace_role;
    return;
  end if;

  select * into v_ws from public.workspaces w where w.id = v_inv.workspace_id;

  return query select
    case
      when exists (
        select 1 from public.workspace_members m
        where m.workspace_id = v_inv.workspace_id and m.user_id = v_uid
      ) then 'already_member'
      when v_inv.revoked_at is not null then 'revoked'
      when v_inv.accepted_at is not null then 'used'
      when v_inv.expires_at < now() then 'expired'
      else 'valid'
    end,
    v_ws.name,
    v_ws.slug,
    v_inv.role;
end
$$;

create or replace function public.accept_invite(p_token text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.workspace_invites;
  v_ws public.workspaces;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_inv from public.workspace_invites i where i.token = p_token for update;
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;

  select * into v_ws from public.workspaces w where w.id = v_inv.workspace_id;

  -- Already a member: nothing to do and the link stays unused.
  if exists (
    select 1 from public.workspace_members m
    where m.workspace_id = v_inv.workspace_id and m.user_id = v_uid
  ) then
    return v_ws;
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'invite_revoked' using errcode = 'P0001';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'invite_used' using errcode = 'P0001';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, v_inv.role);

  update public.workspace_invites
  set accepted_by = v_uid, accepted_at = now()
  where id = v_inv.id;

  return v_ws;
end
$$;

-- ---------------------------------------------------------------------------
-- Privileges: the app only ever talks to these tables as a signed-in user.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from public, anon;
grant execute on function
  public.workspace_role(uuid),
  public.is_workspace_member(uuid),
  public.is_workspace_admin(uuid),
  public.shares_workspace_with(uuid),
  public.create_workspace(text, text),
  public.invite_preview(text),
  public.accept_invite(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.departments enable row level security;

-- profiles: your own, plus anyone who shares a workspace with you
create policy "profiles_select_self_or_colleague" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- workspaces: members read; admins edit; created only through create_workspace()
create policy "workspaces_select_member" on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id));

create policy "workspaces_update_admin" on public.workspaces
  for update to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

-- members: members read; admins change roles and remove non-owners; anyone
-- may leave except the owner. Rows are inserted only through accept_invite()
-- and create_workspace().
create policy "members_select_member" on public.workspace_members
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members_update_admin" on public.workspace_members
  for update to authenticated
  using (public.is_workspace_admin(workspace_id) and role <> 'owner')
  with check (public.is_workspace_admin(workspace_id) and role <> 'owner');

create policy "members_delete_admin_or_self" on public.workspace_members
  for delete to authenticated
  using (
    role <> 'owner'
    and (public.is_workspace_admin(workspace_id) or user_id = (select auth.uid()))
  );

-- settings: members read; admins edit
create policy "settings_select_member" on public.workspace_settings
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "settings_update_admin" on public.workspace_settings
  for update to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- invites: admins only. Invitees go through invite_preview()/accept_invite().
create policy "invites_select_admin" on public.workspace_invites
  for select to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "invites_insert_admin" on public.workspace_invites
  for insert to authenticated
  with check (public.is_workspace_admin(workspace_id) and role <> 'owner');

create policy "invites_update_admin" on public.workspace_invites
  for update to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id) and role <> 'owner');

create policy "invites_delete_admin" on public.workspace_invites
  for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

-- departments: members read; admins manage
create policy "departments_select_member" on public.departments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "departments_insert_admin" on public.departments
  for insert to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy "departments_update_admin" on public.departments
  for update to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "departments_delete_admin" on public.departments
  for delete to authenticated
  using (public.is_workspace_admin(workspace_id));
