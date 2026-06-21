/**
 * One-off RLS isolation smoke test. Creates two tenants and asserts that a
 * user scoped via withUser() can only see their own workspace's tickets.
 * Run: npx tsx scripts/verify-rls.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { withSystem, withUser } from "../src/lib/db/client";
import {
  tickets,
  users,
  workspaces,
  workspaceMembers,
} from "../src/lib/db/schema";

const rid = () => "test_" + Math.random().toString(36).slice(2, 10);

async function main() {
  const u1 = rid(),
    u2 = rid(),
    w1 = rid(),
    w2 = rid();

  await withSystem(async (tx) => {
    await tx.insert(users).values([
      { id: u1, email: `${u1}@t.dev`, name: "U1" },
      { id: u2, email: `${u2}@t.dev`, name: "U2" },
    ]);
    await tx.insert(workspaces).values([
      { id: w1, slug: w1, name: "W1" },
      { id: w2, slug: w2, name: "W2" },
    ]);
    await tx.insert(workspaceMembers).values([
      { id: rid(), workspaceId: w1, userId: u1, role: "owner" },
      { id: rid(), workspaceId: w2, userId: u2, role: "owner" },
    ]);
    await tx.insert(tickets).values([
      { id: rid(), workspaceId: w1, number: 1, subject: "W1 ticket", requesterEmail: "a@a.dev" },
      { id: rid(), workspaceId: w2, number: 1, subject: "W2 ticket", requesterEmail: "b@b.dev" },
    ]);
  });

  const u1Sees = await withUser(u1, (tx) => tx.select().from(tickets));
  const u2Sees = await withUser(u2, (tx) => tx.select().from(tickets));

  const ok1 = u1Sees.length === 1 && u1Sees[0].workspaceId === w1;
  const ok2 = u2Sees.length === 1 && u2Sees[0].workspaceId === w2;

  // Cross-tenant write must be blocked by the WITH CHECK policy.
  let writeBlocked = false;
  try {
    await withUser(u1, (tx) =>
      tx.insert(tickets).values({
        id: rid(),
        workspaceId: w2, // not u1's workspace
        number: 999,
        subject: "should fail",
        requesterEmail: "x@x.dev",
      }),
    );
  } catch {
    writeBlocked = true;
  }

  console.log("u1 sees only W1:", ok1, `(${u1Sees.length} rows)`);
  console.log("u2 sees only W2:", ok2, `(${u2Sees.length} rows)`);
  console.log("cross-tenant write blocked:", writeBlocked);

  await withSystem(async (tx) => {
    await tx.delete(workspaces).where(eq(workspaces.id, w1));
    await tx.delete(workspaces).where(eq(workspaces.id, w2));
    await tx.delete(users).where(eq(users.id, u1));
    await tx.delete(users).where(eq(users.id, u2));
  });

  const pass = ok1 && ok2 && writeBlocked;
  console.log(pass ? "\n✅ RLS isolation verified" : "\n❌ RLS check FAILED");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
