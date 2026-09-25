-- pgTAP checks for the M2 policies: members create projects; the owner or an
-- admin edits them and their milestones; demo wipe is admin-only and exact.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'alice@example.test'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'bob@example.test'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'cara@example.test')
) as u(id, email);

-- Alice creates the workspace (owner) and a project she owns.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
create temp table ctx as select (public.create_workspace('Acme', 'acme-projects')).id as ws;

create temp table dept (id uuid);
with i as (
  insert into public.departments (workspace_id, name, rank)
  values ((select ws from ctx), 'Ops', 'a0') returning id
)
insert into dept select id from i;

create temp table p1 (id uuid);
with i as (
  insert into public.projects (workspace_id, department_id, name, owner_id, rank)
  values ((select ws from ctx), (select id from dept), 'P1', '11111111-1111-1111-1111-111111111111', 'a0')
  returning id
)
insert into p1 select id from i;

-- Bob and Cara join as members (inserted directly; the invite flow is covered in rls.test.sql).
reset role;
insert into public.workspace_members (workspace_id, user_id, role) values
  ((select ws from ctx), '22222222-2222-2222-2222-222222222222', 'member'),
  ((select ws from ctx), '33333333-3333-3333-3333-333333333333', 'member');
set local role authenticated;

-- Bob: creates his own project and milestone, can't touch Alice's.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
create temp table p2 (id uuid);
with i as (
  insert into public.projects (workspace_id, department_id, name, owner_id, rank)
  values ((select ws from ctx), (select id from dept), 'P2', '22222222-2222-2222-2222-222222222222', 'a1')
  returning id
)
insert into p2 select id from i;

create temp table ms (id uuid);
with i as (
  insert into public.milestones (project_id, name, rank) values ((select id from p2), 'M', 'a0') returning id
)
insert into ms select id from i;

select is((select workspace_id from public.milestones where id = (select id from ms)), (select ws from ctx), 'milestone copies its project workspace');
select is((select count(*) from public.projects where workspace_id = (select ws from ctx)), 2::bigint, 'member sees every project');

update public.projects set name = 'hacked' where id = (select id from p1);
select is((select name from public.projects where id = (select id from p1)), 'P1', 'member cannot edit a project they do not own');
select throws_ok(
  $$insert into public.milestones (project_id, name, rank) values ((select id from p1), 'bad', 'a0')$$,
  '42501', null, 'member cannot add milestones to a project they do not own');
delete from public.projects where id = (select id from p1);
select is((select count(*) from public.projects where id = (select id from p1)), 1::bigint, 'member cannot delete a project they do not own');

-- Cara owns nothing: no edits anywhere, no wipe.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
update public.milestones set completed_at = now() where id = (select id from ms);
select is((select completed_at from public.milestones where id = (select id from ms)), null, 'non-owner cannot complete a milestone');
select throws_ok($$select public.wipe_demo_data((select ws from ctx))$$, '42501', null, 'member cannot wipe demo data');

-- Alice (owner/admin): edits Bob's project, completes its milestone, rejects bad rows.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
update public.projects set name = 'P2 renamed' where id = (select id from p2);
select is((select name from public.projects where id = (select id from p2)), 'P2 renamed', 'admin edits any project');
update public.milestones set completed_at = now() where id = (select id from ms);
select isnt((select completed_at from public.milestones where id = (select id from ms)), null, 'admin completes any milestone');
select throws_ok(
  $$insert into public.projects (workspace_id, department_id, name, rank) values ((select ws from ctx), gen_random_uuid(), 'bad', 'a2')$$,
  '23503', null, 'department must belong to the workspace');
select throws_ok(
  $$insert into public.projects (workspace_id, department_id, name, rank, start_date, due_date)
    values ((select ws from ctx), (select id from dept), 'bad dates', 'a2', '2026-10-10', '2026-10-01')$$,
  '23514', null, 'due date cannot precede start date');

-- Demo wipe removes exactly the demo rows.
insert into public.departments (workspace_id, name, rank, is_demo) values ((select ws from ctx), 'Demo dept', 'a1', true);
insert into public.projects (workspace_id, department_id, name, rank, is_demo)
  values ((select ws from ctx), (select id from public.departments where name = 'Demo dept'), 'Demo project', 'a3', true);
select results_eq(
  $$select projects_removed, departments_removed from public.wipe_demo_data((select ws from ctx))$$,
  $$values (1, 1)$$,
  'wipe removes one demo project and one demo department');
select is((select count(*) from public.projects where workspace_id = (select ws from ctx)), 2::bigint, 'real projects survive the wipe');
select is((select count(*) from public.departments where workspace_id = (select ws from ctx)), 1::bigint, 'real departments survive the wipe');

select * from finish();
rollback;
