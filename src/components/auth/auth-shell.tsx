import Link from "next/link";

import { APP_NAME } from "@/lib/app-config";

/** Centered single-column frame for sign-in, onboarding and invite pages. */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col bg-surface-muted">
      <div className="bg-navy-900 text-white">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em] uppercase"
          >
            <span
              aria-hidden="true"
              className="inline-block size-3 rotate-45 border border-white/60 bg-brand"
            />
            {APP_NAME}
          </Link>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-md">
          <div className="rounded-sm border border-border bg-surface p-6 md:p-8">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-ink-secondary">{description}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
