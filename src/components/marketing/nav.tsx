"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-[var(--ease-expo)]",
        scrolled
          ? "border-b border-line bg-bg/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="DeskHive home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-8 text-sm text-ink-dim md:flex">
          <a href="#features" className="transition-colors hover:text-ink">
            Features
          </a>
          <a href="#security" className="transition-colors hover:text-ink">
            Security
          </a>
          <a href="#pricing" className="transition-colors hover:text-ink">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-out">
            <ButtonLink href="/sign-in" variant="ghost" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink
              href="/sign-up"
              size="sm"
              className="hidden sm:inline-flex"
            >
              Start free
            </ButtonLink>
          </Show>
          <Show when="signed-in">
            <ButtonLink href="/app" size="sm">
              Open app
            </ButtonLink>
          </Show>
        </div>
      </nav>
    </header>
  );
}
