import * as z from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks";

import { UNASSIGNED } from "./project";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date.")
  .refine((s) => !Number.isNaN(Date.parse(s)), "That isn't a real date.");
const optionalDate = z.preprocess((v) => (v === "" || v == null ? null : v), isoDate.nullable());
const optionalUuid = z.preprocess(
  (v) => (v === "" || v === UNASSIGNED || v == null ? null : v),
  z.uuid().nullable(),
);

export const TaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the task a title.")
    .max(200, "Keep it under 200 characters."),
  description: z.string().trim().max(4000, "Keep it under 4,000 characters.").default(""),
  status: z.enum(TASK_STATUSES).default("todo"),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  assigneeId: optionalUuid,
  milestoneId: optionalUuid,
  dueDate: optionalDate,
});

export type TaskInput = z.infer<typeof TaskSchema>;

export function taskInputFromForm(formData: FormData) {
  return TaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    status: formData.get("status") ?? "todo",
    priority: formData.get("priority") ?? "medium",
    assigneeId: formData.get("assigneeId"),
    milestoneId: formData.get("milestoneId"),
    dueDate: formData.get("dueDate"),
  });
}
