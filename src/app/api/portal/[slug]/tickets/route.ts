import { after, type NextRequest } from "next/server";
import { clientIp, json, tooManyRequests } from "@/lib/http";
import { rateLimit } from "@/lib/services/rate-limit";
import {
  hashRequest,
  withIdempotency,
} from "@/lib/services/idempotency";
import { getPublicWorkspace } from "@/lib/services/portal";
import { createTicketFromPortal } from "@/lib/services/tickets";
import { maybeTriageTicket } from "@/lib/services/triage";
import { portalTicketSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = clientIp(req);

  // Abuse prevention: 5 submissions / minute / IP.
  const rl = await rateLimit("portal_submit", `${slug}:${ip}`, 5, 60);
  if (!rl.allowed) return tooManyRequests(rl.resetSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = portalTicketSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      400,
    );
  }
  // Honeypot tripped — pretend success without doing anything.
  if (parsed.data.company) return json({ ok: true }, 202);

  const ws = await getPublicWorkspace(slug);
  if (!ws) return json({ error: "Workspace not found" }, 404);

  const run = async () => {
    const { id, number } = await createTicketFromPortal(ws.id, parsed.data);
    // Run AI triage after the response (survives serverless teardown on Vercel)
    // and never blocks the customer's submission.
    after(() => maybeTriageTicket(ws.id, id));
    return { statusCode: 201, body: { number } };
  };

  // Optional idempotency for safe client retries.
  const key = req.headers.get("idempotency-key");
  if (key) {
    const requestHash = hashRequest({ slug, ...parsed.data });
    const outcome = await withIdempotency(
      `portal:${slug}:${key}`,
      requestHash,
      86_400,
      run,
      ws.id,
    );
    if (outcome.kind === "conflict")
      return json({ error: "Idempotency key reuse with different body" }, 409);
    if (outcome.kind === "in_progress")
      return json({ error: "Request already in progress" }, 409);
    return json(outcome.body, outcome.statusCode);
  }

  const result = await run();
  return json(result.body, result.statusCode);
}
