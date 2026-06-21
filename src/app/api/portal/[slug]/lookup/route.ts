import type { NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, json, tooManyRequests } from "@/lib/http";
import { rateLimit } from "@/lib/services/rate-limit";
import { getPublicWorkspace, lookupTicketStatus } from "@/lib/services/portal";
import { emailSchema } from "@/lib/validation";

export const runtime = "nodejs";

const schema = z.object({
  number: z.coerce.number().int().positive(),
  email: emailSchema,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = clientIp(req);

  const rl = await rateLimit("portal_lookup", `${slug}:${ip}`, 10, 60);
  if (!rl.allowed) return tooManyRequests(rl.resetSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid input" }, 400);

  const ws = await getPublicWorkspace(slug);
  if (!ws) return json({ error: "Workspace not found" }, 404);

  const ticket = await lookupTicketStatus(
    ws.id,
    parsed.data.number,
    parsed.data.email,
  );
  // Generic 404 so callers can't probe which tickets exist.
  if (!ticket) return json({ error: "No matching ticket found" }, 404);

  return json({ ticket });
}
