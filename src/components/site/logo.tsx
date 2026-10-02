import { cn } from "@/lib/utils";

/**
 * QASADAN logo mark — navy "Q" ring with a navy→cyan gradient tail and
 * pixel squares breaking away from the left side (digital motif).
 * The ring uses `currentColor` so it adapts to light/dark contexts.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("text-navy-800", className)}
      role="img"
      aria-label="QASADAN logo mark"
    >
      <defs>
        <linearGradient id="qtail" gradientUnits="userSpaceOnUse" x1="306" y1="306" x2="452" y2="452">
          <stop offset="0" stopColor="#0B1F3A" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <circle cx="268" cy="250" r="160" fill="none" stroke="currentColor" strokeWidth="74" />
      <line x1="306" y1="306" x2="452" y2="452" stroke="url(#qtail)" strokeWidth="58" strokeLinecap="round" />
      <rect x="58" y="118" width="26" height="26" rx="4" fill="#22D3EE" transform="rotate(-10 71 131)" />
      <rect x="20" y="180" width="34" height="34" rx="5" fill="#06B6D4" transform="rotate(15 37 197)" />
      <rect x="56" y="236" width="20" height="20" rx="3" fill="#0E7490" />
      <rect x="12" y="292" width="40" height="40" rx="6" fill="#155E75" transform="rotate(-18 32 312)" />
      <rect x="48" y="352" width="26" height="26" rx="4" fill="#0891B2" transform="rotate(22 61 365)" />
      <rect x="92" y="80" width="16" height="16" rx="2" fill="#06B6D4" transform="rotate(30 100 88)" />
      <rect x="86" y="400" width="18" height="18" rx="3" fill="#164E63" transform="rotate(-25 95 409)" />
      <rect x="114" y="52" width="12" height="12" rx="2" fill="#22D3EE" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  light = false,
  showTagline = true,
}: {
  className?: string;
  markClassName?: string;
  light?: boolean;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("h-9 w-9 shrink-0", light && "text-white", markClassName)} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-heading text-xl font-bold tracking-tight text-navy-800",
            light && "text-white"
          )}
        >
          QASADAN
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 text-[9px] font-medium tracking-[0.24em] text-navy-500",
              light && "text-cyan-400"
            )}
          >
            WEB DEVELOPMENT AGENCY
          </span>
        )}
      </span>
    </span>
  );
}
