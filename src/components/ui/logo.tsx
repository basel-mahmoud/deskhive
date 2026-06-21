import { cn } from "@/lib/utils";

/** DeskHive mark — a hive cell with an active signal node. */
export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M16 2.5 27.5 9v14L16 29.5 4.5 23V9L16 2.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          className="text-ink"
        />
        <path
          d="M16 9.5 22 13v6l-6 3.5-6-3.5v-6l6-3.5Z"
          fill="var(--accent)"
          fillOpacity="0.16"
          stroke="var(--accent)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="2.4" fill="var(--accent)" />
      </svg>
      {withWordmark && (
        <span className="font-display text-[1.15rem] font-semibold tracking-tight text-ink">
          Desk<span className="text-accent">Hive</span>
        </span>
      )}
    </span>
  );
}
