import { CalendarCheckIcon, LayersIcon, MailIcon } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "@/components/brand-mark";
import { APP_NAME } from "@/lib/app-config";

/**
 * Two-panel frame for sign-in, onboarding and invite pages: the form on the
 * left, a quiet product panel on the right (hidden below lg).
 */
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
    <main className="grid min-h-svh flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <section className="flex flex-col px-6 py-6 md:px-12">
        <Link href="/" className="w-fit">
          <Wordmark appName={APP_NAME} />
        </Link>
        <div className="flex flex-1 items-center py-12">
          <div className="w-full max-w-sm animate-in duration-500 fade-in slide-in-from-bottom-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Reports go out every other Friday. Nothing is sent until an admin approves it.
        </p>
      </section>

      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden bg-[oklch(0.17_0.03_268)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-24 size-[520px] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.2_264/0.55),transparent)] blur-2xl" />
          <div className="absolute -bottom-40 -left-24 size-[560px] rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.18_300/0.45),transparent)] blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.14_0.03_268/0.6))]" />
          <div className="absolute inset-0 [background-image:linear-gradient(oklch(1_0_0)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0)_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.07]" />
        </div>

        <div className="relative">
          <p className="text-xs font-medium tracking-[0.18em] text-white/60 uppercase">
            Portfolio status, every other Friday
          </p>
          <h2 className="mt-4 max-w-md text-4xl font-semibold tracking-tight text-balance">
            One report your leadership team actually reads.
          </h2>
          <ul className="mt-8 flex flex-col gap-3 text-sm text-white/80">
            <li className="flex items-center gap-3">
              <LayersIcon className="size-4 text-white/60" /> Projects grouped by department, with
              health that calculates itself
            </li>
            <li className="flex items-center gap-3">
              <CalendarCheckIcon className="size-4 text-white/60" /> Next milestone, owner and due
              date on every row
            </li>
            <li className="flex items-center gap-3">
              <MailIcon className="size-4 text-white/60" /> Drafted on schedule, approved by an
              admin, emailed as PDF
            </li>
          </ul>
        </div>

        <ReportPreview />
      </aside>
    </main>
  );
}

/** A stylised, data-free glimpse of the dense report table. */
function ReportPreview() {
  const rows = [
    ["Website refresh", "on-track", 78],
    ["ERP upgrade", "at-risk", 52],
    ["Mobile app v2", "on-track", 64],
    ["Expense tool rollout", "off-track", 31],
    ["Annual audit prep", "on-track", 88],
  ] as const;
  const color = {
    "on-track": "bg-[oklch(0.75_0.16_150)]",
    "at-risk": "bg-[oklch(0.83_0.15_80)]",
    "off-track": "bg-[oklch(0.7_0.19_25)]",
  };
  return (
    <div className="relative mt-10 animate-in duration-700 fade-in slide-in-from-bottom-4">
      <div className="rounded-2xl border border-white/12 bg-white/6 p-4 shadow-[0_30px_80px_-30px_oklch(0_0_0/0.7)] backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-2.5 w-28 rounded-full bg-white/25" />
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-white/25" />
            <span className="size-2 rounded-full bg-white/25" />
            <span className="size-2 rounded-full bg-white/25" />
          </div>
        </div>
        <div className="divide-y divide-white/8 overflow-hidden rounded-lg border border-white/10 bg-[oklch(0.15_0.03_268/0.6)]">
          {rows.map(([name, health, pct], i) => (
            <div
              key={name}
              className="grid grid-cols-[1fr_auto_88px] items-center gap-4 px-3 py-2 text-[12px] text-white/85"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="truncate">{name}</span>
              <span className={`size-2 rounded-full ${color[health]}`} />
              <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <span
                  className={`block h-full rounded-full ${color[health]}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
