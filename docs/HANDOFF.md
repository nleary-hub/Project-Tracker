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
- **M1 complete** on branch `m1/auth-workspaces` (branched from the M0 tip, so it applies
  cleanly once PR #1 is merged):
  - Migration `supabase/migrations/20260925035135_workspaces.sql` — `profiles` (kept in sync
    from `auth.users` by trigger), `workspaces`, `workspace_members` (one owner per
    workspace), `workspace_invites` (single-use links, 7-day expiry), `departments`
    (fractional `rank`), `workspace_settings` (`layout_sharing`); `is_workspace_member()`,
    `workspace_role()`, `is_workspace_admin()`, `shares_workspace_with()` helpers; RPCs
    `create_workspace()`, `invite_preview()`, `accept_invite()`; RLS on every table; `anon`
    revoked. **Already applied to the hosted project** (version `20260925035135`).
  - Google sign-in flow (`/login` → `signInWithOAuth` → `/auth/callback` → PKCE exchange),
    `src/proxy.ts` refreshes the session cookie and redirects signed-out visitors to
    `/login?next=…`, `src/lib/auth/dal.ts` centralizes `getUser` / `requireWorkspace` /
    `requireWorkspaceAdmin` (non-members get a 404).
  - `/onboarding` (create workspace, slug auto-suggested), `/invite/[token]` (preview +
    accept, with expired / revoked / used / already-member states), account menu with
    workspace switcher and sign-out, workspace name in the header.
  - `/w/[slug]/settings`: workspace name, members (role select, remove, leave), invite
    links (create + copy, revoke, status), departments (add, rename, archive, restore),
    layout-sharing mode. Members see a read-only version with no invite section.
  - Tests: Vitest units (slug, rank, roles, invites, initials, nav) and
    `supabase/tests/database/rls.test.sql` (pgTAP, 21 checks) run by the new `database`
    CI job via `supabase test db`. The same assertions were run against the hosted project
    inside a rolled-back transaction and all passed.
  - Verified in the browser end to end with two throwaway accounts: create workspace →
    add departments → create invite → second user accepts → member sees read-only
    settings → sign out. Throwaway accounts and the test workspace were deleted afterwards.

## External services (all $0 plans)

| Service            | Details                                                                                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase           | Project `project-tracker`, ref `gmnomcketaofqypwlwxq`, region `us-east-1`, free plan, org "nleary-hub's Org". M1 schema applied. URL + publishable key live in `.env.local` (gitignored) and in Vercel env vars.                                                                                     |
| Vercel             | Project `project-tracker` (Hobby), linked to `nleary-hub/Project-Tracker`. `main` = production; every branch push gets a preview. Preview protection is on (sign in to Vercel to view). Env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set for all environments. |
| Google OAuth       | **Not set up yet — the "Continue with Google" button fails until it is.** See below.                                                                                                                                                                                                                 |
| Email (Gmail SMTP) | Not set up yet. Needed in M8.                                                                                                                                                                                                                                                                        |

### Turning on Google sign-in (one-time, ~10 minutes)

1. Google Cloud Console → APIs & Services → Credentials → **Create credentials → OAuth client ID**
   (configure the consent screen first if asked: External, app name "Project Tracker", your
   email as support/developer contact; add yourself as a test user while it's unpublished).
2. Application type **Web application**. Authorized redirect URI:
   `https://gmnomcketaofqypwlwxq.supabase.co/auth/v1/callback`
3. Copy the client ID and secret into Supabase → Authentication → Sign In / Providers →
   **Google** → enable, paste both, save.
4. Supabase → Authentication → URL Configuration: set **Site URL** to the production URL and add
   `http://localhost:3000/**` and the Vercel preview pattern `https://*-nleary-hub.vercel.app/**`
   to **Redirect URLs**.

## Local development

- Clone lives at `E:\Claude\Project-Tracker`. Node 24 LTS (installed via winget), pnpm 10.33
  installed with `npm i -g pnpm@10.33.0`. Docker is **not** installed, so `supabase start` /
  `supabase test db` don't run locally; CI runs them.
- `.gitattributes` pins LF so Prettier passes on Windows clones.
- `pnpm dev` → http://localhost:3000. `pnpm check` (lint, format, typecheck, tests),
  `pnpm build`.
- After any migration: apply it to the hosted project (Supabase MCP `apply_migration` or
  `supabase db push`), then regenerate `src/lib/supabase/database.types.ts`.

## Recommended next step

Merge PR #1, open a PR for `m1/auth-workspaces` and merge it, set up Google sign-in (above),
then start **M2** on a fresh branch from `main`: projects + milestones (CRUD, owner,
department), the projects list grouped by department, next-milestone calculation, demo-data
loader + wipe (`is_demo` rows). See PLAN §12.

## Conventions

- `pnpm check` before every push (CI also runs `pnpm build` and the database tests).
- Add UI primitives with `pnpm exec shadcn add <name>` (`pnpm dlx` hits a Windows cache bug);
  theme tokens live in `src/app/globals.css` (`--brand` is the navy accent; `--accent` is
  shadcn's hover surface). When shadcn asks to overwrite an existing file, keep ours.
- Base UI components use `render={<Link … />}` instead of `asChild`; add `nativeButton={false}`
  when a `Button` renders as a link.
- Server Actions return `ActionResult` (`src/lib/action-result.ts`); pages and actions go
  through `src/lib/auth/dal.ts`; the database enforces the same rules with RLS.
- Health colors (`--health-*`) are reserved for health and always paired with shape + label.
- One PR per milestone; keep `docs/PLAN.md` updated when a decision changes.
