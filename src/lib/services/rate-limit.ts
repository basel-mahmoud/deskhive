/**
 * Database-backed fixed-window rate limiter. Atomic upsert increments a counter
 * per (scope, identifier, window); works across serverless instances since the
 * source of truth is Postgres. Returns whether the request is allowed plus the
 * number of seconds until the window resets.
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

export async function rateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowId = Math.floor(now / (windowSeconds * 1000));
  const bucket = `${scope}:${identifier}:${windowId}`;
  const expiresAt = new Date((windowId + 1) * windowSeconds * 1000);

  // Atomic upsert: insert with count=1, or increment existing.
  const rows = await db
    .insert(rateLimits)
    .values({ bucket, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimits.bucket,
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  const count = rows[0]?.count ?? 1;
  const resetSeconds = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - now) / 1000),
  );
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetSeconds,
  };
}

/** Opportunistic cleanup of expired buckets (call rarely). */
export async function pruneRateLimits(): Promise<void> {
  await db.delete(rateLimits).where(sql`${rateLimits.expiresAt} < now()`);
}
