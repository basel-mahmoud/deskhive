/**
 * Toggle a workspace's ai_enabled flag by slug.
 * Usage: npx tsx --env-file=.env.local scripts/set-ai.ts <slug> <true|false>
 */
import { Client } from "pg";

async function main() {
  const slug = process.argv[2];
  const on = (process.argv[3] ?? "true") === "true";
  if (!slug) throw new Error("slug required");
  const c = new Client({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });
  await c.connect();
  const r = await c.query(
    "update workspaces set ai_enabled = $1, updated_at = now() where slug = $2 returning name, ai_enabled",
    [on, slug],
  );
  await c.end();
  console.log(JSON.stringify(r.rows));
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
