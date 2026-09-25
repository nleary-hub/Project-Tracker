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
| D2 | Sign-in | Google OAuth via Supabase Auth; admins send copyable invite links (no invite emails). Each link admits one person, expires after 7 days and can be revoked |
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
| D24 | Interactive tables | Sort and filter from column headers; drag rows and columns to reorder, with animation; resize column widths and row height (see §8) |
| D25 | Layout sharing | Default **everything shared**. An admin can switch to *split* (row order shared, everything else per person) or *everything personal*. Filters are always per person (see §8) |
| D26 | Dragging while sorted | Dragging a row turns sorting off and saves the current order as the new manual order, with your move applied. An Undo notice appears |
| D27 | Department grouping | Dragging a project into another department asks for confirmation first. Departments themselves can be dragged; their order sets the order of report sections |
| D28 | Row height | Compact / Default / Comfortable presets, plus dragging any row's bottom edge to set the height for all rows. Double-click the edge to fit the tallest text |
| D29 | Hide from report | Admins can hide a project from reports, either until they turn it back on or for a single draft only. Non-admins can't see the control, the flag or that anything was hidden, and the database enforces this (see §6) |
| D30 | Live layout updates | Deferred to v1.1: shared layout changes will appear instantly for everyone via Supabase Realtime (see §15) |

## 3. Stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router), TypeScript, server actions |
| UI | Tailwind CSS + shadcn/ui |
| Data / Auth | Supabase Postgres + Auth (Google), with Row Level Security (RLS) on every table |
| Validation | Zod, shared between forms and server actions |
| PDF | `@react-pdf/renderer` (no headless browser needed, fits serverless limits) |
| Tables | TanStack Table (sorting, filtering, column order, sizing, visibility) with virtualized rows via TanStack Virtual |
| Drag & drop | dnd-kit (pointer, touch and keyboard sensors, screen-reader announcements) + its sortable/animation utilities |
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
- **Ordering:** `departments`, `projects`, `milestones` and `tasks` each carry a `rank` text column
  (fractional index). Moving a row updates only that one row, so concurrent moves don't
  rewrite a whole list.
- **table_layouts** — `workspace_id`, `user_id` (null = shared), `table_key`
  (projects | tasks | milestones | report), `column_order` text[], `column_widths` jsonb,
  `hidden_columns` text[], `sort` jsonb, `density` (compact | default | comfortable),
  `row_height_px`, `updated_by`, `updated_at`
- **user_row_ranks** — `user_id`, `table_key`, `row_id`, `rank`. Only used in
  *everything personal* mode.
- **user_table_filters** — `user_id`, `table_key`, `filters` jsonb. Always per person.
- **workspace_settings.layout_sharing** — shared | split | personal (default shared).
- **workspace_branding** — `logo_path` (Supabase Storage), `accent_color`, `display_name`
- Demo rows carry `is_demo = true` on projects, departments, milestones, tasks and updates, so
  "wipe demo data" deletes exactly those rows and nothing real.
- **reports** — `period_start`, `period_end`, `status` (draft | approved | sent | discarded),
  `trigger` (scheduled | manual), `generated_by`, `approved_by`, `sent_at`,
  `snapshot` jsonb (the full, fixed report data), `generated_at`
- **report_exclusions** (admin-only) — `project_id`, `report_id` (null = hidden until turned
  back on; set = hidden from that one draft only), `reason` (optional), `created_by`, `created_at`.
  The RLS policy grants **select, insert and delete to admins and owners only**, so members get
  no rows back even if they query the table directly. It is a separate table, not a column on
  `projects`, so the flag never appears in data members can read.
- **report_exclusion_log** (admin-only) — `report_id`, `project_id`, `reason`: which projects were
  left out of each snapshot, under the same admin-only policy. Nothing about
  exclusions is stored in the snapshot JSON that members can read.
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

**Hiding a project from the report (admins only)**
- **How admins hide one:** from the project's ⋯ menu (or an admin-only **In report** toggle
  column in the projects table) choose **Hide from reports**. It stays hidden until turned
  back on. In a draft's review screen there is also **Remove from this report only**. Either
  way the admin can add an optional reason ("Confidential until board approval").
- **Effect:** the project is left out of every part of the report: department sections,
  portfolio counts, report charts, the health trend (snapshots never include it), PDF, Excel,
  CSV and email.
- **Admins see:** a small "hidden from report" icon on the project, and a collapsed
  "Hidden from this report (2)" list at the bottom of the report (in-app only, never
  exported), where each project can be restored in one click. Hiding and restoring are
  recorded in an admin-only audit log, not the activity feed.
- **Non-admins see nothing:** no menu item, no column, no icon, no gap in the report, and
  totals that add up. The live (non-report) dashboard and projects list still show the
  project normally to anyone who can see it; only reports leave it out.
- **Enforced by the database, not just hidden in the interface:** the report
  builder reads exclusions with admin-level access on the server, and members can't read
  the exclusions tables at all (RLS tests in M6 prove this).
- The owner still gets the usual update reminders, so the project stays tracked and a
  reminder doesn't reveal that it was hidden.

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

## 8. Interactive tables

Applies to the **projects list, task tables, milestone lists and the in-app report table**.
A single shared `DataTable` component provides all of it, so every table behaves the same.

**Sorting and filtering from the column headers**
- Click a header to sort ascending, again for descending, a third time to clear. Shift-click
  adds a second (and third) sort level. The header shows ▲ / ▼, and a small 1, 2, 3 for
  sort levels.
- Each header has a ⋯ menu: sort, filter, hide column, reset width.
- Filters depend on the column type. Text: *contains*. Status, health, owner and department:
  pick one or more values, each with its count. Dates: a range picker plus presets
  (*Overdue*, *This week*, *Next 30 days*, *No date*).
- Active filters appear as chips above the table ("Health: At risk, Off track ✕") with
  **Clear all**. A filtered column's header shows a filled funnel icon.
- The current filters and sort are kept in the page URL, so a filtered view can be
  bookmarked or shared as a link.
- Filters are **always per person**, whatever the sharing mode. Otherwise one person
  filtering to Marketing would hide every other department from everyone. Sorting follows
  the sharing mode.

**Drag to reorder rows and columns**
- Rows have a ⠿ handle on hover. Column headers are dragged by the header itself.
- **While dragging:** the item lifts slightly (shadow, 2% scale) and follows the pointer as a
  translucent copy. Its original place shows a dashed outline. Other rows or columns slide
  aside smoothly (about 180 ms) to open a gap where it will land.
- **Insertion marker:** a 2 px accent-colored line with an end dot marks exactly where the
  item will be inserted, e.g. "between ERP upgrade and Q4 campaign". For columns, the line is
  vertical and runs the full height of the table.
- **Across departments:** the target department's header highlights and shows
  "Move to Marketing". Dropping there opens a confirmation dialog. Cancelling animates the
  row back to where it started.
- **Departments:** drag a department header to move the whole group. Its projects collapse
  into a single bar while dragging, so the move stays readable.
- **Drop:** the item settles into place with a short ease-out. The move is saved immediately
  (the screen updates at once and rolls back if saving fails), and an **Undo** notice shows
  for 8 seconds.
- The table scrolls automatically when you drag near its top or bottom edge. **Esc** cancels
  a drag.
- **Keyboard:** focus a handle, press Space to pick up, use the arrow keys to move, Space
  to drop, Esc to cancel. A screen reader announces each position ("Position 3 of 12 in
  Operations").
- If the operating system is set to reduce motion, animations are turned off, and the
  insertion marker still shows.
- **Dragging while sorted:** turns sorting off, keeps the order currently shown, and applies
  your move (see D26).
- **Dragging while filtered:** the move is placed relative to the rows you can see, and hidden
  rows keep their positions.

**Resizing**
- **Columns:** drag the right edge of a header (the cursor changes when you're over it; a
  guide line follows the drag). Double-click the edge to fit the widest content. Each column
  has a minimum width so none can collapse to nothing.
- **Rows:** Compact / Default / Comfortable presets in the table toolbar, or drag any row's
  bottom edge to set one height for all rows. Double-click the edge to fit the tallest content.
- **Reset layout** in the toolbar restores the default columns, widths and height.

**Who sees what** (`layout_sharing`, set by an admin; the default is *shared*):

| | Row order | Column order, widths, hidden columns, row height | Sort | Filters |
|---|---|---|---|---|
| **Shared** (default) | everyone | everyone | everyone | per person |
| **Split** | everyone | per person | per person | per person |
| **Personal** | per person | per person | per person | per person |

- In *shared* mode any member can change the layout, and the change applies to everyone.
  Each change records who made it, and the toolbar shows "Layout last changed by R. Lee, 2m ago".
- Only admins can reorder departments (it's department management). Moving a project
  between departments follows the project-edit permission (its owner or an admin).
- **The report** always uses the **shared** department and project order: in personal
  mode, the order admins set (from shared mode, or the admin "Shared order" view). The
  in-app report table's column order and hidden columns also apply to the PDF and Excel
  exports. Column widths are scaled to fit the page. Every snapshot saves the order it was
  generated with.
- Other people see a shared change the next time the page refreshes, or when they switch back
  to its tab. Instant updates between users are planned for v1.1 (§15).

**Phones:** sorting and filtering happen in a "Sort & filter" panel. Dragging and resizing are
desktop-only. The dense table becomes cards (see §7).

## 9. Scheduling and reminders

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

## 10. Roles and permissions

| Action | Member | Project owner | Admin / Owner |
|---|---|---|---|
| View all projects and reports | ✓ | ✓ | ✓ |
| Create and edit tasks | ✓ | ✓ | ✓ |
| Post a project update | – | ✓ (own projects) | ✓ |
| Edit a project, its milestones, or override health | – | ✓ (own projects) | ✓ |
| Create projects | ✓ | ✓ | ✓ |
| Manage departments, members, invites, report settings | – | – | ✓ |
| Reorder rows, columns, widths (shared mode) | ✓ | ✓ | ✓ |
| Move a project to another department | – | ✓ (own projects) | ✓ |
| Reorder departments; change layout-sharing mode | – | – | ✓ |
| Generate, approve and send reports | – | – | ✓ |
| Hide a project from reports (control not shown to others) | – | – | ✓ |

## 11. Screens

1. `/login` — Google sign-in
2. `/onboarding` — create the workspace, or accept an invite link
3. `/w/[slug]` — dashboard: projects needing my update (banner), portfolio charts (whichever are turned on), my open tasks and milestones
4. `/w/[slug]/projects` — list grouped by department, filterable by department, health, owner and status
5. `/w/[slug]/projects/[id]` — overview (health, next milestone), updates feed + "Post update", milestones, tasks, activity
6. `/w/[slug]/reports` — list of past snapshots, **Generate now**, live preview
7. `/w/[slug]/reports/[id]` — report view, approve & send, download PDF / Excel / CSV
8. `/w/[slug]/settings` — members & invites, departments, report settings (schedule, mode, recipients, thresholds, layout), charts (on/off for each screen), branding (logo, accent color), demo data (load / wipe), layout-sharing mode

## 12. Milestones (one PR each)

| # | Scope | Done when |
|---|---|---|
| M0 | Scaffold: Next.js, Tailwind/shadcn, lint/format/typecheck, Vitest, CI, Supabase migrations setup, Vercel + Supabase projects created; design tokens (colors, type, health badges) + app shell (header, nav, phone menu) | CI green; the app shell deploys to a Vercel preview |
| M1 | Auth + workspace + members + invite links + departments; RLS helpers | Google sign-in works; RLS tests prove a non-member sees nothing |
| M2 | Projects + milestones (CRUD, owner, department); demo data loader + wipe | Projects list grouped by department; the next milestone is calculated; wiping removes only demo rows |
| M3 | **Interactive tables**: `DataTable` component (header sort and filters, filter chips, filters and sort in the URL), row and column drag with animations and insertion marker, cross-department confirm, department drag, column resize, row-height presets and drag, Undo, keyboard drag; `rank` ordering, `table_layouts`, three sharing modes. Applied to the projects list | Playwright drag tests (row, column, cross-department, Esc cancel, keyboard) pass; order survives a reload; each sharing mode verified with two users |
| M4 | Tasks + activity events (database triggers), using `DataTable` | Task changes produce activity rows |
| M5 | Project updates + health engine + override + in-app banner | Unit tests cover every health rule and the override expiry |
| M6 | Reports: snapshot generation, in-app report view (dense table + detailed cards), history, live preview, **Generate now**; admin-only hide from report (until turned back on, or this draft only) + audit log; the four charts + on/off settings on the dashboard and report | A snapshot matches the live data at generation time; old snapshots don't change; charts match their table views; RLS tests prove a member can't read exclusions, and hidden projects never appear in a snapshot or its exports |
| M7 | Exports: PDF (with charts, branding, both layouts), Excel, CSV | All three open correctly and match the snapshot; the PDF is readable when printed in black and white |
| M8 | Email + scheduling: Gmail SMTP provider, daily cron, reminders, draft/approve/auto-send, email log | A dry run for a simulated report day sends the correct emails exactly once |
| M9 | Hardening: empty and error states, phone layout check, Playwright end-to-end run (sign in → project → update → report → export), weekly database backup, production deploy | Production URL live with demo data loaded |

## 13. Constraints and risks

- **Gmail SMTP:** about 500 recipients a day, and mail is sent from your personal address.
  Needs a Google **app password** (requires 2-step verification), stored only as a
  Vercel environment variable. Moving to Resend later needs a domain and a DNS change.
- **Vercel Hobby:** non-commercial use only. Cron runs daily with ±59 min precision, so
  "send at 8:00" means "sometime between 8:00 and 8:59". If this becomes a work tool,
  moving to Pro removes both limits.
- **Supabase free plan:** 500 MB database, and projects pause after 7 days without activity.
  The daily cron job prevents pausing. There's no automatic backup on the free plan, so
  a weekly `pg_dump` via GitHub Actions is added in M9.
- **Update discipline:** report quality depends on owners posting updates. The reminders,
  the banner and the staleness → at-risk rule are the counter-measures.

## 14. Out of scope for v1

Kanban board, Gantt/timeline planning view (the milestone timeline chart is in scope),
time and budget tracking, comments, attachments, department-level access restrictions, per-department email distribution, and
AI-written summaries. The schema doesn't block any of these.

## 15. Later versions (roadmap)

**v1.1 — committed**
- **Live updates to shared layouts:** use Supabase Realtime so that when anyone reorders
  rows or columns, resizes, or changes the shared sort, every open copy of that table updates
  within about a second. The change animates the same way a drag does, and a brief "R. Lee
  moved ERP upgrade" notice appears. If someone else changes the layout while you are
  mid-drag, your drag finishes first, then the incoming change is applied on top. v1 is
  built with this in mind: every layout change is already one saved row with `updated_by`,
  so v1.1 only adds a subscription, not a data change.
- Live updates to data changes (tasks, updates, health), using the same mechanism.

**Later — candidates, not committed:** everything in §14.

## 16. Open items

None blocking. Defaults, all changeable in settings:
- First report: the first Friday at least 7 days after the production launch. Draft at
  8:00 ET, reminder Thursday 8:00 ET.
- Report recipients: you (the workspace owner) until you add a distribution list.
