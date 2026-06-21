import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { features } from "@/lib/env";
import { getWorkspaceForUser } from "@/lib/services/workspaces";
import { CopyButton } from "@/components/ui/copy-button";
import { BillingPanel } from "@/components/app/billing-panel";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const ctx = await getWorkspaceForUser(user.id, slug);
  if (!ctx) redirect("/app");
  const ws = ctx.workspace;
  const isOwner = ctx.role === "owner";
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/p/${ws.slug}`;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center border-b border-line px-6">
        <h1 className="font-display text-lg font-semibold">Settings</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-base font-semibold">Workspace</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Name">{ws.name}</Row>
              <Row label="Slug">
                <span className="font-mono text-ink-dim">{ws.slug}</span>
              </Row>
              <Row label="Customer portal">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink-dim">
                    {portalUrl}
                  </span>
                  <CopyButton value={portalUrl} />
                </span>
              </Row>
            </dl>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <h2 className="font-display text-base font-semibold">AI triage</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              {ws.aiEnabled
                ? "New tickets are automatically summarised and prioritised by Claude."
                : "Available on the Pro plan. New tickets are triaged by Claude with a suggested reply."}
            </p>
            <div className="mt-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  ws.aiEnabled
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-line-strong bg-surface-2 text-muted"
                }`}
              >
                {ws.aiEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </section>

          <BillingPanel
            slug={slug}
            plan={ws.plan}
            isOwner={isOwner}
            billingEnabled={features().billing}
            subscriptionStatus={ws.subscriptionStatus}
            currentPeriodEnd={
              ws.currentPeriodEnd ? ws.currentPeriodEnd.toISOString() : null
            }
          />
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
