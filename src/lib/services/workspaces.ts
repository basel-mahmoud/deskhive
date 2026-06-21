import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { withSystem, withUser } from "@/lib/db/client";
import { workspaceMembers, workspaces, type Role } from "@/lib/db/schema";
import { newId, slugify } from "@/lib/ids";
import { appendAudit } from "@/lib/services/audit";
import type { SessionUser } from "@/lib/auth";

export async function createWorkspace(user: SessionUser, rawName: string) {
  return withSystem(async (tx) => {
    // Resolve a unique slug.
    const base = slugify(rawName) || "workspace";
    let slug = base;
    for (let i = 2; ; i++) {
      const existing = await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1);
      if (existing.length === 0) break;
      slug = `${base}-${i}`;
    }

    const id = newId("ws");
    await tx.insert(workspaces).values({ id, slug, name: rawName });
    await tx.insert(workspaceMembers).values({
      id: newId("mem"),
      workspaceId: id,
      userId: user.id,
      role: "owner",
    });
    await appendAudit(tx, {
      workspaceId: id,
      actorId: user.id,
      action: "workspace.created",
      targetType: "workspace",
      targetId: id,
      metadata: { name: rawName, slug },
    });
    return { id, slug, name: rawName };
  });
}

export async function getUserWorkspaces(userId: string) {
  return withUser(userId, (tx) =>
    tx
      .select({
        id: workspaces.id,
        slug: workspaces.slug,
        name: workspaces.name,
        plan: workspaces.plan,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          isNull(workspaces.deletedAt),
        ),
      ),
  );
}

export async function getWorkspaceForUser(
  userId: string,
  slug: string,
): Promise<{ workspace: typeof workspaces.$inferSelect; role: Role } | null> {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select({ ws: workspaces, role: workspaceMembers.role })
      .from(workspaces)
      .innerJoin(
        workspaceMembers,
        eq(workspaceMembers.workspaceId, workspaces.id),
      )
      .where(
        and(
          eq(workspaces.slug, slug),
          eq(workspaceMembers.userId, userId),
          isNull(workspaces.deletedAt),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    return { workspace: rows[0].ws, role: rows[0].role };
  });
}

export async function updateWorkspaceSla(
  userId: string,
  workspaceId: string,
  slaMinutes: Record<string, number>,
) {
  return withUser(userId, async (tx) => {
    await tx
      .update(workspaces)
      .set({ slaMinutes, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));
    await appendAudit(tx, {
      workspaceId,
      actorId: userId,
      action: "workspace.sla_updated",
      targetType: "workspace",
      targetId: workspaceId,
      metadata: { slaMinutes },
    });
  });
}
