"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateTicketAction, type ActionState } from "@/lib/actions/tickets";
import { Button } from "@/components/ui/button";

type Member = { userId: string; name: string | null; email: string };

const sel =
  "w-full rounded-[var(--radius-md)] border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent";

export function TicketControls({
  slug,
  ticketId,
  version,
  status,
  priority,
  assigneeId,
  members,
  canEdit,
}: {
  slug: string;
  ticketId: string;
  version: number;
  status: string;
  priority: string;
  assigneeId: string | null;
  members: Member[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateTicketAction,
    {},
  );
  const [s, setS] = useState(status);
  const [p, setP] = useState(priority);
  const [a, setA] = useState(assigneeId ?? "unassigned");

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const dirty =
    s !== status || p !== priority || a !== (assigneeId ?? "unassigned");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="version" value={version} />

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted uppercase">
          Status
        </label>
        <select
          name="status"
          value={s}
          onChange={(e) => setS(e.target.value)}
          disabled={!canEdit}
          className={sel}
        >
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted uppercase">
          Priority
        </label>
        <select
          name="priority"
          value={p}
          onChange={(e) => setP(e.target.value)}
          disabled={!canEdit}
          className={sel}
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted uppercase">
          Assignee
        </label>
        <select
          name="assigneeId"
          value={a}
          onChange={(e) => setA(e.target.value)}
          disabled={!canEdit}
          className={sel}
        >
          <option value="unassigned">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name || m.email}
            </option>
          ))}
        </select>
      </div>

      {canEdit && dirty && (
        <Button type="submit" size="sm" disabled={pending} className="w-full">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      )}
      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
