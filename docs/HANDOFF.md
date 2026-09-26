# Handoff — state as of 2026-09-25

Read `docs/PLAN.md` first: it holds every decision (D1–D30), the data model, health rules,
report design, interactive-table spec and the milestone list. This file only records what
has been done and what is set up outside the repo.

## Done

M0–M3 are **merged to `main`** via
[PR #3](https://github.com/nleary-hub/Project-Tracker/pull/3) (rebase-merged 2026-09-26, CI
green including the Playwright job) and deployed to production at
https://project-tracker-seven-ivory.vercel.app. Because of the rebase, the milestone
branches (`claude/planning-session-ixlva0`, `m1/…`, `m2/…`, `m3/…`) hold the same content as
`main` under different commit SHAs; they can be deleted, and PR #1 should be closed as
superseded rather than merged.

- **Plan** agreed and recorded in `docs/PLAN.md`.
- **M0 complete** on branch `claude/planning-session-ixlva0`
  ([PR #1](https://github.com/nleary-hub/Project-Tracker/pull/1), superseded by PR #3):
  Next.js 16 + Tailwind v4 + shadcn/ui (base-nova, Base UI), executive theme tokens,
  `HealthBadge`, app shell with phone menu, placeholder pages, Vitest, Prettier,
  GitHub Actions CI, Supabase CLI config.
- **M1 complete** (branch `m1/auth-workspaces`, merged via PR #3):
  - Migration `20260925035135_workspaces.sql` — `profiles` (kept in sync from `auth.users`
    by trigger), `workspaces`, `workspace_members` (one owner per workspace),
    `workspace_invites` (single-use links, 7-day expiry), `departments` (fractional `rank`),
    `workspace_settings` (`layout_sharing`); `is_workspace_member()`, `workspace_role()`,
    `is_workspace_admin()`, `shares_workspace_with()` helpers; RPCs `create_workspace()`,
    `invite_preview()`, `accept_invite()`; RLS on every table; `anon` revoked.
  - Google sign-in flow (`/login` → `signInWithOAuth` → `/auth/callback` → PKCE exchange),
    `src/proxy.ts` refreshes the session cookie and redirects signed-out visitors to
    `/login?next=…`, `src/lib/auth/dal.ts` centralizes `getUser` / `requireWorkspace` /
    `requireWorkspaceAdmin` (non-members get a 404).
  - `/onboarding`, `/invite/[token]`, account menu with workspace switcher and sign-out,
    `/w/[slug]/settings` (workspace name, members, invite links, departments, layout
    sharing; read-only for members).
  - Tests: Vitest units and `supabase/tests/database/rls.test.sql` (pgTAP) run by the
    `database` CI job.
- **M2 complete** on branch `m2/projects-milestones` (branched from the M1 tip):
  - Migration `20260925120627_projects_milestones.sql` — `projects` (department, owner,
    status, dates, health-override columns for M5, `rank`, `is_demo`), `milestones`
    (`workspace_id` copied from the project by trigger, `rank`, `is_demo`),
    `departments.is_demo`; `can_edit_project()` helper (owner or admin); `wipe_demo_data()`
    RPC (admin-only, atomic, removes exactly the demo rows); RLS: members read and create
    projects, owner/admin edit and delete them and manage milestones. Check constraints:
    due ≥ start, department must belong to the workspace, an override needs a reason.
  - `/w/[slug]/projects`: grouped by department (rank order), URL-driven filters
    (department, owner, status), next open milestone per project with overdue flagged,
    empty states for "no departments" and "no projects". `/projects/new`, `/projects/[id]`
    (details, milestones with complete/reopen, add, edit, delete; "Next" badge on the
    earliest open milestone), `/projects/[id]/edit`, delete via the ⋯ menu.
  - Settings → **Demo data**: load 12 sample projects across Marketing / Operations /
    Product / Finance with dated milestones (overdue, imminent, comfortable); wipe.
  - Shared helpers: `src/lib/milestones.ts` (`nextMilestone`, `sortForDisplay`,
    `isOverdue`), `src/lib/projects.ts` (status vocabulary, timezone-safe date maths),
    `src/lib/schemas/project.ts` (Zod, shared by forms and actions), `src/lib/data/*`
    (typed queries), `src/lib/demo-data.ts` (the sample portfolio).
  - Tests: Vitest units (milestones, dates, schemas, demo data, formatting) and
    `supabase/tests/database/projects.test.sql` (pgTAP, 14 checks). The same assertions
    were run against the hosted project inside a rolled-back transaction and all passed.
  - Verified in the browser with throwaway accounts: load demo data → list + filters →
    project page → complete a milestone, add one → create a project (validation error
    keeps typed values) → member view has no edit controls but can create → delete.
- **M3 complete** on branch `m3/interactive-tables` (branched from the M2 tip):
  - Migration `20260925230402_table_layouts.sql` — `table_layouts` (one shared row per
    table with `user_id null`, plus personal rows), `user_row_ranks`, `user_table_filters`,
    `table_density` enum; helpers `layout_sharing()`, `can_edit_shared_layout()`,
    `can_edit_shared_order()`; RPCs `move_project(p_project, p_rank, p_department)` and
    `set_project_ranks(jsonb)`; RLS: layouts follow the workspace's sharing mode, ranks and
    filters are always the caller's own.
  - `src/components/data-table/` — the shared `DataTable` (TanStack Table v8 + dnd-kit):
    header click sorts (shift = multi-sort), ⋯ menu per column (sort, filter, hide, reset
    width), popover filter editors (text contains / enum with counts / date presets or
    range), filter chips, filters + sort mirrored in the URL (`f.<col>=…`, `sort=due,-name`),
    row drag with insertion marker and Undo toast, cross-department move behind an
    AlertDialog, department (group) drag for admins, column drag/resize/autofit, Columns
    menu, density presets + row-height drag, Reset layout, keyboard drag (Space/arrows/Esc)
    with screen-reader announcements, reduced-motion support, and a card list with a
    "Sort & filter" sheet on phones. Pure logic in `src/lib/table/` (filters, layout, reorder)
    with Vitest coverage.
  - Projects list rewired onto `DataTable` (`projects-table.tsx`, `table-actions.ts`,
    `projects-columns.ts`); `page.tsx` resolves the effective layout/order for the three
    sharing modes (`src/lib/data/table-layouts.ts`) and reads filters/sort from the URL first,
    saved state second.
  - Playwright suite `tests/e2e/projects-table.spec.ts` (8 tests: row drag + reload, Esc
    cancel, keyboard move, cross-department confirm, column drag, sort in URL, filter chip,
    two-user shared/personal modes). Runs against a **production build** on port 3100 — the
    dev server's Fast Refresh remounted the table mid-drag and made the suite flaky.
  - Gotcha fixed late: `history.replaceState` must be called with `null` state. Next.js
    patches it to keep the App Router URL in sync but skips the sync when handed its own
    state object, so the next server-action refresh silently dropped the `f.*`/`sort` params.

- **M4a — people directory + tasks/activity schema** on branch `m4/tasks-activity` (from `main`):
  - Migration `20260926021044_people_directory.sql` (D31): `people` table; members get a
    person row by trigger (synced from `profiles`); `projects.owner_id` and
    `milestones.owner_id` now reference `people` (backfilled); `can_edit_project()` follows
    `people.user_id`; `my_person_id(ws)`; `wipe_demo_data()` also removes demo people. RLS:
    members read and add unlinked people, admins edit/delete them.
  - Migration `20260926021257_tasks_activity.sql`: `tasks` (assignee → people, milestone must
    be in the same project, `completed_at` follows `status`), `activity_events` written only by
    triggers on projects / milestones / tasks (creation of demo rows is not logged), RPCs
    `move_task` / `set_task_ranks`. `20260926021342_harden_trigger_functions.sql` revokes RPC
    access to the SECURITY DEFINER trigger functions (Supabase advisor).
  - App: `PersonSelect` (owner/assignee picker with "Add someone…" dialog) used by the project
    form and milestone forms; Settings → **People** panel (list, add, edit, remove); demo data
    now has four demo owners who never sign in and ~25 tasks; `src/lib/{people,tasks,activity}.ts`,
    `src/lib/data/{people,tasks,activity}.ts`, `src/lib/schemas/{person,task}.ts` with unit tests;
    pgTAP `supabase/tests/database/tasks.test.sql` (24 checks).
  - **Not yet built (next PRs):** the tasks table on the project page, the activity feed, and
    the dashboard's "my open tasks" — deliberately deferred until after the design refresh
    Nick asked for (2026-09-26), so they're built once in the new look.

## External services (all $0 plans)

| Service            | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase           | Project `project-tracker`, ref `gmnomcketaofqypwlwxq`, region `us-east-1`, free plan, org "nleary-hub's Org". M1–M3 migrations applied. URL + publishable key live in `.env.local` (gitignored) and in Vercel env vars. `.mcp.json` registers the Supabase MCP server for Claude Code sessions.                                                                                                                                                                                                                                                                                  |
| Vercel             | Project `project-tracker` (Hobby), linked to `nleary-hub/Project-Tracker`. `main` = production; every branch push gets a preview. Preview protection is on (sign in to Vercel to view). Env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set for all environments.                                                                                                                                                                                                                                                                             |
| Google OAuth       | **Working** as of 2026-09-25: provider enabled in Supabase; `https://gmnomcketaofqypwlwxq.supabase.co/auth/v1/callback` is an authorized redirect URI on the Google client; consent screen is **External** (it was Internal, which rejected gmail accounts with `403 org_internal`). Verified locally and on a Vercel preview: sign in → `/auth/callback` → workspace dashboard. Supabase Redirect URLs cover `http://localhost:3000/**`, the production domain `project-tracker-seven-ivory.vercel.app` and previews via `https://project-tracker-*-nleary-2832.vercel.app/**`. |
| Email (Gmail SMTP) | Not set up yet. Needed in M8.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Local development

- Clone lives at `E:\Claude\Project-Tracker`. Node 24 LTS (installed via winget), pnpm 10.33
  installed with `npm i -g pnpm@10.33.0`. Docker is **not** installed, so `supabase start` /
  `supabase test db` don't run locally; CI runs them.
- `.gitattributes` pins LF so Prettier passes on Windows clones.
- `pnpm dev` → http://localhost:3000. `pnpm check` (lint, format, typecheck, tests),
  `pnpm build`.
- After any migration: apply it to the hosted project (Supabase MCP `apply_migration` or
  `supabase db push`), rename the local file to the version Supabase recorded, then
  regenerate `src/lib/supabase/database.types.ts`.
- Google sign-in works locally. For multi-user UI checks without extra Google accounts,
  throwaway email/password users can be created with SQL (`extensions.crypt`), signed in
  headlessly with `@supabase/ssr`, and their `sb-<ref>-auth-token` cookie injected into the
  browser. Delete them afterwards.

### End-to-end tests (Playwright)

- `pnpm build` then `pnpm test:e2e` (or `pnpm test:e2e:build` for both). The config starts
  `next start --port 3100` itself; `tests/e2e/global-setup.ts` signs the two e2e users in
  with `@supabase/ssr` and writes storage states to `tests/e2e/.auth/` (gitignored).
- The suite needs two email/password users and resets its own `e2e-tables` workspace before
  every test (`tests/e2e/fixture.ts`). CI creates them from `supabase/seed.sql` on a local
  Supabase (Docker). Locally, point `.env.local` at a Supabase that has them — the seed's
  password is public, so **do not leave these users on the hosted project**; they were
  removed after the M3 run. To recreate them on the hosted project temporarily, run the
  `auth.users` / `auth.identities` inserts from `supabase/seed.sql` via the Supabase MCP,
  and delete both users (cascade removes the workspace) when done. Override the accounts
  with `E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD` / `E2E_MEMBER_EMAIL` / `E2E_MEMBER_PASSWORD`
  / `E2E_WORKSPACE_SLUG` (see `tests/e2e/env.ts`).
- On this machine Playwright browsers live in `E:\Claude\ms-playwright`
  (`PLAYWRIGHT_BROWSERS_PATH` user env var) because **C: is nearly full** — installs to the
  default cache failed with ENOSPC and left a corrupt Chromium. `playwright.config.ts` uses
  `channel: "chromium"` (full Chromium, not the headless shell).

## Recommended next step

Start **M4 — tasks + activity events** on a fresh branch from `main`, reusing `DataTable`
for the task list (PLAN §12). Open a PR per milestone so CI (including the e2e job) runs
before merge; merges need a human click in GitHub — the Claude Code app refuses to press
the merge button itself. UI polish (tweakcn theme presets, Magic UI-style micro-interactions)
is queued for M6+ once the report views exist.

## Conventions

- `pnpm check` before every push (CI also runs `pnpm build` and the database tests).
- Add UI primitives with `pnpm exec shadcn add <name>` (`pnpm dlx` hits a Windows cache bug);
  theme tokens live in `src/app/globals.css` (`--brand` is the navy accent; `--accent` is
  shadcn's hover surface). When shadcn asks to overwrite an existing file, keep ours.
- Base UI components use `render={<Link … />}` instead of `asChild`; add `nativeButton={false}`
  when a `Button` renders as a link.
- Forms that can fail server-side validation use controlled inputs (React resets uncontrolled
  fields after every form action). Server Actions return `ActionResult`
  (`src/lib/action-result.ts`); pages and actions go through `src/lib/auth/dal.ts`; the
  database enforces the same rules with RLS.
- `date` columns are `YYYY-MM-DD` strings: format them with `formatDate` (which treats them as
  calendar dates), never `new Date(value)` in the workspace timezone.
- Health colors (`--health-*`) are reserved for health and always paired with shape + label.
- One PR per milestone; keep `docs/PLAN.md` updated when a decision changes.
