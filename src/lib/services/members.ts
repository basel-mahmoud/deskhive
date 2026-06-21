import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { withSystem, withUser, type Tx } from "@/lib/db/client";
import {
  invitations,
  users,
  workspaceMembers,
  workspaces,
  type Role,
} from "@/lib/db/schema";
import { newId, newToken } from "@/lib/ids";
import { appendAudit } from "@/lib/services/audit";
import { requireRole, type SessionUser } from "@/lib/auth";

const INVITE_TTL_DAYS = 7;

export async function listMembers(userId: string, workspaceId: string) {
  return withUser(userId, (tx) =>
    tx
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        email: users.email,
        name: users.name,
        imageUrl: users.imageUrl,
        joinedAt: workspaceMembers.createdAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(workspaceMembers.createdAt),
  );
}

export async function listInvites(userId: string, workspaceId: string) {
  return withUser(userId, (tx) =>
    tx
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceId, workspaceId),
          eq(invitations.status, "pending"),
        ),
      ),
  );
}

async function seatUsage(tx: Tx, workspaceId: string) {
  const m = await tx
    .select({ c: sql<number>`count(*)::int` })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  const i = await tx
    .select({ c: sql<number>`count(*)::int` })
    .from(invitations)
    .where(
      and(
        eq(invitations.workspaceId, workspaceId),
        eq(invitations.status, "pending"),
      ),
    );
  return (m[0]?.c ?? 0) + (i[0]?.c ?? 0);
}

export type InviteResult =
  | { ok: true; token: string }
  | { ok: false; reason: "seat_limit" | "already_member" };

export async function inviteMember(
  user: SessionUser,
  workspaceId: string,
  email: string,
  role: Role,
): Promise<InviteResult> {
  await requireRole(user.id, workspaceId, "owner");
  return withUser(user.id, async (tx) => {
    const ws = await tx
      .select({ plan: workspaces.plan, seatLimit: workspaces.seatLimit })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    const plan = ws[0]?.plan ?? "free";
    const seatLimit = ws[0]?.seatLimit ?? 3;

    const already = await tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(users.email, email),
        ),
      )
      .limit(1);
    if (already.length > 0) return { ok: false as const, reason: "already_member" as const };

    if (plan === "free") {
      const used = await seatUsage(tx, workspaceId);
      if (used >= seatLimit)
        return { ok: false as const, reason: "seat_limit" as const };
    }

    const token = newToken();
    await tx.insert(invitations).values({
      id: newId("inv"),
      workspaceId,
      email,
      role,
      token,
      invitedBy: user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86400_000),
    });
    await appendAudit(tx, {
      workspaceId,
      actorId: user.id,
      action: "member.invited",
      targetType: "invitation",
      metadata: { email, role },
    });
    return { ok: true as const, token };
  });
}

export type AcceptResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "invalid" | "expired" | "email_mismatch" };

export async function acceptInvite(
  user: SessionUser,
  token: string,
): Promise<AcceptResult> {
  // Invitee is not yet a member, so read/write under system context.
  return withSystem(async (tx) => {
    const rows = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);
    const inv = rows[0];
    if (!inv || inv.status !== "pending")
      return { ok: false as const, reason: "invalid" as const };
    if (inv.expiresAt.getTime() < Date.now())
      return { ok: false as const, reason: "expired" as const };
    if (inv.email.toLowerCase() !== user.email.toLowerCase())
      return { ok: false as const, reason: "email_mismatch" as const };

    await tx
      .insert(workspaceMembers)
      .values({
        id: newId("mem"),
        workspaceId: inv.workspaceId,
        userId: user.id,
        role: inv.role,
      })
      .onConflictDoNothing();
    await tx
      .update(invitations)
      .set({ status: "accepted" })
      .where(eq(invitations.id, inv.id));
    await appendAudit(tx, {
      workspaceId: inv.workspaceId,
      actorId: user.id,
      action: "member.joined",
      targetType: "member",
      targetId: user.id,
      metadata: { role: inv.role },
    });
    const ws = await tx
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, inv.workspaceId))
      .limit(1);
    return { ok: true as const, slug: ws[0]?.slug ?? "" };
  });
}

async function ownerCount(tx: Tx, workspaceId: string): Promise<number> {
  const r = await tx
    .select({ c: sql<number>`count(*)::int` })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, "owner"),
      ),
    );
  return r[0]?.c ?? 0;
}

export async function changeRole(
  user: SessionUser,
  workspaceId: string,
  memberId: string,
  role: Role,
): Promise<{ ok: boolean; reason?: string }> {
  await requireRole(user.id, workspaceId, "owner");
  return withUser(user.id, async (tx) => {
    const target = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (target.length === 0) return { ok: false, reason: "not_found" };
    // Don't allow removing the last owner.
    if (target[0].role === "owner" && role !== "owner") {
      if ((await ownerCount(tx, workspaceId)) <= 1)
        return { ok: false, reason: "last_owner" };
    }
    await tx
      .update(workspaceMembers)
      .set({ role })
      .where(eq(workspaceMembers.id, memberId));
    await appendAudit(tx, {
      workspaceId,
      actorId: user.id,
      action: "member.role_changed",
      targetType: "member",
      targetId: target[0].userId,
      metadata: { role },
    });
    return { ok: true };
  });
}

export async function removeMember(
  user: SessionUser,
  workspaceId: string,
  memberId: string,
): Promise<{ ok: boolean; reason?: string }> {
  await requireRole(user.id, workspaceId, "owner");
  return withUser(user.id, async (tx) => {
    const target = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (target.length === 0) return { ok: false, reason: "not_found" };
    if (target[0].role === "owner" && (await ownerCount(tx, workspaceId)) <= 1)
      return { ok: false, reason: "last_owner" };
    await tx
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.id, memberId));
    await appendAudit(tx, {
      workspaceId,
      actorId: user.id,
      action: "member.removed",
      targetType: "member",
      targetId: target[0].userId,
    });
    return { ok: true };
  });
}

export async function revokeInvite(
  user: SessionUser,
  workspaceId: string,
  inviteId: string,
) {
  await requireRole(user.id, workspaceId, "owner");
  return withUser(user.id, async (tx) => {
    await tx
      .update(invitations)
      .set({ status: "revoked" })
      .where(
        and(
          eq(invitations.id, inviteId),
          eq(invitations.workspaceId, workspaceId),
          ne(invitations.status, "accepted"),
        ),
      );
    await appendAudit(tx, {
      workspaceId,
      actorId: user.id,
      action: "member.invite_revoked",
      targetType: "invitation",
      targetId: inviteId,
    });
  });
}
