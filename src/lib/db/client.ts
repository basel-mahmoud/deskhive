/**
 * Neon-backed Drizzle client with row-level-security context helpers.
 *
 * Tenant isolation is defence-in-depth:
 *   1. The data layer always scopes by workspace.
 *   2. Postgres RLS (FORCE) restricts rows to workspaces the current actor
 *      belongs to, read from `current_setting('app.user_id')`.
 *
 * `withUser` runs work inside a transaction that pins the acting Clerk user id,
 * so RLS policies evaluate against a real membership. `withSystem` sets a
 * bypass GUC for legitimately cross-tenant work (webhooks, schedulers).
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "./schema";
import { serverEnv } from "@/lib/env";

// Neon's serverless driver needs a WebSocket implementation under Node.
if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

// Reuse the pool across hot reloads / warm lambdas.
const globalForDb = globalThis as unknown as { _deskhivePool?: Pool };
const pool =
  globalForDb._deskhivePool ??
  new Pool({
    // Prefer the non-bypassing runtime role so RLS is enforced; fall back to
    // the default connection in environments where it isn't provisioned.
    connectionString: serverEnv().APP_DATABASE_URL ?? serverEnv().DATABASE_URL,
  });
if (process.env.NODE_ENV !== "production") globalForDb._deskhivePool = pool;

export const db = drizzle(pool, { schema });

export type Db = NeonDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Run `fn` as the given Clerk user, with RLS enforcing their memberships. */
export async function withUser<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // set_config(..., is_local = true) → scoped to this transaction only.
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    await tx.execute(sql`select set_config('app.bypass_rls', 'off', true)`);
    return fn(tx);
  });
}

/** Run `fn` with RLS bypassed — for system/webhook paths only. */
export async function withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.bypass_rls', 'on', true)`);
    return fn(tx);
  });
}

export { schema };
