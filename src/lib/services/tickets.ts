import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { withSystem, withUser, type Tx } from "@/lib/db/client";
import {
  ticketMessages,
  tickets,
  users,
  workspaces,
  type Role,
} from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { appendAudit } from "@/lib/services/audit";
import { requireRole, type SessionUser } from "@/lib/auth";
import type {
  CreateTicketInput,
  PortalTicketInput,
} from "@/lib/validation";

const DEFAULT_SLA: Record<string, number> = {
  low: 2880,
  normal: 1440,
  high: 480,
  urgent: 120,
};

function slaDue(from: Date, priority: string, sla: Record<string, number>) {
  const minutes = sla?.[priority] ?? DEFAULT_SLA[priority] ?? 1440;
  return new Date(from.getTime() + minutes * 60_000);
}

async function nextNumber(tx: Tx, workspaceId: string): Promise<number> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${"ticketnum:" + workspaceId}))`,
  );
  const rows = await tx
    .select({ max: sql<number>`coalesce(max(${tickets.number}), 0)` })
    .from(tickets)
    .where(eq(tickets.workspaceId, workspaceId));
  return (rows[0]?.max ?? 0) + 1;
}

export type TicketListItem = {
  id: string;
  number: number;
  subject: string;
  status: string;
  priority: string;
  requesterEmail: string;
  requesterName: string | null;
  slaDueAt: Date | null;
  firstResponseAt: Date | null;
  assigneeName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listTickets(
  userId: string,
  workspaceId: string,
  filters: { status?: string; priority?: string; q?: string } = {},
): Promise<TicketListItem[]> {
  return withUser(userId, (tx) => {
    const conds = [eq(tickets.workspaceId, workspaceId)];
    if (filters.status) conds.push(eq(tickets.status, filters.status as never));
    if (filters.priority)
      conds.push(eq(tickets.priority, filters.priority as never));
    if (filters.q) {
      const like = `%${filters.q}%`;
      conds.push(
        or(
          ilike(tickets.subject, like),
          ilike(tickets.requesterEmail, like),
        )!,
      );
    }
    return tx
      .select({
        id: tickets.id,
        number: tickets.number,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        requesterEmail: tickets.requesterEmail,
        requesterName: tickets.requesterName,
        slaDueAt: tickets.slaDueAt,
        firstResponseAt: tickets.firstResponseAt,
        assigneeName: users.name,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .leftJoin(users, eq(users.id, tickets.assigneeId))
      .where(and(...conds))
      .orderBy(desc(tickets.updatedAt))
      .limit(200);
  });
}

export async function getTicketByNumber(
  userId: string,
  workspaceId: string,
  number: number,
) {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select({ ticket: tickets, assigneeName: users.name })
      .from(tickets)
      .leftJoin(users, eq(users.id, tickets.assigneeId))
      .where(
        and(eq(tickets.workspaceId, workspaceId), eq(tickets.number, number)),
      )
      .limit(1);
    if (rows.length === 0) return null;
    const ticket = rows[0].ticket;
    const messages = await tx
      .select({
        id: ticketMessages.id,
        authorType: ticketMessages.authorType,
        authorEmail: ticketMessages.authorEmail,
        authorName: users.name,
        body: ticketMessages.body,
        isInternalNote: ticketMessages.isInternalNote,
        createdAt: ticketMessages.createdAt,
      })
      .from(ticketMessages)
      .leftJoin(users, eq(users.id, ticketMessages.authorUserId))
      .where(eq(ticketMessages.ticketId, ticket.id))
      .orderBy(ticketMessages.createdAt);
    return { ticket, assigneeName: rows[0].assigneeName, messages };
  });
}

/** Agent creates a ticket on a customer's behalf. */
export async function createTicketByAgent(
  user: SessionUser,
  workspaceId: string,
  input: CreateTicketInput,
) {
  await requireRole(user.id, workspaceId, "agent");
  return withUser(user.id, async (tx) => {
    const wsRows = await tx
      .select({ sla: workspaces.slaMinutes })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    const sla = wsRows[0]?.sla ?? DEFAULT_SLA;
    const number = await nextNumber(tx, workspaceId);
    const id = newId("tkt");
    const now = new Date();
    await tx.insert(tickets).values({
      id,
      workspaceId,
      number,
      subject: input.subject,
      priority: input.priority,
      requesterEmail: input.requesterEmail,
      requesterName: input.requesterName || null,
      source: "agent",
      slaDueAt: slaDue(now, input.priority, sla),
    });
    await tx.insert(ticketMessages).values({
      id: newId("msg"),
      workspaceId,
      ticketId: id,
      authorType: "customer",
      authorEmail: input.requesterEmail,
      body: input.body,
    });
    await appendAudit(tx, {
      workspaceId,
      actorId: user.id,
      action: "ticket.created",
      targetType: "ticket",
      targetId: id,
      metadata: { number, source: "agent", priority: input.priority },
    });
    return { id, number };
  });
}

/** Public portal submission (no authenticated user). */
export async function createTicketFromPortal(
  workspaceId: string,
  input: PortalTicketInput,
) {
  return withSystem(async (tx) => {
    const wsRows = await tx
      .select({ sla: workspaces.slaMinutes })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    const sla = wsRows[0]?.sla ?? DEFAULT_SLA;
    const number = await nextNumber(tx, workspaceId);
    const id = newId("tkt");
    const now = new Date();
    await tx.insert(tickets).values({
      id,
      workspaceId,
      number,
      subject: input.subject,
      priority: "normal",
      requesterEmail: input.requesterEmail,
      requesterName: input.requesterName || null,
      source: "portal",
      slaDueAt: slaDue(now, "normal", sla),
    });
    await tx.insert(ticketMessages).values({
      id: newId("msg"),
      workspaceId,
      ticketId: id,
      authorType: "customer",
      authorEmail: input.requesterEmail,
      body: input.body,
    });
    await appendAudit(tx, {
      workspaceId,
      actorType: "customer",
      actorId: input.requesterEmail,
      action: "ticket.created",
      targetType: "ticket",
      targetId: id,
      metadata: { number, source: "portal" },
    });
    return { id, number };
  });
}

/** Agent reply or internal note. */
export async function addMessage(
  user: SessionUser,
  workspaceId: string,
  ticketId: string,
  body: string,
  isInternalNote: boolean,
) {
  await requireRole(user.id, workspaceId, "agent");
  return withUser(user.id, async (tx) => {
    await tx.insert(ticketMessages).values({
      id: newId("msg"),
      workspaceId,
      ticketId,
      authorType: "agent",
      authorUserId: user.id,
      body,
      isInternalNote,
    });
    // First public response stops the SLA clock.
    if (!isInternalNote) {
      await tx
        .update(tickets)
        .set({
          firstResponseAt: sql`coalesce(${tickets.firstResponseAt}, now())`,
          status: sql`case when ${tickets.status} = 'open' then 'pending' else ${tickets.status} end`,
          updatedAt: new Date(),
          version: sql`${tickets.version} + 1`,
        })
        .where(eq(tickets.id, ticketId));
    }
    await appendAudit(tx, {
      workspaceId,
      actorId: user.id,
      action: isInternalNote ? "ticket.note_added" : "ticket.replied",
      targetType: "ticket",
      targetId: ticketId,
    });
  });
}

/** Update status / priority / assignee with optimistic concurrency. */
export async function updateTicket(
  user: SessionUser,
  workspaceId: string,
  ticketId: string,
  patch: {
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    version: number;
  },
): Promise<{ ok: true } | { ok: false; reason: "conflict" }> {
  await requireRole(user.id, workspaceId, "agent");
  return withUser(user.id, async (tx) => {
    const current = await tx
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);
    const t = current[0];
    if (!t) return { ok: false as const, reason: "conflict" as const };

    const set: Record<string, unknown> = {
      updatedAt: new Date(),
      version: t.version + 1,
    };
    if (patch.status && patch.status !== t.status) {
      set.status = patch.status;
      if (patch.status === "resolved" || patch.status === "closed") {
        set.resolvedAt = sql`coalesce(${tickets.resolvedAt}, now())`;
      }
    }
    if (patch.priority && patch.priority !== t.priority) {
      set.priority = patch.priority;
      if (!t.firstResponseAt) {
        const wsRows = await tx
          .select({ sla: workspaces.slaMinutes })
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1);
        set.slaDueAt = slaDue(
          t.createdAt,
          patch.priority,
          wsRows[0]?.sla ?? DEFAULT_SLA,
        );
      }
    }
    if (patch.assigneeId !== undefined) set.assigneeId = patch.assigneeId;

    const updated = await tx
      .update(tickets)
      .set(set)
      .where(and(eq(tickets.id, ticketId), eq(tickets.version, patch.version)))
      .returning({ id: tickets.id });

    if (updated.length === 0) return { ok: false as const, reason: "conflict" as const };

    await appendAudit(tx, {
      workspaceId,
      actorId: user.id,
      action: "ticket.updated",
      targetType: "ticket",
      targetId: ticketId,
      metadata: {
        status: patch.status,
        priority: patch.priority,
        assigneeId: patch.assigneeId,
      },
    });
    return { ok: true as const };
  });
}

export async function ticketCounts(userId: string, workspaceId: string) {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select({ status: tickets.status, count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.workspaceId, workspaceId))
      .groupBy(tickets.status);
    const map: Record<string, number> = {
      open: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
    };
    for (const r of rows) map[r.status] = r.count;
    return map;
  });
}

export type { Role };
