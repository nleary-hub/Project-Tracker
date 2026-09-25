# Handoff — state as of 2026-09-25

Read `docs/PLAN.md` first: it holds every decision (D1–D30), the data model, health rules,
report design, interactive-table spec and the milestone list. This file only records what
has been done and what is set up outside the repo.

## Done

- **Plan** agreed and recorded in `docs/PLAN.md`.
- **M0 complete** on branch `claude/planning-session-ixlva0`, open as draft
  [PR #1](https://github.com/nleary-hub/Project-Tracker/pull/1), CI green:
  Next.js 16 + Tailwind v4 + shadcn/ui (base-nova, Base UI), executive theme tokens,
  `HealthBadge`, app shell with phone menu, placeholder pages, Vitest, Prettier,
  GitHub Actions CI, Supabase CLI config.
- **M1 complete** on branch `m1/auth-workspaces` (pushed; PR not yet opened):
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

## External services (all $0 plans)

| Service            | Details                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase           | Project `project-tracker`, ref `gmnomcketaofqypwlwxq`, region `us-east-1`, free plan, org "nleary-hub's Org". M1 + M2 migrations applied. URL + publishable key live in `.env.local` (gitignored) and in Vercel env vars. `.mcp.json` registers the Supabase MCP server for Claude Code sessions.                                                           |
| Vercel             | Project `project-tracker` (Hobby), linked to `nleary-hub/Project-Tracker`. `main` = production; every branch push gets a preview. Preview protection is on (sign in to Vercel to view). Env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set for all environments.                                                        |
| Google OAuth       | Provider is **enabled in Supabase** with a Google client ID, but Google still returns `redirect_uri_mismatch`: add `https://gmnomcketaofqypwlwxq.supabase.co/auth/v1/callback` to the OAuth client's **Authorized redirect URIs** in Google Cloud Console, and `http://localhost:3000/**` to Supabase → Authentication → URL Configuration → Redirect URLs. |
| Email (Gmail SMTP) | Not set up yet. Needed in M8.                                                                                                                                                                                                                                                                                                                               |

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
- Google sign-in isn't usable locally until the redirect URI above is fixed. For UI checks,
  throwaway email/password users can be created with SQL (`extensions.crypt`), signed in
  headlessly with `@supabase/ssr`, and their `sb-<ref>-auth-token` cookie injected into the
  browser. Delete them afterwards.

## Recommended next step

Open and merge PRs for `m1/auth-workspaces` and `m2/projects-milestones` (after PR #1),
fix the Google redirect URI, then start **M3 — interactive tables** on a fresh branch from
`main`: the shared `DataTable` (TanStack Table + dnd-kit) with header sort/filter, filter
chips, filters and sort in the URL, row and column drag with animation and insertion marker,
cross-department confirm, department drag, column resize, row-height presets, Undo, keyboard
drag; `table_layouts` / `user_row_ranks` / `user_table_filters` tables and the three sharing
modes. Apply it to the projects list first (PLAN §8, §12).

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
