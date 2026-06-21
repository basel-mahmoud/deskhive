import { cn } from "@/lib/utils";

/**
 * Lightweight CSS entrance wrapper. Uses the `.rise` keyframe (opacity + lift)
 * with a per-item delay. CSS-driven on purpose: it renders reliably in
 * production and degrades gracefully, unlike JS-gated scroll animations.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("rise", className)}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
