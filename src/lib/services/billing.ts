import "server-only";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { withSystem, withUser } from "@/lib/db/client";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { serverEnv, features } from "@/lib/env";
import { requireRole } from "@/lib/auth";
import { appendAudit } from "@/lib/services/audit";
import { processedEvents } from "@/lib/db/schema";

const PRO_SEAT_LIMIT = 1_000_000;
const FREE_SEAT_LIMIT = 3;

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(serverEnv().STRIPE_SECRET_KEY);
  return _stripe;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function memberCount(userId: string, workspaceId: string) {
  const r = await withUser(userId, (tx) =>
    tx
      .select({ c: sql<number>`count(*)::int` })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId)),
  );
  return Math.max(1, r[0]?.c ?? 1);
}

export async function startCheckout(
  userId: string,
  workspaceId: string,
  slug: string,
): Promise<string> {
  await requireRole(userId, workspaceId, "owner");
  if (!features().billing) throw new Error("Billing is not configured");

  const ws = (
    await withUser(userId, (tx) =>
      tx.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1),
    )
  )[0];
  if (!ws) throw new Error("Workspace not found");

  let customerId = ws.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({
      name: ws.name,
      metadata: { workspaceId },
    });
    customerId = customer.id;
    await withUser(userId, (tx) =>
      tx
        .update(workspaces)
        .set({ stripeCustomerId: customerId })
        .where(eq(workspaces.id, workspaceId)),
    );
  }

  const seats = await memberCount(userId, workspaceId);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: serverEnv().STRIPE_PRICE_PRO, quantity: seats }],
    subscription_data: { metadata: { workspaceId } },
    metadata: { workspaceId },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/app/${slug}/settings?upgraded=1`,
    cancel_url: `${appUrl()}/app/${slug}/settings`,
  });
  if (!session.url) throw new Error("Could not create checkout session");
  return session.url;
}

export async function openBillingPortal(
  userId: string,
  workspaceId: string,
  slug: string,
): Promise<string> {
  await requireRole(userId, workspaceId, "owner");
  if (!features().billing) throw new Error("Billing is not configured");

  const ws = (
    await withUser(userId, (tx) =>
      tx.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1),
    )
  )[0];
  if (!ws?.stripeCustomerId) throw new Error("No billing account yet");

  const session = await stripe().billingPortal.sessions.create({
    customer: ws.stripeCustomerId,
    return_url: `${appUrl()}/app/${slug}/settings`,
  });
  return session.url;
}

/** Apply a subscription's state to its workspace. Used by the webhook. */
async function applySubscription(sub: Stripe.Subscription) {
  const workspaceId = sub.metadata?.workspaceId;
  if (!workspaceId) return;

  const active = sub.status === "active" || sub.status === "trialing";
  const periodEnd = (sub as unknown as { current_period_end?: number })
    .current_period_end;

  await withSystem(async (tx) => {
    await tx
      .update(workspaces)
      .set({
        plan: active ? "pro" : "free",
        aiEnabled: active,
        seatLimit: active ? PRO_SEAT_LIMIT : FREE_SEAT_LIMIT,
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));
    await appendAudit(tx, {
      workspaceId,
      actorType: "system",
      actorId: "stripe",
      action: active ? "billing.activated" : "billing.deactivated",
      targetType: "workspace",
      targetId: workspaceId,
      metadata: { status: sub.status },
    });
  });
}

/** Verify + process a Stripe webhook. Idempotent via processed_events. */
export async function handleStripeEvent(
  rawBody: string,
  signature: string,
): Promise<{ ok: boolean }> {
  const event = stripe().webhooks.constructEvent(
    rawBody,
    signature,
    serverEnv().STRIPE_WEBHOOK_SECRET,
  );

  // Dedupe: claim the event id; if already processed, no-op.
  const claimed = await withSystem((tx) =>
    tx
      .insert(processedEvents)
      .values({ id: event.id, provider: "stripe" })
      .onConflictDoNothing()
      .returning({ id: processedEvents.id }),
  );
  if (claimed.length === 0) return { ok: true };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const sub = await stripe().subscriptions.retrieve(
          session.subscription as string,
        );
        if (!sub.metadata?.workspaceId && session.metadata?.workspaceId) {
          sub.metadata = {
            ...sub.metadata,
            workspaceId: session.metadata.workspaceId,
          };
        }
        await applySubscription(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await applySubscription(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }
  return { ok: true };
}
