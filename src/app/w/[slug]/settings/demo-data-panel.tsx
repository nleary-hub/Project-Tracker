"use client";

import { DatabaseIcon, EraserIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { loadDemoData, wipeDemoData } from "./demo-actions";

export function DemoDataPanel({ slug, demoProjects }: { slug: string; demoProjects: number }) {
  const [loading, startLoad] = useTransition();
  const [wiping, startWipe] = useTransition();
  const loaded = demoProjects > 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {loaded
          ? `${demoProjects} demo ${demoProjects === 1 ? "project is" : "projects are"} loaded. They're marked "Demo" everywhere and are left out of nothing — treat them as real until you wipe them.`
          : "Twelve sample projects across four departments, with milestones that are overdue, due soon and comfortably ahead."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={loaded || loading}
          onClick={() =>
            startLoad(async () => {
              const result = await loadDemoData(slug);
              if (result?.ok) toast.success(result.message);
              else toast.error(result?.error ?? "Couldn't load the demo data.");
            })
          }
        >
          <DatabaseIcon />
          {loading ? "Loading…" : "Load demo data"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="destructive" disabled={!loaded || wiping} />}
          >
            <EraserIcon />
            {wiping ? "Removing…" : "Wipe demo data"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove all demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                Deletes every project and milestone marked as demo, and any demo department that has
                no real projects in it. Your own projects are untouched.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  startWipe(async () => {
                    const result = await wipeDemoData(slug);
                    if (result?.ok) toast.success(result.message);
                    else toast.error(result?.error ?? "Couldn't remove the demo data.");
                  })
                }
              >
                Wipe demo data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
