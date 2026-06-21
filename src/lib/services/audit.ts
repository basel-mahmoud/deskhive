/**
 * Tamper-evident audit log. Each workspace has its own hash chain:
 *   hash_n = sha256(prev_hash || canonical(entry))
 * Appends are serialised per workspace with a transaction-scoped advisory lock,
 * so concurrent writers cannot fork the chain. The audit_logs table has only
 * SELECT/INSERT RLS policies under FORCE, so rows can never be updated/deleted.
 */
import { createHash } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { auditLogs } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/client";

export type AuditEntry = {
  workspaceId: string;
  actorId?: string | null;
  actorType?: "user" | "system" | "customer";
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

function canonical(e: AuditEntry, prevHash: string | null): string {
  return JSON.stringify({
    w: e.workspaceId,
    a: e.actorId ?? null,
    at: e.actorType ?? "user",
    ac: e.action,
    tt: e.targetType ?? null,
    ti: e.targetId ?? null,
    m: e.metadata ?? null,
    p: prevHash,
  });
}

export async function appendAudit(tx: Tx, entry: AuditEntry): Promise<string> {
  // Serialise appends for this workspace within the transaction.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${"audit:" + entry.workspaceId}))`,
  );

  const prev = await tx
    .select({ hash: auditLogs.hash })
    .from(auditLogs)
    .where(eq(auditLogs.workspaceId, entry.workspaceId))
    .orderBy(desc(auditLogs.id))
    .limit(1);
  const prevHash = prev[0]?.hash ?? null;

  const hash = createHash("sha256")
    .update(canonical(entry, prevHash))
    .digest("hex");

  await tx.insert(auditLogs).values({
    workspaceId: entry.workspaceId,
    actorId: entry.actorId ?? null,
    actorType: entry.actorType ?? "user",
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata: entry.metadata,
    prevHash,
    hash,
  });

  return hash;
}

/** Verify a workspace's chain is intact. Used by tests and an admin endpoint. */
export function verifyChain(
  rows: {
    workspaceId: string;
    actorId: string | null;
    actorType: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    metadata: Record<string, unknown> | null;
    prevHash: string | null;
    hash: string;
  }[],
): { ok: boolean; brokenAt?: number } {
  let prevHash: string | null = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const expected: string = createHash("sha256")
      .update(
        canonical(
          {
            workspaceId: r.workspaceId,
            actorId: r.actorId,
            actorType: r.actorType as AuditEntry["actorType"],
            action: r.action,
            targetType: r.targetType ?? undefined,
            targetId: r.targetId ?? undefined,
            metadata: r.metadata ?? undefined,
          },
          prevHash,
        ),
      )
      .digest("hex");
    if (r.prevHash !== prevHash || r.hash !== expected) {
      return { ok: false, brokenAt: i };
    }
    prevHash = r.hash;
  }
  return { ok: true };
}
