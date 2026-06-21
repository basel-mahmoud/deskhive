import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  open: "bg-info/12 text-info border-info/25",
  pending: "bg-warning/12 text-warning border-warning/25",
  resolved: "bg-success/12 text-success border-success/25",
  closed: "bg-surface-3 text-muted border-line-strong",
};

const priorityStyles: Record<string, string> = {
  low: "bg-surface-3 text-muted border-line-strong",
  normal: "bg-info/12 text-info border-info/25",
  high: "bg-warning/14 text-warning border-warning/30",
  urgent: "bg-danger/15 text-danger border-danger/30",
};

const roleStyles: Record<string, string> = {
  owner: "bg-accent/14 text-accent border-accent/30",
  agent: "bg-info/12 text-info border-info/25",
  viewer: "bg-surface-3 text-muted border-line-strong",
};

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium tracking-wide",
        tone === "accent"
          ? "border-accent/30 bg-accent/12 text-accent"
          : "border-line-strong bg-surface-2 text-ink-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Pill({ value, map }: { value: string; map: Record<string, string> }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium capitalize",
        map[value] ?? "bg-surface-3 text-muted border-line-strong",
      )}
    >
      {value}
    </span>
  );
}

export const StatusBadge = ({ status }: { status: string }) => (
  <Pill value={status} map={statusStyles} />
);
export const PriorityBadge = ({ priority }: { priority: string }) => (
  <Pill value={priority} map={priorityStyles} />
);
export const RoleBadge = ({ role }: { role: string }) => (
  <Pill value={role} map={roleStyles} />
);
