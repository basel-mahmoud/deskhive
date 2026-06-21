import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { getPublicWorkspace } from "@/lib/services/portal";
import { PortalClient } from "@/components/portal/portal-client";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ws = await getPublicWorkspace(slug);
  return { title: ws ? `${ws.name} — Support` : "Support" };
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ws = await getPublicWorkspace(slug);
  if (!ws) notFound();

  return (
    <main className="relative min-h-screen bg-bg text-ink">
      <div className="hive-grid pointer-events-none absolute inset-0 -z-10 opacity-40" />
      <div className="mx-auto max-w-2xl px-5 py-12 sm:py-20">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-line bg-surface text-accent">
              <LifeBuoy size={18} />
            </span>
            <span className="font-display text-lg font-semibold">
              {ws.name}
            </span>
          </div>
          <ThemeToggle />
        </div>

        <h1 className="font-display text-3xl font-semibold tracking-tight">
          How can we help?
        </h1>
        <p className="mt-2 mb-8 text-ink-dim">
          Submit a request and we&apos;ll get back to you. Already have a ticket?
          Track its status below.
        </p>

        <PortalClient slug={slug} />

        <p className="mt-8 text-center font-mono text-xs text-muted">
          Powered by DeskHive
        </p>
      </div>
    </main>
  );
}
