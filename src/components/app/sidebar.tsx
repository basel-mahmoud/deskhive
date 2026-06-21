"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Inbox,
  Users,
  Settings,
  ExternalLink,
  ChevronsUpDown,
  Check,
  Plus,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Ws = { slug: string; name: string; plan: string };

export function Sidebar({
  slug,
  plan,
  role,
  workspaces,
}: {
  slug: string;
  plan: string;
  role: string;
  workspaces: Ws[];
}) {
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const base = `/app/${slug}`;
  const current = workspaces.find((w) => w.slug === slug);

  const nav = [
    { href: `${base}/inbox`, label: "Inbox", icon: Inbox },
    { href: `${base}/members`, label: "Team", icon: Users },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface/40">
      <div className="flex h-16 items-center px-4">
        <Link href="/app">
          <Logo />
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="relative px-3">
        <button
          onClick={() => setSwitcherOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-2"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">
              {current?.name ?? slug}
            </span>
            <span className="text-[0.7rem] text-muted capitalize">
              {plan} · {role}
            </span>
          </span>
          <ChevronsUpDown size={15} className="shrink-0 text-muted" />
        </button>
        {switcherOpen && (
          <div className="absolute inset-x-3 z-20 mt-1 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface shadow-[var(--shadow)]">
            {workspaces.map((w) => (
              <Link
                key={w.slug}
                href={`/app/${w.slug}/inbox`}
                onClick={() => setSwitcherOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-sm text-ink hover:bg-surface-2"
              >
                <span className="truncate">{w.name}</span>
                {w.slug === slug && <Check size={14} className="text-accent" />}
              </Link>
            ))}
            <Link
              href="/onboarding"
              className="flex items-center gap-2 border-t border-line px-3 py-2 text-sm text-ink-dim hover:bg-surface-2"
            >
              <Plus size={14} /> New workspace
            </Link>
          </div>
        )}
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-surface-2 font-medium text-ink"
                  : "text-ink-dim hover:bg-surface-2 hover:text-ink",
              )}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}
        <a
          href={`/p/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ExternalLink size={17} />
          Customer portal
        </a>
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-line p-3">
        <UserButton />
        <div className="flex items-center gap-2">
          {plan === "pro" ? (
            <Badge tone="accent">Pro</Badge>
          ) : (
            <Badge>Free</Badge>
          )}
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
