# Project Tracker — v1 Plan

Status: **Draft, awaiting sign-off** (all planning questions answered) · Last updated: 2026-09-25

## 1. Goal

A small team tracks a portfolio of projects, grouped by department, and produces a
**biweekly portfolio report**. For each project the report shows:

- recent updates
- the next milestone, its due date and owner
- the project owner
- project health (calculated automatically, with manual override)

The report is available in the app and as PDF, Excel and CSV exports, and can be emailed
automatically.

The report is the product. Everything else (projects, milestones, tasks, updates)
exists to feed it accurate data.

## 2. Decisions log

| # | Decision | Choice |
|---|---|---|
| D1 | Users | Small team, invited by link |
| D2 | Sign-in | Google OAuth via Supabase Auth; admins send copyable invite links (no invite emails) |
| D3 | Tenancy | Schema supports multiple workspaces; the interface exposes one workspace in v1 |
| D4 | Stack | Next.js (App Router, TypeScript) + Supabase + Vercel Hobby |
| D5 | Hosting cost | $0: Supabase free plan, Vercel Hobby (non-commercial use confirmed) |
| D6 | Departments | Exactly one department per project; admins manage the department list |
| D7 | Recent updates | Both: an owner-written update plus an auto-generated activity summary. Missing updates are flagged |
| D8 | Next step | Next open milestone (earliest incomplete, by due date) + optional free-text "next step" in the update |
| D9 | Health | Auto-calculated from milestones + staleness, manual override allowed |
| D10 | Report formats | In-app page, PDF, Excel, CSV, and email |
| D11 | Report history | Every generated report is saved as a fixed snapshot |
| D12 | Email distribution | Full report to one distribution list |
| D13 | Report workflow | Default: draft is auto-generated on a schedule, then an admin approves and sends. Can be switched to fully automatic at a set day and time. Admins can generate a report at any time |
| D14 | Owner reminders | Email 1 day before the report is generated, plus an in-app banner |
| D15 | Email transport | Gmail SMTP with an app password (no domain available). Sits behind a provider interface so it can be swapped for Resend later |
| D16 | Visual style | Executive / corporate: navy and slate, dense tables, formal report look |
| D17 | Branding | Neutral default wordmark. Admins can upload a logo and set an accent color later, and both carry through to the PDF and emails |
| D18 | Charts | Four charts: overall portfolio health, health by department, upcoming milestones, health trend. Each can be turned on or off in settings |
| D19 | Devices | Designed for desktop; on phones, reading the report, posting an update and checking my tasks all work |
| D20 | Timezone | US Eastern (`America/New_York`), used for scheduling, due dates and "overdue" checks |
| D21 | Report day | Friday. The reminder goes out Thursday |
| D22 | Report layout | Default "Dense table" (for 25–100 projects); can be switched in settings to "Detailed cards" (for under 25) |
| D23 | Seed data | Demo data to try the app, plus an admin "wipe demo data" action before real use |

## 3. Stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router), TypeScript, server actions |
| UI | Tailwind CSS + shadcn/ui |
| Data / Auth | Supabase Postgres + Auth (Google), with Row Level Security (RLS) on every table |
| Validation | Zod, shared between forms and server actions |
| PDF | `@react-pdf/renderer` (no headless browser needed, fits serverless limits) |
| Charts | Custom SVG components with `d3-scale`. The chart layout code is shared by the web page and the PDF, so the two can't drift apart (see §7) |
| Excel | `exceljs` |
| Email | Nodemailer over Gmail SMTP, behind an `EmailProvider` interface |
| Scheduling | One Vercel Cron job a day → `/api/cron/daily` (protected by `CRON_SECRET`) |
| Tests / CI | Vitest (unit + health rules), SQL tests for RLS against local Supabase, Playwright smoke tests, GitHub Actions |

## 4. Data model

All tables carry `workspace_id` and are protected by RLS through an
`is_workspace_member(workspace_id)` helper. Admin-only writes check
`workspace_role(workspace_id) in ('owner','admin')`.

- **profiles** — `id` (auth user), `display_name`, `email`, `avatar_url`
- **workspaces** — `name`, `slug`, `timezone`
- **workspace_members** — `workspace_id`, `user_id`, `role` (owner | admin | member)
- **workspace_invites** — `workspace_id`, `role`, `token`, `expires_at`, `accepted_by`, `accepted_at`
- **departments** — `name`, `sort_order`, `archived_at`
- **projects** — `department_id` (required), `name`, `description`, `owner_id`,
  `status` (active | on_hold | completed | cancelled), `start_date`, `due_date`,
  `health_override` (null | on_track | at_risk | off_track), `health_override_reason`,
  `health_override_expires_at`
- **milestones** — `project_id`, `name`, `due_date`, `owner_id`, `completed_at`, `sort_order`
- **tasks** — `project_id`, `milestone_id` (optional), `title`, `description`,
  `status` (todo | in_progress | blocked | done), `priority` (low | medium | high | urgent),
  `assignee_id`, `due_date`, `completed_at`, `position`
- **project_updates** — `project_id`, `author_id`, `body`, `next_step` (optional text),
  `created_at`. Edits are allowed until the next report snapshot is taken.
- **activity_events** — `project_id`, `actor_id`, `kind` (task_completed, milestone_completed,
  milestone_date_changed, status_changed, health_overridden, …), `payload` jsonb, `created_at`.
  Written by database triggers so the activity summary can't drift from the real data.
- **report_settings** (one per workspace) — `mode` (draft_approve | auto_send),
  `cadence_anchor_date`, `send_weekday`, `send_hour` (in workspace timezone),
  `recipients` text[], `reminder_days_before` (default 1),
  `at_risk_window_days` (default 7), `staleness_counts_toward_health` (default true),
  `layout` (dense_table | detailed_cards, default dense_table),
  `charts` jsonb: on/off for each chart on each screen (see §7); all on by default
- **workspace_branding** — `logo_path` (Supabase Storage), `accent_color`, `display_name`
- Demo rows carry `is_demo = true` on projects, departments, milestones, tasks and updates, so
  "wipe demo data" deletes exactly those rows and nothing real.
- **reports** — `period_start`, `period_end`, `status` (draft | approved | sent | discarded),
  `trigger` (scheduled | manual), `generated_by`, `approved_by`, `sent_at`,
  `snapshot` jsonb (the full, fixed report data), `generated_at`
- **email_log** — `kind` (report | reminder), `to`, `report_id`, `status`, `error`, `sent_at`

## 5. Health rules

Health is calculated when read and saved into each snapshot, with `source = auto | override`.

1. **Off track** if any incomplete milestone is past its due date, OR the project `due_date`
   has passed and the project isn't completed.
2. **At risk** if an incomplete milestone is due within `at_risk_window_days` (default 7),
   OR there's been no project update in the current cycle (when `staleness_counts_toward_health`).
3. Otherwise **On track**.

**Override:** the project owner or an admin sets a status and a reason (required). By default
the override **expires at the end of the current report cycle**, so a stale override can't hide
a real problem. The report shows both values, e.g. "At risk (override; auto: Off track)".

Projects that are `on_hold`, `completed` or `cancelled` appear in the report with that status
instead of a health rating.

## 6. The biweekly report

**Period:** every 14 days, counted from `cadence_anchor_date`, ending on the configured send day.

**Structure** (the same for the in-app page, PDF and email):

1. **Portfolio summary** — number of projects per department by health, change in health since
   the previous snapshot, and the number of projects missing an update. Followed by whichever
   charts are turned on for the report (§7).
2. **One section per department**, with one row (dense table) or card (detailed cards) per project:
   - project name, **owner**, status
   - **health** (with override marker and change since the previous report, e.g. ▲ / ▼)
   - **recent updates**: owner-written update(s) from this period, or "No update this cycle"
   - **activity this period** (auto): tasks completed, milestones completed or re-dated
   - **next milestone**: name, **due date**, owner (+ the free-text next step from the latest update)

**Exports**
- **PDF**: the full layout above. Page breaks between departments, with an optional
  per-department export.
- **Excel**: a Summary sheet plus one sheet per department, with a flat row per project.
- **CSV**: a single flat file with one row per project and a department column.
- **Email**: an HTML summary (portfolio summary table plus a link to the in-app report) with
  the PDF attached, sent to `recipients`.

Every export reads from the **snapshot**, so re-downloading an old report gives exactly
what was sent.

**Layouts** (a report setting):
- **Dense table** (default): one row per project. Columns are Project · Owner · Health · Δ ·
  Latest update · Next milestone · Due. In the PDF, updates are cut to about 280 characters
  ending in "…" (full text in the app); the email summary shows only the counts.
- **Detailed cards**: one card per project with the full update text, the activity list and
  the milestone details. Best for under 25 projects.

**Filters (in-app):** department, health, owner, and picking a past report snapshot.
A "Live preview" view shows what the report would say right now, without saving it.

## 7. Visual design

**Look:** executive and corporate. A navy app header and report header band ("PORTFOLIO
STATUS · Cycle ending Fri 9 Oct 2026"), slate neutrals, white content surfaces, thin table
borders, and compact row height. Inter font with tabular figures, so numbers and dates line up
in columns. One accent color (navy by default; admins can change it). Colors are defined as
tokens, so a dark theme can be added later. v1 has a light theme only, and the PDF is always light.

**Health status colors** are reserved for health and never reused for anything else. Health
is never shown by color alone: every badge has a **shape and a label**, so it still reads when
printed in black and white and for colorblind readers.

| Health | Color | Mark |
|---|---|---|
| On track | green `#0ca30c` | ● circle + "On track" |
| At risk | amber `#fab219` | ▲ triangle + "At risk" |
| Off track | red `#d03b3b` | ◆ diamond + "Off track" |
| On hold / completed / cancelled | slate gray | ○ outline + label |

An override shows a small "override" tag; its tooltip shows the automatic value.

**Charts** (each can be turned on or off separately for the dashboard, the in-app report,
and the PDF/email):

| Chart | Form | Why this form |
|---|---|---|
| Overall portfolio health | Three large numbers (on track / at risk / off track) + one 100% bar | Parts of a whole. The numbers carry the headline |
| Health by department | Horizontal stacked bars, one per department | Comparing parts of a whole across groups with long names |
| Upcoming milestones | Timeline: dates across, one row per department, one dot per milestone, with a "today" line; 30 / 60-day toggle | Shows where deadlines cluster |
| Health trend | Three lines (count by health) across the past report snapshots | Change over time on one axis; comes from snapshots, so it's accurate history |

Chart rules: thin bars with a 2px gap between segments; a legend plus direct labels; grid
lines kept faint; hovering a bar, dot or point shows a tooltip in the app; every chart has a
"view as table" option. The chart layout math is written once and drawn two ways: as SVG in
the browser and as SVG in the PDF. Email clients don't render SVG reliably, so the email body
draws the health bars as simple HTML table cells, and the full charts are in the attached PDF.

**Phone layout:** the navigation collapses to a menu; the dense report table becomes one
stacked card per project; charts stretch to full width. Project and report settings, and
bulk task editing, are desktop-only in v1.

## 8. Scheduling and reminders

Vercel Hobby allows scheduled (cron) jobs at most **once a day**, and a job may fire at any
point within its scheduled hour. One daily job does the following:

1. **Reminder day** (send day − `reminder_days_before`): email the owners of active projects
   that have no update this cycle.
2. **Report day**:
   - `draft_approve` → generate a draft snapshot and email the admins "Draft ready for review".
     An admin can review, regenerate or approve & send.
   - `auto_send` → generate, approve and send to `recipients`.
3. Always: keep the Supabase project active. The daily run also stops the free-plan
   auto-pause after 7 days of inactivity.

An in-app **banner** shows each owner their projects missing an update this cycle
(from cycle start until the report is generated).

Admins can **Generate report now** at any time (manual trigger, any period end = now). It is
saved as a draft by default and can then be approved and sent.

The sending job is idempotent: a report with status `sent` is never re-sent, and every send
attempt is recorded in `email_log`.

## 9. Roles and permissions

| Action | Member | Project owner | Admin / Owner |
|---|---|---|---|
| View all projects and reports | ✓ | ✓ | ✓ |
| Create and edit tasks | ✓ | ✓ | ✓ |
| Post a project update | – | ✓ (own projects) | ✓ |
| Edit a project, its milestones, or override health | – | ✓ (own projects) | ✓ |
| Create projects | ✓ | ✓ | ✓ |
| Manage departments, members, invites, report settings | – | – | ✓ |
| Generate, approve and send reports | – | – | ✓ |

## 10. Screens

1. `/login` — Google sign-in
2. `/onboarding` — create the workspace, or accept an invite link
3. `/w/[slug]` — dashboard: projects needing my update (banner), portfolio charts (whichever are turned on), my open tasks and milestones
4. `/w/[slug]/projects` — list grouped by department, filterable by department, health, owner and status
5. `/w/[slug]/projects/[id]` — overview (health, next milestone), updates feed + "Post update", milestones, tasks, activity
6. `/w/[slug]/reports` — list of past snapshots, **Generate now**, live preview
7. `/w/[slug]/reports/[id]` — report view, approve & send, download PDF / Excel / CSV
8. `/w/[slug]/settings` — members & invites, departments, report settings (schedule, mode, recipients, thresholds, layout), charts (on/off for each screen), branding (logo, accent color), demo data (load / wipe)

## 11. Milestones (one PR each)

| # | Scope | Done when |
|---|---|---|
| M0 | Scaffold: Next.js, Tailwind/shadcn, lint/format/typecheck, Vitest, CI, Supabase migrations setup, Vercel + Supabase projects created; design tokens (colors, type, health badges) + app shell (header, nav, phone menu) | CI green; the app shell deploys to a Vercel preview |
| M1 | Auth + workspace + members + invite links + departments; RLS helpers | Google sign-in works; RLS tests prove a non-member sees nothing |
| M2 | Projects + milestones (CRUD, owner, department); demo data loader + wipe | Projects list grouped by department; the next milestone is calculated; wiping removes only demo rows |
| M3 | Tasks + activity events (database triggers) | Task changes produce activity rows; filters and sorting work |
| M4 | Project updates + health engine + override + in-app banner | Unit tests cover every health rule and the override expiry |
| M5 | Reports: snapshot generation, in-app report view (dense table + detailed cards), history, live preview, **Generate now**; the four charts + on/off settings on the dashboard and report | A snapshot matches the live data at generation time; old snapshots don't change; charts match their table views |
| M6 | Exports: PDF (with charts, branding, both layouts), Excel, CSV | All three open correctly and match the snapshot; the PDF is readable when printed in black and white |
| M7 | Email + scheduling: Gmail SMTP provider, daily cron, reminders, draft/approve/auto-send, email log | A dry run for a simulated report day sends the correct emails exactly once |
| M8 | Hardening: empty and error states, phone layout check, Playwright end-to-end run (sign in → project → update → report → export), weekly database backup, production deploy | Production URL live with demo data loaded |

## 12. Constraints and risks

- **Gmail SMTP:** about 500 recipients a day, and mail is sent from your personal address.
  Needs a Google **app password** (requires 2-step verification), stored only as a
  Vercel environment variable. Moving to Resend later needs a domain and a DNS change.
- **Vercel Hobby:** non-commercial use only. Cron runs daily with ±59 min precision, so
  "send at 8:00" means "sometime between 8:00 and 8:59". If this becomes a work tool,
  moving to Pro removes both limits.
- **Supabase free plan:** 500 MB database, and projects pause after 7 days without activity.
  The daily cron job prevents pausing. There's no automatic backup on the free plan, so
  a weekly `pg_dump` via GitHub Actions is added in M8.
- **Update discipline:** report quality depends on owners posting updates. The reminders,
  the banner and the staleness → at-risk rule are the counter-measures.

## 13. Out of scope for v1

Kanban board, Gantt/timeline planning view (the milestone timeline chart is in scope), time and budget tracking, comments, attachments, realtime
updates, department-level access restrictions, per-department email distribution, and
AI-written summaries. The schema doesn't block any of these.

## 14. Open items

None blocking. Defaults, all changeable in settings:
- First report: the first Friday at least 7 days after the production launch. Draft at
  8:00 ET, reminder Thursday 8:00 ET.
- Report recipients: you (the workspace owner) until you add a distribution list.
