import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { withSystem } from "@/lib/db/client";
import { tickets, workspaces } from "@/lib/db/schema";

/** Public, non-sensitive workspace info for the portal. */
export async function getPublicWorkspace(slug: string) {
  return withSystem(async (tx) => {
    const rows = await tx
      .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
      .from(workspaces)
      .where(and(eq(workspaces.slug, slug), isNull(workspaces.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  });
}

/**
 * Look up a ticket's status by number + requester email. Requiring the email to
 * match prevents enumeration of other customers' tickets.
 */
export async function lookupTicketStatus(
  workspaceId: string,
  number: number,
  email: string,
) {
  return withSystem(async (tx) => {
    const rows = await tx
      .select({
        number: tickets.number,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.workspaceId, workspaceId),
          eq(tickets.number, number),
          sql`lower(${tickets.requesterEmail}) = ${email.toLowerCase()}`,
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}
