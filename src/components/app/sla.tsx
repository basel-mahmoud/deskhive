import { cn } from "@/lib/utils";

type SlaView =
  | { kind: "none" }
  | { kind: "responded" }
  | { kind: "timer"; label: string; breached: boolean; soon: boolean };

/** Pure-ish helper (reads the clock once) kept out of the component body. */
function computeSla(
  slaDueAt: Date | string | null,
  firstResponseAt: Date | string | null,
  status: string,
): SlaView {
  if (status === "resolved" || status === "closed") return { kind: "none" };
  if (firstResponseAt) return { kind: "responded" };
  if (!slaDueAt) return { kind: "none" };

  const due = typeof slaDueAt === "string" ? new Date(slaDueAt) : slaDueAt;
  const diffMs = due.getTime() - Date.now();
  const breached = diffMs < 0;
  const mins = Math.round(Math.abs(diffMs) / 60000);
  const label =
    mins < 60
      ? `${mins}m`
      : mins < 1440
        ? `${Math.round(mins / 60)}h`
        : `${Math.round(mins / 1440)}d`;
  const soon = !breached && diffMs < 60 * 60 * 1000;
  return { kind: "timer", label, breached, soon };
}

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
  const view = computeSla(slaDueAt, firstResponseAt, status);

  if (view.kind === "none") {
    return <span className="font-mono text-[0.7rem] text-muted">—</span>;
  }
  if (view.kind === "responded") {
    return (
      <span className="font-mono text-[0.7rem] text-success">responded</span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[0.7rem]",
        view.breached
          ? "text-danger"
          : view.soon
            ? "text-warning"
            : "text-ink-dim",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          view.breached ? "bg-danger" : view.soon ? "bg-warning" : "bg-success",
        )}
      />
      {view.breached ? `${view.label} over` : `${view.label} left`}
    </span>
  );
}
