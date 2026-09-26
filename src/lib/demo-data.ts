import { addDays } from "./projects";
import type { ProjectStatus } from "./projects";
import type { TaskPriority, TaskStatus } from "./tasks";

/**
 * Demo portfolio (docs/PLAN.md D23). Dates are offsets in days from "today" so
 * the sample always contains overdue, imminent and comfortable milestones,
 * which the health rules (M5) and charts (M6) need to look meaningful.
 *
 * Owners are demo *people* (D31): most never sign in, which is exactly the
 * case the directory exists for. `YOU` marks projects the admin loading the
 * data owns, so "my projects" and "my tasks" have something to show.
 */

export const YOU = "you";

export interface DemoPerson {
  name: string;
  email: string;
}

export interface DemoMilestone {
  name: string;
  dueInDays: number | null;
  completed?: boolean;
}

export interface DemoTask {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueInDays: number | null;
  /** Demo person name, YOU, or omitted for unassigned. */
  assignee?: string;
  /** Milestone name in the same project. */
  milestone?: string;
}

export interface DemoProject {
  name: string;
  department: string;
  description: string;
  status: ProjectStatus;
  /** Demo person name or YOU. */
  owner: string;
  startInDays: number | null;
  dueInDays: number | null;
  milestones: DemoMilestone[];
  tasks: DemoTask[];
}

export const DEMO_DEPARTMENTS = ["Marketing", "Operations", "Product", "Finance"] as const;

export const DEMO_PEOPLE: DemoPerson[] = [
  { name: "Dana Reyes", email: "dana.reyes@example.com" },
  { name: "Priya Natarajan", email: "priya.natarajan@example.com" },
  { name: "Marcus Bell", email: "marcus.bell@example.com" },
  { name: "Elena Fischer", email: "elena.fischer@example.com" },
];

export const DEMO_PROJECTS: DemoProject[] = [
  {
    name: "Q4 campaign launch",
    department: "Marketing",
    description: "Integrated campaign across paid, email and events for the Q4 push.",
    status: "active",
    owner: "Dana Reyes",
    startInDays: -40,
    dueInDays: 45,
    milestones: [
      { name: "Creative approved", dueInDays: -12, completed: true },
      { name: "Media plan signed off", dueInDays: 3 },
      { name: "Launch", dueInDays: 30 },
    ],
    tasks: [
      {
        title: "Finalize channel budget split",
        status: "in_progress",
        priority: "high",
        dueInDays: 2,
        assignee: "Dana Reyes",
        milestone: "Media plan signed off",
      },
      {
        title: "Brief the events agency",
        status: "todo",
        priority: "medium",
        dueInDays: 9,
        assignee: YOU,
        milestone: "Launch",
      },
      {
        title: "Approve landing page copy",
        status: "done",
        priority: "medium",
        dueInDays: -5,
        assignee: "Dana Reyes",
        milestone: "Creative approved",
      },
    ],
  },
  {
    name: "Website refresh",
    department: "Marketing",
    description: "New homepage, pricing page and case-study template.",
    status: "active",
    owner: YOU,
    startInDays: -60,
    dueInDays: 20,
    milestones: [
      { name: "Design sign-off", dueInDays: -20, completed: true },
      { name: "Content migrated", dueInDays: -4 },
      { name: "Go live", dueInDays: 18 },
    ],
    tasks: [
      {
        title: "Migrate remaining case studies",
        status: "blocked",
        priority: "urgent",
        dueInDays: -3,
        assignee: "Marcus Bell",
        milestone: "Content migrated",
      },
      {
        title: "Set up redirects for old URLs",
        status: "todo",
        priority: "high",
        dueInDays: 12,
        assignee: YOU,
        milestone: "Go live",
      },
    ],
  },
  {
    name: "Customer newsletter relaunch",
    department: "Marketing",
    description: "Move to the new email platform and a monthly cadence.",
    status: "on_hold",
    owner: "Dana Reyes",
    startInDays: -30,
    dueInDays: 60,
    milestones: [{ name: "Platform selected", dueInDays: 25 }],
    tasks: [
      {
        title: "Shortlist email platforms",
        status: "todo",
        priority: "low",
        dueInDays: null,
        milestone: "Platform selected",
      },
    ],
  },
  {
    name: "ERP upgrade",
    department: "Operations",
    description: "Upgrade to the current ERP release and retire two custom integrations.",
    status: "active",
    owner: "Priya Natarajan",
    startInDays: -90,
    dueInDays: 75,
    milestones: [
      { name: "Sandbox validated", dueInDays: -30, completed: true },
      { name: "Data migration rehearsal", dueInDays: 6 },
      { name: "Cutover weekend", dueInDays: 55 },
      { name: "Hypercare complete", dueInDays: 75 },
    ],
    tasks: [
      {
        title: "Load anonymized data into staging",
        status: "in_progress",
        priority: "high",
        dueInDays: 4,
        assignee: "Priya Natarajan",
        milestone: "Data migration rehearsal",
      },
      {
        title: "Write cutover runbook",
        status: "todo",
        priority: "medium",
        dueInDays: 40,
        assignee: "Marcus Bell",
        milestone: "Cutover weekend",
      },
      {
        title: "Retire legacy invoice integration",
        status: "todo",
        priority: "medium",
        dueInDays: 30,
      },
    ],
  },
  {
    name: "Warehouse slotting review",
    department: "Operations",
    description: "Re-slot the main warehouse to cut pick time by 15%.",
    status: "active",
    owner: "Marcus Bell",
    startInDays: -20,
    dueInDays: 40,
    milestones: [
      { name: "Velocity analysis", dueInDays: -2 },
      { name: "Re-slot plan approved", dueInDays: 14 },
    ],
    tasks: [
      {
        title: "Pull 90-day pick data",
        status: "done",
        priority: "medium",
        dueInDays: -8,
        assignee: "Marcus Bell",
        milestone: "Velocity analysis",
      },
      {
        title: "Model A/B/C velocity bands",
        status: "in_progress",
        priority: "high",
        dueInDays: -1,
        assignee: "Marcus Bell",
        milestone: "Velocity analysis",
      },
    ],
  },
  {
    name: "Vendor consolidation",
    department: "Operations",
    description: "Reduce active packaging suppliers from nine to four.",
    status: "completed",
    owner: "Priya Natarajan",
    startInDays: -120,
    dueInDays: -10,
    milestones: [
      { name: "RFP issued", dueInDays: -80, completed: true },
      { name: "Contracts signed", dueInDays: -15, completed: true },
    ],
    tasks: [
      {
        title: "Archive superseded supplier contracts",
        status: "done",
        priority: "low",
        dueInDays: -12,
        assignee: "Priya Natarajan",
      },
    ],
  },
  {
    name: "Mobile app v2",
    department: "Product",
    description: "Rebuild the customer app with offline support and push notifications.",
    status: "active",
    owner: "Elena Fischer",
    startInDays: -75,
    dueInDays: 90,
    milestones: [
      { name: "Beta to 50 customers", dueInDays: 2 },
      { name: "App store submission", dueInDays: 60 },
      { name: "General availability", dueInDays: 90 },
    ],
    tasks: [
      {
        title: "Recruit beta cohort",
        status: "in_progress",
        priority: "urgent",
        dueInDays: 1,
        assignee: "Elena Fischer",
        milestone: "Beta to 50 customers",
      },
      {
        title: "Offline sync conflict handling",
        status: "todo",
        priority: "high",
        dueInDays: 20,
        assignee: "Elena Fischer",
        milestone: "App store submission",
      },
      {
        title: "Push notification opt-in copy",
        status: "todo",
        priority: "low",
        dueInDays: 35,
        assignee: "Dana Reyes",
      },
    ],
  },
  {
    name: "Self-service onboarding",
    department: "Product",
    description: "Let new accounts set up without a sales call.",
    status: "active",
    owner: "Elena Fischer",
    startInDays: -15,
    dueInDays: 50,
    milestones: [
      { name: "Flow prototype tested", dueInDays: 10 },
      { name: "Release", dueInDays: 48 },
    ],
    tasks: [
      {
        title: "Run five prototype sessions",
        status: "todo",
        priority: "high",
        dueInDays: 8,
        assignee: "Elena Fischer",
        milestone: "Flow prototype tested",
      },
    ],
  },
  {
    name: "Reporting API",
    department: "Product",
    description: "Public API for customers to pull their usage data.",
    status: "cancelled",
    owner: "Elena Fischer",
    startInDays: -50,
    dueInDays: null,
    milestones: [{ name: "Spec review", dueInDays: null }],
    tasks: [],
  },
  {
    name: "Annual audit preparation",
    department: "Finance",
    description: "Evidence collection and control testing ahead of the year-end audit.",
    status: "active",
    owner: YOU,
    startInDays: -10,
    dueInDays: 65,
    milestones: [
      { name: "Control walkthroughs", dueInDays: 12 },
      { name: "Evidence pack complete", dueInDays: 50 },
    ],
    tasks: [
      {
        title: "Schedule walkthroughs with process owners",
        status: "in_progress",
        priority: "high",
        dueInDays: 3,
        assignee: YOU,
        milestone: "Control walkthroughs",
      },
      {
        title: "Collect Q3 access reviews",
        status: "todo",
        priority: "medium",
        dueInDays: 25,
        assignee: "Priya Natarajan",
        milestone: "Evidence pack complete",
      },
    ],
  },
  {
    name: "Expense tool rollout",
    department: "Finance",
    description: "Replace spreadsheet expense claims with the new tool for all staff.",
    status: "active",
    owner: "Priya Natarajan",
    startInDays: -35,
    dueInDays: 5,
    milestones: [
      { name: "Pilot group live", dueInDays: -25, completed: true },
      { name: "All departments live", dueInDays: -1 },
    ],
    tasks: [
      {
        title: "Train Operations team",
        status: "done",
        priority: "medium",
        dueInDays: -6,
        assignee: "Priya Natarajan",
        milestone: "All departments live",
      },
      {
        title: "Switch off the old spreadsheet form",
        status: "blocked",
        priority: "high",
        dueInDays: -1,
        assignee: "Priya Natarajan",
        milestone: "All departments live",
      },
    ],
  },
  {
    name: "Budget planning FY27",
    department: "Finance",
    description: "Bottom-up budget with department heads.",
    status: "active",
    owner: YOU,
    startInDays: 5,
    dueInDays: 80,
    milestones: [
      { name: "Templates issued", dueInDays: 20 },
      { name: "Board approval", dueInDays: 80 },
    ],
    tasks: [
      {
        title: "Draft budget template",
        status: "todo",
        priority: "medium",
        dueInDays: 15,
        assignee: YOU,
        milestone: "Templates issued",
      },
    ],
  },
];

export function demoDate(today: string, offset: number | null): string | null {
  return offset === null ? null : addDays(today, offset);
}
