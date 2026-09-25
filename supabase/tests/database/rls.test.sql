-- pgTAP checks for the M1 policies (docs/PLAN.md §10). Run locally with
-- `pnpm exec supabase test db` (needs Docker); CI runs the same command.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- Two throwaway users. Inserting into auth.users fires the profile trigger.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated',
   'authenticated', 'alice@example.test', '', now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Alice Test"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated',
   'authenticated', 'bob@example.test', '', now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Bob Test"}', now(), now(), '', '', '', '');

select is(
  (select count(*) from public.profiles where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2::bigint,
  'profiles are created for new auth users'
);

-- Act as Alice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

create temp table ctx as
  select (public.create_workspace('Acme Test', 'acme-test')).id as ws;

select is(public.workspace_role((select ws from ctx)), 'owner', 'creator becomes owner');

insert into public.departments (workspace_id, name, rank) values ((select ws from ctx), 'Marketing', 'a0');

create temp table inv (token text);
with created as (
  insert into public.workspace_invites (workspace_id, role)
  values ((select ws from ctx), 'member')
  returning token
)
insert into inv select token from created;

select is((select count(*) from public.workspace_invites where workspace_id = (select ws from ctx)), 1::bigint, 'admin sees the invite');

-- Act as Bob, who is not a member.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is((select count(*) from public.workspaces where id = (select ws from ctx)), 0::bigint, 'non-member cannot see the workspace');
select is((select count(*) from public.departments where workspace_id = (select ws from ctx)), 0::bigint, 'non-member cannot see departments');
select is((select count(*) from public.workspace_members where workspace_id = (select ws from ctx)), 0::bigint, 'non-member cannot see members');
select is((select count(*) from public.workspace_invites where workspace_id = (select ws from ctx)), 0::bigint, 'non-member cannot see invites');
select is((select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'non-member cannot see a stranger''s profile');
select throws_ok(
  $$insert into public.departments (workspace_id, name, rank) values ((select ws from ctx), 'Hack', 'a1')$$,
  '42501',
  null,
  'non-member cannot insert a department'
);

-- Bob previews and accepts the invite.
select is((select status from public.invite_preview((select token from inv))), 'valid', 'invite preview is valid');
select lives_ok($$select public.accept_invite((select token from inv))$$, 'invitee can accept');
select is(public.workspace_role((select ws from ctx)), 'member', 'invitee becomes a member');

select is((select count(*) from public.workspaces where id = (select ws from ctx)), 1::bigint, 'member sees the workspace');
select is((select count(*) from public.departments where workspace_id = (select ws from ctx)), 1::bigint, 'member sees departments');
select is((select count(*) from public.workspace_invites where workspace_id = (select ws from ctx)), 0::bigint, 'member cannot see invites');
select is((select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 1::bigint, 'member sees a colleague''s profile');
select throws_ok(
  $$insert into public.departments (workspace_id, name, rank) values ((select ws from ctx), 'Hack2', 'a2')$$,
  '42501',
  null,
  'member cannot insert a department'
);

-- Members cannot escalate or remove the owner: RLS filters the rows, so nothing changes.
update public.workspace_members set role = 'admin'
  where workspace_id = (select ws from ctx) and user_id = '22222222-2222-2222-2222-222222222222';
select is(public.workspace_role((select ws from ctx)), 'member', 'member cannot promote themselves');

delete from public.workspace_members
  where workspace_id = (select ws from ctx) and user_id = '11111111-1111-1111-1111-111111111111';
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(public.workspace_role((select ws from ctx)), 'owner', 'member cannot remove the owner');

-- Alice promotes Bob; the owner row itself cannot be demoted.
update public.workspace_members set role = 'admin'
  where workspace_id = (select ws from ctx) and user_id = '22222222-2222-2222-2222-222222222222';
update public.workspace_members set role = 'member'
  where workspace_id = (select ws from ctx) and user_id = '11111111-1111-1111-1111-111111111111';
select is(public.workspace_role((select ws from ctx)), 'owner', 'owner cannot be demoted');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.departments (workspace_id, name, rank) values ((select ws from ctx), 'Ops', 'a3')$$,
  'promoted admin can insert a department'
);

select * from finish();
rollback;
