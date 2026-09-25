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

## External services (all $0 plans)

| Service            | Details                                                                                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase           | Project `project-tracker`, ref `gmnomcketaofqypwlwxq`, region `us-east-1`, free plan, org "nleary-hub's Org". No tables yet. URL and publishable key are in `.env.example`'s comments and in Vercel env vars.                                                                                        |
| Vercel             | Project `project-tracker` (Hobby), linked to `nleary-hub/Project-Tracker`. `main` = production; every branch push gets a preview. Preview protection is on (sign in to Vercel to view). Env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set for all environments. |
| Google OAuth       | **Not set up yet.** Needed in M1.                                                                                                                                                                                                                                                                    |
| Email (Gmail SMTP) | Not set up yet. Needed in M8.                                                                                                                                                                                                                                                                        |

## Recommended next step

Merge PR #1, then start **M1** on a fresh branch from `main`:

1. Migrations: `profiles`, `workspaces`, `workspace_members`, `workspace_invites`,
   `departments`, `workspace_settings`; `is_workspace_member()` and `workspace_role()`
   helpers; RLS on every table (PLAN §4, §10).
2. Supabase Auth with Google (PLAN D2). The user must create an OAuth client in Google
   Cloud Console and paste the client ID/secret into Supabase → Authentication → Providers →
   Google. Redirect URL: `https://gmnomcketaofqypwlwxq.supabase.co/auth/v1/callback`.
3. `/login`, `/onboarding` (create workspace / accept invite link), account menu in the
   header, members + invite-link management, departments CRUD, layout-sharing setting.
4. RLS tests against a local Supabase (`pnpm exec supabase start`, needs Docker) proving a
   non-member sees nothing.
5. Replace the `PREVIEW_WORKSPACE_SLUG` redirect in `src/app/page.tsx` with the real
   workspace lookup.

## Conventions

- `pnpm check` before every push (CI also runs `pnpm build`).
- Add UI primitives with `pnpm dlx shadcn@latest add <name>`; theme tokens live in
  `src/app/globals.css` (`--brand` is the navy accent; `--accent` is shadcn's hover surface).
- Health colors (`--health-*`) are reserved for health and always paired with shape + label.
- One PR per milestone; keep `docs/PLAN.md` updated when a decision changes.
