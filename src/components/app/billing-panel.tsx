"use client";

import { CreditCard, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { upgradeAction, manageBillingAction } from "@/lib/actions/billing";

export function BillingPanel({
  slug,
  plan,
  isOwner,
  subscriptionStatus,
  currentPeriodEnd,
}: {
  slug: string;
  plan: string;
  isOwner: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
}) {
  const isPro = plan === "pro";

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-accent" />
        <h2 className="font-display text-base font-semibold">Plan & billing</h2>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-semibold capitalize">
              {plan}
            </span>
            {isPro && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/12 px-2 py-0.5 text-[0.7rem] text-accent">
                <Sparkles size={11} /> AI enabled
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {isPro
              ? subscriptionStatus
                ? `Status: ${subscriptionStatus}${
                    currentPeriodEnd
                      ? ` · renews ${new Date(currentPeriodEnd).toLocaleDateString()}`
                      : ""
                  }`
                : "Active subscription"
              : "Up to 3 seats · manual triage"}
          </p>
        </div>
        {isOwner ? (
          isPro ? (
            <form action={manageBillingAction.bind(null, slug)}>
              <Button type="submit" variant="outline" size="sm">
                Manage billing
              </Button>
            </form>
          ) : (
            <form action={upgradeAction.bind(null, slug)}>
              <Button type="submit" size="sm">
                <Sparkles size={14} /> Upgrade to Pro
              </Button>
            </form>
          )
        ) : (
          <span className="text-xs text-muted">
            Only owners can manage billing
          </span>
        )}
      </div>

      {!isPro && (
        <ul className="mt-4 grid gap-2 text-sm text-ink-dim sm:grid-cols-2">
          {[
            "Unlimited seats",
            "Claude AI triage & draft replies",
            "Priority SLA policies",
            "Everything in Free",
          ].map((x) => (
            <li key={x} className="flex items-center gap-2">
              <Check size={14} className="text-accent" /> {x}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
