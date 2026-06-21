/**
 * Idempotency keys for mutating API calls. A client sends an Idempotency-Key;
 * the first request runs and its response is stored, replays return the stored
 * response. A different body under the same key is a conflict. Combined with
 * retry-with-backoff on the client, mutations become safe to retry.
 */
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { idempotencyKeys } from "@/lib/db/schema";

export const hashRequest = (payload: unknown): string =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex");

export type IdempotentOutcome<T> =
  | { kind: "ok"; replayed: boolean; statusCode: number; body: T }
  | { kind: "conflict" }
  | { kind: "in_progress" };

export async function withIdempotency<T>(
  key: string,
  requestHash: string,
  ttlSeconds: number,
  fn: () => Promise<{ statusCode: number; body: T }>,
  workspaceId?: string,
): Promise<IdempotentOutcome<T>> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const claimed = await db
    .insert(idempotencyKeys)
    .values({ key, requestHash, expiresAt, workspaceId })
    .onConflictDoNothing()
    .returning({ key: idempotencyKeys.key });

  if (claimed.length === 0) {
    const existing = await db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1);
    const row = existing[0];
    if (!row) return { kind: "in_progress" };
    if (row.requestHash !== requestHash) return { kind: "conflict" };
    if (row.response == null || row.statusCode == null)
      return { kind: "in_progress" };
    return {
      kind: "ok",
      replayed: true,
      statusCode: row.statusCode,
      body: row.response as T,
    };
  }

  const result = await fn();
  await db
    .update(idempotencyKeys)
    .set({ statusCode: result.statusCode, response: result.body })
    .where(eq(idempotencyKeys.key, key));

  return { kind: "ok", replayed: false, ...result };
}
