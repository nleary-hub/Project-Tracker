import { cn } from "@/lib/utils";

/**
 * The product mark: a rounded tile with a four-pane "portfolio" glyph. Drawn
 * inline so it inherits the accent from the theme and stays crisp at any size.
 */
export function BrandMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[28%] bg-linear-to-br from-brand to-[oklch(0.45_0.22_290)] text-white shadow-[inset_0_1px_0_oklch(1_0_0/35%),0_1px_2px_oklch(0_0_0/20%)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none">
        <rect x="4" y="4" width="7" height="7" rx="1.6" fill="currentColor" fillOpacity="0.95" />
        <rect x="13" y="4" width="7" height="7" rx="1.6" fill="currentColor" fillOpacity="0.55" />
        <rect x="4" y="13" width="7" height="7" rx="1.6" fill="currentColor" fillOpacity="0.55" />
        <rect x="13" y="13" width="7" height="7" rx="1.6" fill="currentColor" fillOpacity="0.95" />
      </svg>
    </span>
  );
}

export function Wordmark({ appName, className }: { appName: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[15px] font-semibold tracking-tight text-foreground">{appName}</span>
    </span>
  );
}
