/**
 * Server-side auth + RBAC. Identity comes from Clerk; authorization (workspace
 * membership + role) comes from our own database, checked under RLS.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db, withUser } from "@/lib/db/client";
import { users, workspaceMembers, type Role } from "@/lib/db/schema";

export class AuthzError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthzError";
  }
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
};

/**
 * Resolve the current Clerk user and lazily upsert a local mirror row.
 * Memoised per request via React cache().
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;
  const cu = await currentUser();
  if (!cu) return null;

  const email =
    cu.primaryEmailAddress?.emailAddress ??
    cu.emailAddresses[0]?.emailAddress ??
    "";
  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(" ") || cu.username || null;
  const imageUrl = cu.imageUrl ?? null;

  await db
    .insert(users)
    .values({ id: userId, email, name, imageUrl })
    .onConflictDoUpdate({
      target: users.id,
      set: { email, name, imageUrl, updatedAt: new Date() },
    });

  return { id: userId, email, name, imageUrl };
});

/** Require an authenticated user or redirect to sign-in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

const RANK: Record<Role, number> = { viewer: 0, agent: 1, owner: 2 };
export const roleAtLeast = (role: Role, min: Role) => RANK[role] >= RANK[min];

/** Membership row for (user, workspace) or null. Checked under RLS. */
export const getMembership = cache(
  async (userId: string, workspaceId: string) => {
    const rows = await withUser(userId, (tx) =>
      tx
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.workspaceId, workspaceId),
          ),
        )
        .limit(1),
    );
    return rows[0] ?? null;
  },
);

/** Ensure the user belongs to the workspace with at least `min` role. */
export async function requireRole(
  userId: string,
  workspaceId: string,
  min: Role = "viewer",
): Promise<Role> {
  const m = await getMembership(userId, workspaceId);
  if (!m) throw new AuthzError("Not a member of this workspace");
  if (!roleAtLeast(m.role, min)) {
    throw new AuthzError(`Requires ${min} role or higher`);
  }
  return m.role;
}
