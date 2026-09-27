import * as z from "zod";

/**
 * A manual project update (docs/PLAN.md D7, D8): what changed, plus an
 * optional free-text next step that reports show beside the next milestone.
 */
export const ProjectUpdateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write an update before posting.")
    .max(4000, "Keep it under 4,000 characters."),
  nextStep: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : (v ?? null)),
    z.string().trim().max(500, "Keep it under 500 characters.").nullable(),
  ),
});

export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;

export function projectUpdateInputFromForm(formData: FormData) {
  return ProjectUpdateSchema.safeParse({
    body: formData.get("body"),
    nextStep: formData.get("nextStep"),
  });
}
