import * as z from "zod";

import { PROJECT_STATUSES } from "@/lib/projects";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date.")
  .refine((s) => !Number.isNaN(Date.parse(s)), "That isn't a real date.");

/** Empty form fields arrive as "" and mean "not set". */
const optionalDate = z.preprocess((v) => (v === "" || v == null ? null : v), isoDate.nullable());
/** Selects can't submit an empty value, so "unassigned" is the form's spelling of null. */
export const UNASSIGNED = "unassigned";
const optionalUuid = z.preprocess(
  (v) => (v === "" || v === UNASSIGNED || v == null ? null : v),
  z.uuid().nullable(),
);

export const ProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give the project a name.")
      .max(120, "Keep it under 120 characters."),
    departmentId: z.uuid("Choose a department."),
    ownerId: optionalUuid,
    status: z.enum(PROJECT_STATUSES),
    startDate: optionalDate,
    dueDate: optionalDate,
    description: z.string().trim().max(4000, "Keep it under 4,000 characters.").default(""),
  })
  .refine((p) => !p.startDate || !p.dueDate || p.startDate <= p.dueDate, {
    message: "The due date can't be before the start date.",
    path: ["dueDate"],
  });

export type ProjectInput = z.infer<typeof ProjectSchema>;

export const MilestoneSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the milestone a name.")
    .max(120, "Keep it under 120 characters."),
  dueDate: optionalDate,
  ownerId: optionalUuid,
});

export type MilestoneInput = z.infer<typeof MilestoneSchema>;

export function projectInputFromForm(formData: FormData) {
  return ProjectSchema.safeParse({
    name: formData.get("name"),
    departmentId: formData.get("departmentId"),
    ownerId: formData.get("ownerId"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    dueDate: formData.get("dueDate"),
    description: formData.get("description") ?? "",
  });
}

export function milestoneInputFromForm(formData: FormData) {
  return MilestoneSchema.safeParse({
    name: formData.get("name"),
    dueDate: formData.get("dueDate"),
    ownerId: formData.get("ownerId"),
  });
}
