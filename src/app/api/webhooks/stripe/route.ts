import type { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { features } from "@/lib/env";
import { handleStripeEvent } from "@/lib/services/billing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!features().billing) return json({ error: "Billing disabled" }, 503);

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing signature" }, 400);

  const rawBody = await req.text();
  try {
    const result = await handleStripeEvent(rawBody, signature);
    return json(result);
  } catch (err) {
    console.error("stripe webhook error", err);
    return json({ error: "Webhook handler failed" }, 400);
  }
}
