import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Sparkles, Mail, Clock } from "lucide-react";
import { requireUser, roleAtLeast } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/services/workspaces";
import { getTicketByNumber } from "@/lib/services/tickets";
import { listMembers } from "@/lib/services/members";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { SlaPill } from "@/components/app/sla";
import { ReplyBox } from "@/components/app/reply-box";
import { TicketControls } from "@/components/app/ticket-controls";
import { initials, relativeTime } from "@/lib/utils";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number } = await params;
  const user = await requireUser();
  const ctx = await getWorkspaceForUser(user.id, slug);
  if (!ctx) redirect("/app");

  const n = Number(number);
  if (!Number.isInteger(n)) notFound();
  const data = await getTicketByNumber(user.id, ctx.workspace.id, n);
  if (!data) notFound();

  const { ticket, messages } = data;
  const members = (await listMembers(user.id, ctx.workspace.id)).filter((m) =>
    roleAtLeast(m.role, "agent"),
  );
  const canEdit = roleAtLeast(ctx.role, "agent");

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-6">
        <Link
          href={`/app/${slug}/inbox`}
          className="text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="font-mono text-xs text-muted">#{ticket.number}</span>
        <h1 className="min-w-0 flex-1 truncate font-display text-lg font-semibold">
          {ticket.subject}
        </h1>
        <StatusBadge status={ticket.status} />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Conversation */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {ticket.aiSummary && (
              <div className="rounded-[var(--radius-lg)] border border-accent/25 bg-accent/[0.05] p-4">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-accent">
                  <Sparkles size={14} /> AI triage
                  {ticket.aiCategory && (
                    <span className="rounded-full bg-accent/12 px-2 py-0.5">
                      {ticket.aiCategory}
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-dim">{ticket.aiSummary}</p>
              </div>
            )}

            {messages.map((m) => {
              const agent = m.authorType === "agent";
              const note = m.isInternalNote;
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${agent ? "flex-row-reverse" : ""}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-medium ${
                      agent
                        ? "bg-accent/15 text-accent"
                        : "bg-surface-3 text-ink-dim"
                    }`}
                  >
                    {initials(m.authorName, m.authorEmail ?? ticket.requesterEmail)}
                  </span>
                  <div
                    className={`max-w-[78%] rounded-[var(--radius-lg)] border px-4 py-3 ${
                      note
                        ? "border-warning/30 bg-warning/[0.06]"
                        : agent
                          ? "border-accent/20 bg-accent/[0.06]"
                          : "border-line bg-surface"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-[0.7rem] text-muted">
                      <span className="font-medium text-ink-dim">
                        {agent
                          ? m.authorName || "Agent"
                          : ticket.requesterName || m.authorEmail}
                      </span>
                      {note && (
                        <span className="rounded-full bg-warning/15 px-1.5 text-warning">
                          internal
                        </span>
                      )}
                      <span>· {relativeTime(m.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-ink">
                      {m.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <ReplyBox
            slug={slug}
            ticketId={ticket.id}
            aiDraft={ticket.aiDraftReply}
            canReply={canEdit}
          />
        </div>

        {/* Right rail */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-line bg-surface/30 p-5 lg:block">
          <TicketControls
            slug={slug}
            ticketId={ticket.id}
            version={ticket.version}
            status={ticket.status}
            priority={ticket.priority}
            assigneeId={ticket.assigneeId}
            members={members.map((m) => ({
              userId: m.userId,
              name: m.name,
              email: m.email,
            }))}
            canEdit={canEdit}
          />

          <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <Detail label="Priority">
              <PriorityBadge priority={ticket.priority} />
            </Detail>
            <Detail label="SLA">
              <SlaPill
                slaDueAt={ticket.slaDueAt}
                firstResponseAt={ticket.firstResponseAt}
                status={ticket.status}
              />
            </Detail>
            <Detail label="Requester">
              <span className="flex items-center gap-1.5 text-ink-dim">
                <Mail size={13} /> {ticket.requesterEmail}
              </span>
            </Detail>
            <Detail label="Opened">
              <span className="flex items-center gap-1.5 text-ink-dim">
                <Clock size={13} /> {relativeTime(ticket.createdAt)}
              </span>
            </Detail>
            <Detail label="Source">
              <span className="text-ink-dim capitalize">{ticket.source}</span>
            </Detail>
          </div>
        </aside>
      </div>
    </>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted uppercase">{label}</span>
      {children}
    </div>
  );
}
