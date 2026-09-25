import { redirect } from "next/navigation";

import { getMyWorkspaces, getUser } from "@/lib/auth/dal";

/** Sends the visitor to sign-in, onboarding, or their workspace. */
export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");

  const workspaces = await getMyWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");
  redirect(`/w/${workspaces[0].slug}`);
}
