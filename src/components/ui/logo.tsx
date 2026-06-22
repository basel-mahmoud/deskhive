import { cn } from "@/lib/utils";

/**
 * DeskHive brand mark — a hexagon frame (adapts to ink colour for light/dark)
 * with an orange up-chevron and an orange hexagon cell. Recreated as SVG so it
 * scales crisply and themes correctly.
 */
export function Logo({
  className,
  withWordmark = true,
  size = 26,
}: {
  className?: string;
  withWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Hexagon frame (with a small gap at the bottom vertex) */}
        <path
          d="M16 2.6 L27.4 9.4 V22.6 L17.6 28.4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink"
        />
        <path
          d="M14.4 28.4 L4.6 22.6 V9.4 L16 2.6"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink"
        />
        {/* Orange up-chevron */}
        <path
          d="M16 8.4 L23 14.4 L20.2 14.4 L16 11 L11.8 14.4 L9 14.4 Z"
          fill="var(--accent)"
        />
        {/* Orange hexagon cell (ring = hex with hole) */}
        <path
          d="M16 15.4 L20.4 17.9 V22.5 L16 25 L11.6 22.5 V17.9 Z"
          stroke="var(--accent)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark && (
        <span className="font-display text-[1.15rem] font-semibold tracking-tight text-ink">
          Desk<span className="text-accent">Hive</span>
        </span>
      )}
    </span>
  );
}
