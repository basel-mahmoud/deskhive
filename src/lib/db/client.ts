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

export type Db = NeonDatabase<typeof schema>;

// Lazily create the pool/Drizzle instance on first use. Env is validated at
// request time, not import time, so builds (and preview deploys without env)
// never fail collecting page data — only real requests require configuration.
const globalForDb = globalThis as unknown as {
  _deskhivePool?: Pool;
  _deskhiveDb?: Db;
};

function getDb(): Db {
  if (globalForDb._deskhiveDb) return globalForDb._deskhiveDb;
  const pool =
    globalForDb._deskhivePool ??
    new Pool({
      // Prefer the non-bypassing runtime role so RLS is enforced; fall back to
      // the default connection in environments where it isn't provisioned.
      connectionString:
        serverEnv().APP_DATABASE_URL ?? serverEnv().DATABASE_URL,
    });
  globalForDb._deskhivePool = pool;
  globalForDb._deskhiveDb = drizzle(pool, { schema });
  return globalForDb._deskhiveDb;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
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
