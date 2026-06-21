import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, Inbox as InboxIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/services/workspaces";
import { listTickets, ticketCounts } from "@/lib/services/tickets";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SlaPill } from "@/components/app/sla";
import { initials, relativeTime } from "@/lib/utils";

const STATUSES = ["open", "pending", "resolved", "closed"] as const;

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; priority?: string; q?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const ctx = await getWorkspaceForUser(user.id, slug);
  if (!ctx) redirect("/app");

  const [items, counts] = await Promise.all([
    listTickets(user.id, ctx.workspace.id, {
      status: sp.status,
      priority: sp.priority,
      q: sp.q,
    }),
    ticketCounts(user.id, ctx.workspace.id),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const tab = (label: string, value?: string, count?: number) => {
    const active = (sp.status ?? "") === (value ?? "");
    const qs = new URLSearchParams();
    if (value) qs.set("status", value);
    if (sp.q) qs.set("q", sp.q);
    return (
      <Link
        key={label}
        href={`/app/${slug}/inbox${qs.toString() ? `?${qs}` : ""}`}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
          active
            ? "bg-surface-2 font-medium text-ink"
            : "text-ink-dim hover:bg-surface-2 hover:text-ink"
        }`}
      >
        {label}
        {count !== undefined && (
          <span className="font-mono text-[0.7rem] text-muted">{count}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-semibold">Inbox</h1>
          <span className="font-mono text-xs text-muted">
            {total} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <form action={`/app/${slug}/inbox`} className="relative hidden sm:block">
            <Search
              size={15}
              className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
            />
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search tickets…"
              className="h-9 w-56 rounded-[var(--radius-md)] border border-line bg-surface-2 pr-3 pl-8 text-sm outline-none focus:border-accent"
            />
          </form>
          <ButtonLink href={`/app/${slug}/tickets/new`} size="sm">
            <Plus size={15} /> New ticket
          </ButtonLink>
        </div>
      </header>

      <div className="flex items-center gap-1 border-b border-line px-5 py-2">
        {tab("All", undefined, total)}
        {STATUSES.map((s) => tab(s[0].toUpperCase() + s.slice(1), s, counts[s]))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <EmptyState slug={slug} />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/app/${slug}/tickets/${t.number}`}
                  className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <span className="w-12 shrink-0 font-mono text-xs text-muted">
                    #{t.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">
                      {t.subject}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {t.requesterName
                        ? `${t.requesterName} · ${t.requesterEmail}`
                        : t.requesterEmail}
                    </div>
                  </div>
                  <div className="hidden w-24 shrink-0 md:block">
                    <SlaPill
                      slaDueAt={t.slaDueAt}
                      firstResponseAt={t.firstResponseAt}
                      status={t.status}
                    />
                  </div>
                  <div className="hidden w-20 shrink-0 lg:block">
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <div className="w-20 shrink-0">
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="hidden w-9 shrink-0 sm:block">
                    {t.assigneeName ? (
                      <span
                        title={t.assigneeName}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[0.65rem] font-medium text-ink-dim"
                      >
                        {initials(t.assigneeName)}
                      </span>
                    ) : (
                      <span className="block h-7 w-7 rounded-full border border-dashed border-line-strong" />
                    )}
                  </div>
                  <span className="hidden w-16 shrink-0 text-right font-mono text-[0.7rem] text-muted xl:block">
                    {relativeTime(t.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function EmptyState({ slug }: { slug: string }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="hive-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-accent">
          <InboxIcon size={24} />
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold">
          A calm, empty queue
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          No tickets yet. Share your customer portal or create one manually to
          see triage, SLA tracking and assignment in action.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <ButtonLink href={`/app/${slug}/tickets/new`} size="sm">
            <Plus size={15} /> New ticket
          </ButtonLink>
          <ButtonLink
            href={`/p/${slug}`}
            target="_blank"
            variant="outline"
            size="sm"
          >
            Open portal
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
