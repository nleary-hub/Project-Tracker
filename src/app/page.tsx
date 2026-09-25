import { redirect } from "next/navigation";

import { PREVIEW_WORKSPACE_SLUG } from "@/lib/app-config";

// Sign-in and workspace selection replace this redirect in M1.
export default function Home() {
  redirect(`/w/${PREVIEW_WORKSPACE_SLUG}`);
}
