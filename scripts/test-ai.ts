/**
 * E2E AI triage check against production: submit a portal ticket, then poll the
 * DB until Gemini triage populates the AI fields.
 * Run: npx tsx --env-file=.env.local scripts/test-ai.ts
 */
import { Client } from "pg";

const BASE = "https://deskhive-ten.vercel.app";
const SLUG = "northwind-support";

async function main() {
  const res = await fetch(`${BASE}/api/portal/${SLUG}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: "Charged twice for my subscription this month",
      body: "I was billed $24 twice on the same day and my card is now overdrawn. This is urgent, please refund the duplicate charge immediately.",
      requesterEmail: "angry.customer@example.com",
      requesterName: "Jordan Lee",
    }),
  });
  const data = await res.json();
  console.log("submit:", res.status, JSON.stringify(data));
  if (!res.ok) process.exit(1);
  const number = data.number;

  const c = new Client({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });
  await c.connect();
  for (let i = 0; i < 15; i++) {
    const r = await c.query(
      `select ai_summary, ai_category, ai_priority, left(ai_draft_reply, 90) as draft
       from tickets t join workspaces w on w.id = t.workspace_id
       where w.slug = $1 and t.number = $2`,
      [SLUG, number],
    );
    const row = r.rows[0];
    if (row?.ai_summary) {
      console.log("\n✅ AI triage populated:");
      console.log(JSON.stringify(row, null, 2));
      await c.end();
      process.exit(0);
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  await c.end();
  console.log("\n❌ AI fields still empty after polling");
  process.exit(1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
