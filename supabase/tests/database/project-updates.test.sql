-- pgTAP checks for M5 manual project updates: members read; the project's
-- owner or an admin posts, edits and deletes; nobody posts as someone else.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
  '{"provider":"email","providers":["email"]}', u.meta, now(), now(), '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'alice@example.test', '{"full_name":"Alice Admin"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'bob@example.test', '{"full_name":"Bob Owner"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'cara@example.test', '{"full_name":"Cara Member"}'::jsonb),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'zed@example.test', '{"full_name":"Zed Outsider"}'::jsonb)
) as u(id, email, meta);

-- Alice creates the workspace (owner/admin). Temp tables are created as
-- "authenticated" so that role can read them after postgres fills them.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
create temp table ctx as select (public.create_workspace('Acme', 'acme-updates')).id as ws;
create temp table dept (id uuid);
create temp table p1 (id uuid);
create temp table u1 (id uuid);

-- Bob and Cara join; Bob owns the project.
reset role;
insert into public.workspace_members (workspace_id, user_id, role) values
  ((select ws from ctx), '22222222-2222-2222-2222-222222222222', 'member'),
  ((select ws from ctx), '33333333-3333-3333-3333-333333333333', 'member');
with i as (
  insert into public.departments (workspace_id, name, rank) values ((select ws from ctx), 'Ops', 'a0') returning id
)
insert into dept select id from i;
with i as (
  insert into public.projects (workspace_id, department_id, name, owner_id, rank)
  values (
    (select ws from ctx), (select id from dept), 'Bob project',
    (select id from public.people where workspace_id = (select ws from ctx) and user_id = '22222222-2222-2222-2222-222222222222'),
    'a0')
  returning id
)
insert into p1 select id from i;
set local role authenticated;

-- Bob (owner) posts.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
with i as (
  insert into public.project_updates (project_id, author_id, body, next_step)
  values ((select id from p1), '22222222-2222-2222-2222-222222222222', 'Kickoff done', 'Draft the plan')
  returning id
)
insert into u1 select id from i;
select is(
  (select workspace_id from public.project_updates where id = (select id from u1)),
  (select ws from ctx), 'an update copies its project workspace');
select lives_ok(
  $$insert into public.project_updates (project_id, author_id, body)
    values ((select id from p1), '22222222-2222-2222-2222-222222222222', 'No next step here')$$,
  'the next step is optional');
select throws_ok(
  $$insert into public.project_updates (project_id, author_id, body)
    values ((select id from p1), '22222222-2222-2222-2222-222222222222', '')$$,
  '23514', null, 'an update needs a body');
select throws_ok(
  $$insert into public.project_updates (project_id, author_id, body)
    values ((select id from p1), '11111111-1111-1111-1111-111111111111', 'Posted as Alice')$$,
  '42501', null, 'nobody posts in someone else''s name');

-- Cara (member, not the owner) reads but cannot post, edit or delete.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.project_updates (project_id, author_id, body)
    values ((select id from p1), '33333333-3333-3333-3333-333333333333', 'Not mine to post')$$,
  '42501', null, 'a member cannot post on a project they do not own');
select is(
  (select count(*) from public.project_updates where project_id = (select id from p1)),
  2::bigint, 'every member reads the updates');
update public.project_updates set body = 'hacked' where id = (select id from u1);
select is(
  (select body from public.project_updates where id = (select id from u1)),
  'Kickoff done', 'a member cannot edit an update on a project they do not own');
delete from public.project_updates where id = (select id from u1);
select is(
  (select count(*) from public.project_updates where project_id = (select id from p1)),
  2::bigint, 'a member cannot delete an update on a project they do not own');

-- Alice (admin) posts and edits on a project she doesn't own.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.project_updates (project_id, author_id, body)
    values ((select id from p1), '11111111-1111-1111-1111-111111111111', 'Admin note')$$,
  'an admin posts on any project');
update public.project_updates set body = 'Edited by admin' where id = (select id from u1);
select is(
  (select body from public.project_updates where id = (select id from u1)),
  'Edited by admin', 'an admin edits any update');

-- Bob edits and deletes his own project's update.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
update public.project_updates set next_step = 'Ship it' where id = (select id from u1);
select is(
  (select next_step from public.project_updates where id = (select id from u1)),
  'Ship it', 'the owner edits an update');
delete from public.project_updates where id = (select id from u1);
select is(
  (select count(*) from public.project_updates where id = (select id from u1)),
  0::bigint, 'the owner deletes an update');

-- Zed is not a member.
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
select is(
  (select count(*) from public.project_updates where workspace_id = (select ws from ctx)),
  0::bigint, 'non-members see no updates');

select * from finish();
rollback;
