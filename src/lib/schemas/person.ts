import * as z from "zod";

/** Someone in the workspace directory who may never sign in (docs/PLAN.md D31). */
export const PersonSchema = z.object({
  name: z.string().trim().min(1, "Give them a name.").max(120, "Keep it under 120 characters."),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z
      .email("That doesn't look like an email address.")
      .max(254, "Keep it under 254 characters.")
      .nullable()
      .default(null),
  ),
});

export type PersonInput = z.infer<typeof PersonSchema>;

export function personInputFromForm(formData: FormData) {
  return PersonSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
  });
}
