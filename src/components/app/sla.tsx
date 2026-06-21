import { cn } from "@/lib/utils";

/** Compact SLA status derived from due time and first-response state. */
export function SlaPill({
  slaDueAt,
  firstResponseAt,
  status,
}: {
  slaDueAt: Date | string | null;
  firstResponseAt: Date | string | null;
  status: string;
}) {
  if (status === "resolved" || status === "closed") {
    return <span className="font-mono text-[0.7rem] text-muted">—</span>;
  }
  if (firstResponseAt) {
    return (
      <span className="font-mono text-[0.7rem] text-success">responded</span>
    );
  }
  if (!slaDueAt) {
    return <span className="font-mono text-[0.7rem] text-muted">—</span>;
  }
  const due = typeof slaDueAt === "string" ? new Date(slaDueAt) : slaDueAt;
  const diffMs = due.getTime() - Date.now();
  const breached = diffMs < 0;
  const mins = Math.round(Math.abs(diffMs) / 60000);
  const label =
    mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  const soon = !breached && diffMs < 60 * 60 * 1000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[0.7rem]",
        breached ? "text-danger" : soon ? "text-warning" : "text-ink-dim",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          breached ? "bg-danger" : soon ? "bg-warning" : "bg-success",
        )}
      />
      {breached ? `${label} over` : `${label} left`}
    </span>
  );
}
