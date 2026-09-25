import { addDays } from "./projects";
import type { ProjectStatus } from "./projects";

/**
 * Demo portfolio (docs/PLAN.md D23). Dates are offsets in days from "today" so
 * the sample always contains overdue, imminent and comfortable milestones,
 * which the health rules (M5) and charts (M6) need to look meaningful.
 */

export interface DemoMilestone {
  name: string;
  dueInDays: number | null;
  completed?: boolean;
}

export interface DemoProject {
  name: string;
  department: string;
  description: string;
  status: ProjectStatus;
  startInDays: number | null;
  dueInDays: number | null;
  milestones: DemoMilestone[];
}

export const DEMO_DEPARTMENTS = ["Marketing", "Operations", "Product", "Finance"] as const;

export const DEMO_PROJECTS: DemoProject[] = [
  {
    name: "Q4 campaign launch",
    department: "Marketing",
    description: "Integrated campaign across paid, email and events for the Q4 push.",
    status: "active",
    startInDays: -40,
    dueInDays: 45,
    milestones: [
      { name: "Creative approved", dueInDays: -12, completed: true },
      { name: "Media plan signed off", dueInDays: 3 },
      { name: "Launch", dueInDays: 30 },
    ],
  },
  {
    name: "Website refresh",
    department: "Marketing",
    description: "New homepage, pricing page and case-study template.",
    status: "active",
    startInDays: -60,
    dueInDays: 20,
    milestones: [
      { name: "Design sign-off", dueInDays: -20, completed: true },
      { name: "Content migrated", dueInDays: -4 },
      { name: "Go live", dueInDays: 18 },
    ],
  },
  {
    name: "Customer newsletter relaunch",
    department: "Marketing",
    description: "Move to the new email platform and a monthly cadence.",
    status: "on_hold",
    startInDays: -30,
    dueInDays: 60,
    milestones: [{ name: "Platform selected", dueInDays: 25 }],
  },
  {
    name: "ERP upgrade",
    department: "Operations",
    description: "Upgrade to the current ERP release and retire two custom integrations.",
    status: "active",
    startInDays: -90,
    dueInDays: 75,
    milestones: [
      { name: "Sandbox validated", dueInDays: -30, completed: true },
      { name: "Data migration rehearsal", dueInDays: 6 },
      { name: "Cutover weekend", dueInDays: 55 },
      { name: "Hypercare complete", dueInDays: 75 },
    ],
  },
  {
    name: "Warehouse slotting review",
    department: "Operations",
    description: "Re-slot the main warehouse to cut pick time by 15%.",
    status: "active",
    startInDays: -20,
    dueInDays: 40,
    milestones: [
      { name: "Velocity analysis", dueInDays: -2 },
      { name: "Re-slot plan approved", dueInDays: 14 },
    ],
  },
  {
    name: "Vendor consolidation",
    department: "Operations",
    description: "Reduce active packaging suppliers from nine to four.",
    status: "completed",
    startInDays: -120,
    dueInDays: -10,
    milestones: [
      { name: "RFP issued", dueInDays: -80, completed: true },
      { name: "Contracts signed", dueInDays: -15, completed: true },
    ],
  },
  {
    name: "Mobile app v2",
    department: "Product",
    description: "Rebuild the customer app with offline support and push notifications.",
    status: "active",
    startInDays: -75,
    dueInDays: 90,
    milestones: [
      { name: "Beta to 50 customers", dueInDays: 2 },
      { name: "App store submission", dueInDays: 60 },
      { name: "General availability", dueInDays: 90 },
    ],
  },
  {
    name: "Self-service onboarding",
    department: "Product",
    description: "Let new accounts set up without a sales call.",
    status: "active",
    startInDays: -15,
    dueInDays: 50,
    milestones: [
      { name: "Flow prototype tested", dueInDays: 10 },
      { name: "Release", dueInDays: 48 },
    ],
  },
  {
    name: "Reporting API",
    department: "Product",
    description: "Public API for customers to pull their usage data.",
    status: "cancelled",
    startInDays: -50,
    dueInDays: null,
    milestones: [{ name: "Spec review", dueInDays: null }],
  },
  {
    name: "Annual audit preparation",
    department: "Finance",
    description: "Evidence collection and control testing ahead of the year-end audit.",
    status: "active",
    startInDays: -10,
    dueInDays: 65,
    milestones: [
      { name: "Control walkthroughs", dueInDays: 12 },
      { name: "Evidence pack complete", dueInDays: 50 },
    ],
  },
  {
    name: "Expense tool rollout",
    department: "Finance",
    description: "Replace spreadsheet expense claims with the new tool for all staff.",
    status: "active",
    startInDays: -35,
    dueInDays: 5,
    milestones: [
      { name: "Pilot group live", dueInDays: -25, completed: true },
      { name: "All departments live", dueInDays: -1 },
    ],
  },
  {
    name: "Budget planning FY27",
    department: "Finance",
    description: "Bottom-up budget with department heads.",
    status: "active",
    startInDays: 5,
    dueInDays: 80,
    milestones: [
      { name: "Templates issued", dueInDays: 20 },
      { name: "Board approval", dueInDays: 80 },
    ],
  },
];

export function demoDate(today: string, offset: number | null): string | null {
  return offset === null ? null : addDays(today, offset);
}
