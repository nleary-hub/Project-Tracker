-- pgTAP checks for M4: the people directory (D31), tasks, and the activity
-- log written by triggers.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
  '{"provider":"email","providers":["email"]}', u.meta, now(), now(), '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'alice@example.test', '{"full_name":"Alice Test"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'bob@example.test', '{"full_name":"Bob Test"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'zed@example.test', '{"full_name":"Zed Outsider"}'::jsonb)
) as u(id, email, meta);

-- Alice creates the workspace; Bob joins as a member; Zed is nobody.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
create temp table ctx as select (public.create_workspace('Acme', 'acme-tasks')).id as ws;
reset role;
insert into public.workspace_members (workspace_id, user_id, role)
  values ((select ws from ctx), '22222222-2222-2222-2222-222222222222', 'member');
set local role authenticated;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from public.people where workspace_id = (select ws from ctx) and user_id is not null),
  2::bigint, 'each member has a linked person');
select is(
  (select name from public.people where workspace_id = (select ws from ctx) and user_id = '22222222-2222-2222-2222-222222222222'),
  'Bob Test', 'the person takes the profile name');
reset role;
update public.profiles set display_name = 'Robert Test' where id = '22222222-2222-2222-2222-222222222222';
set local role authenticated;
select is(
  (select name from public.people where user_id = '22222222-2222-2222-2222-222222222222'),
  'Robert Test', 'renaming the profile renames the person');

-- Bob (member) adds someone who never signs in.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
create temp table dana (id uuid);
with i as (
  insert into public.people (workspace_id, name, email) values ((select ws from ctx), 'Dana Reyes', 'dana@example.test') returning id
)
insert into dana select id from i;
select throws_ok(
  $$insert into public.people (workspace_id, name, user_id) values ((select ws from ctx), 'Fake link', '33333333-3333-3333-3333-333333333333')$$,
  '42501', null, 'a member cannot create a person linked to a user');
update public.people set name = 'Renamed by member' where id = (select id from dana);
select is((select name from public.people where id = (select id from dana)), 'Dana Reyes', 'members cannot edit people');

-- Zed sees nothing.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is((select count(*) from public.people where workspace_id = (select ws from ctx)), 0::bigint, 'non-members see no people');

-- ---------------------------------------------------------------------------
-- Projects owned by a non-user, and tasks
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
-- Departments are admin-only, so the row is inserted as postgres; the temp
-- table is created as "authenticated" so that role can read it afterwards.
create temp table dept (id uuid);
reset role;
with i as (insert into public.departments (workspace_id, name, rank) values ((select ws from ctx), 'Ops', 'a0') returning id)
insert into dept select id from i;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

create temp table p1 (id uuid);
with i as (
  insert into public.projects (workspace_id, department_id, name, owner_id, rank)
  values ((select ws from ctx), (select id from dept), 'Owned by Dana', (select id from dana), 'a0') returning id
)
insert into p1 select id from i;
select is((select owner_id from public.projects where id = (select id from p1)), (select id from dana), 'a project can be owned by someone who never signs in');
select throws_ok(
  $$insert into public.projects (workspace_id, department_id, name, owner_id, rank)
    values ((select ws from ctx), (select id from dept), 'bad owner', gen_random_uuid(), 'a1')$$,
  '23503', null, 'the owner must be a person in the workspace');
-- Bob is not Dana, so he can't edit her project even though he created it...
update public.projects set name = 'renamed' where id = (select id from p1);
select is((select name from public.projects where id = (select id from p1)), 'Owned by Dana', 'creating a project does not grant edit rights; the owner does');

create temp table ms (id uuid);
reset role;
insert into public.milestones (project_id, name, rank, due_date) values ((select id from p1), 'M1', 'a0', '2026-10-01');
insert into ms select id from public.milestones where name = 'M1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

-- ...but any member can create and edit tasks.
create temp table t1 (id uuid);
with i as (
  insert into public.tasks (project_id, milestone_id, title, assignee_id, rank, due_date)
  values ((select id from p1), (select id from ms), 'Write the brief', (select id from dana), 'a0', '2026-10-01') returning id
)
insert into t1 select id from i;
select is((select workspace_id from public.tasks where id = (select id from t1)), (select ws from ctx), 'a task copies its project workspace');
select throws_ok(
  $$insert into public.tasks (project_id, milestone_id, title, rank)
    values ((select id from p1), gen_random_uuid(), 'bad milestone', 'a1')$$,
  '23503', null, 'a task milestone must belong to the same project');

update public.tasks set status = 'done' where id = (select id from t1);
select isnt((select completed_at from public.tasks where id = (select id from t1)), null, 'marking a task done stamps completed_at');
update public.tasks set status = 'in_progress' where id = (select id from t1);
select is((select completed_at from public.tasks where id = (select id from t1)), null, 'reopening a task clears completed_at');

-- ---------------------------------------------------------------------------
-- Activity is written by triggers and only readable, never writable, by members
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from public.activity_events where project_id = (select id from p1) and kind = 'task_created'),
  1::bigint, 'creating a task logs task_created');
select is(
  (select count(*) from public.activity_events where project_id = (select id from p1) and kind = 'task_completed'),
  1::bigint, 'completing a task logs task_completed');
select is(
  (select payload->>'to' from public.activity_events where project_id = (select id from p1) and kind = 'task_reopened'),
  'in_progress', 'reopening logs task_reopened with the new status');
select is(
  (select actor_id from public.activity_events where project_id = (select id from p1) and kind = 'task_completed'),
  '22222222-2222-2222-2222-222222222222'::uuid, 'the actor is the signed-in user');
select throws_ok(
  $$insert into public.activity_events (workspace_id, project_id, kind) values ((select ws from ctx), (select id from p1), 'task_created')$$,
  '42501', null, 'members cannot write activity directly');
select throws_ok(
  $$select public.log_activity((select ws from ctx), (select id from p1), 'task_created', '{}'::jsonb)$$,
  '42501', null, 'members cannot call log_activity');

update public.tasks set due_date = '2026-10-15' where id = (select id from t1);
select is(
  (select payload->>'from' || ' -> ' || (payload->>'to') from public.activity_events where project_id = (select id from p1) and kind = 'task_date_changed'),
  '2026-10-01 -> 2026-10-15', 'moving a due date logs both dates');

reset role;
update public.milestones set due_date = '2026-10-08' where id = (select id from ms);
set local role authenticated;
select is(
  (select count(*) from public.activity_events where project_id = (select id from p1) and kind = 'milestone_date_changed'),
  1::bigint, 'moving a milestone logs milestone_date_changed');

-- Zed sees no activity or tasks.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is((select count(*) from public.activity_events where workspace_id = (select ws from ctx)), 0::bigint, 'non-members see no activity');
select is((select count(*) from public.tasks where workspace_id = (select ws from ctx)), 0::bigint, 'non-members see no tasks');

-- move_task: a member moves a task out of its milestone; a non-member cannot.
select throws_ok(
  $$select public.move_task((select id from t1), 'a5', null, true)$$,
  '42501', null, 'non-members cannot move tasks');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select lives_ok(
  $$select public.move_task((select id from t1), 'a5', null, true)$$,
  'a member moves a task and clears its milestone');
select is(
  (select milestone_id is null and rank = 'a5' from public.tasks where id = (select id from t1)),
  true, 'the move took effect');

select * from finish();
rollback;
