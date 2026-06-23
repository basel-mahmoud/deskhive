import Link from "next/link";
import {
  Sparkles,
  Timer,
  ShieldCheck,
  Users,
  Globe,
  ScrollText,
  Lock,
  KeyRound,
  Activity,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { LiveInbox } from "@/components/marketing/live-inbox";
import { Reveal } from "@/components/marketing/reveal";
import { FeatureCard } from "@/components/motion/feature-card";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { HeroOrbs } from "@/components/motion/hero-orbs";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const features = [
  {
    icon: Sparkles,
    title: "AI triage that actually helps",
    body: "Every inbound ticket is summarised, categorised, and prioritised by Gemini — with a suggested first reply your agents can send or edit.",
  },
  {
    icon: Timer,
    title: "SLA clocks on every ticket",
    body: "Per-priority response targets with live countdown rings. See what is about to breach before it does, not after.",
  },
  {
    icon: Users,
    title: "Roles that mean something",
    body: "Owner, agent and viewer with least-privilege access — enforced in the app and again in the database with row-level security.",
  },
  {
    icon: Globe,
    title: "A portal per workspace",
    body: "Customers file and track tickets at your own branded portal. No account required, rate-limited, abuse-resistant.",
  },
  {
    icon: ScrollText,
    title: "Tamper-evident audit trail",
    body: "Every state change is hash-chained and append-only. Export a verifiable history for compliance and incident reviews.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-tenant by design",
    body: "Each workspace is fully isolated. One forced RLS policy stands between every query and another tenant's data.",
  },
];

const security = [
  { icon: Lock, label: "Forced row-level security" },
  { icon: KeyRound, label: "Short-lived sessions & token expiry" },
  { icon: Activity, label: "Rate limiting & abuse prevention" },
  { icon: ScrollText, label: "Hash-chained audit logs" },
  { icon: ShieldCheck, label: "Input validation & injection-safe queries" },
  { icon: GitBranch, label: "Idempotent, retry-safe mutations" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen bg-bg text-ink">
      <MarketingNav />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden px-5 pt-32 pb-20 sm:pt-40">
        <HeroOrbs />
        <div className="hive-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="rise inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-ring" />
              Now with Gemini-powered triage
            </div>
            <h1
              className="rise mt-6 font-display text-[2.7rem] leading-[1.04] font-semibold tracking-tight sm:text-6xl"
              style={{ animationDelay: "0.05s" }}
            >
              The support desk
              <br />
              that stays{" "}
              <span className="relative whitespace-nowrap text-accent">
                calm
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="10"
                  viewBox="0 0 200 10"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 7C40 2 160 2 198 7"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              under load.
            </h1>
            <p
              className="rise mt-6 max-w-md text-lg text-ink-dim"
              style={{ animationDelay: "0.1s" }}
            >
              DeskHive turns inbound chaos into a measurable queue. AI triage,
              SLA clocks, role-based teams and a customer portal — multi-tenant
              and production-hardened from line one.
            </p>
            <div
              className="rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.15s" }}
            >
              <ButtonLink href="/sign-up" size="lg" className="group">
                Start free
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </ButtonLink>
              <ButtonLink href="#features" variant="outline" size="lg">
                See how it works
              </ButtonLink>
            </div>
            <p
              className="rise mt-4 font-mono text-xs text-muted"
              style={{ animationDelay: "0.2s" }}
            >
              No credit card · 3 seats free · live in 2 minutes
            </p>
          </div>

          <div className="relative flex flex-col items-center lg:pl-4">
            <LiveInbox />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Stat band */}
      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-line md:grid-cols-4">
          <AnimatedCounter value={7} suffix="m" label="median first response" />
          <AnimatedCounter
            value={98.2}
            decimals={1}
            suffix="%"
            label="SLA targets met"
          />
          <AnimatedCounter value={100} suffix="%" label="tenant isolation" />
          <AnimatedCounter value={0} label="shared rows, ever" />
        </div>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section id="features" className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-accent uppercase">
              The product
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold sm:text-4xl">
              Everything a support team needs, nothing that gets in the way.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-xl)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.06} className="h-full">
                <FeatureCard
                  icon={<f.icon size={20} />}
                  title={f.title}
                  body={f.body}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Security */}
      <section
        id="security"
        className="relative overflow-hidden border-y border-line bg-surface/30 px-5 py-24"
      >
        <div className="dotgrid pointer-events-none absolute inset-0 -z-10 opacity-40" />
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-accent uppercase">
              Built to be trusted
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Production-grade, not demo-grade.
            </h2>
            <p className="mt-4 text-ink-dim">
              DeskHive ships with the controls most products bolt on later:
              tenant isolation enforced in the database, audit trails you can
              verify, and abuse prevention on every public surface.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {security.map((s, i) => (
              <Reveal key={s.label} delay={(i % 3) * 0.05}>
                <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-bg px-4 py-3.5">
                  <s.icon size={18} className="shrink-0 text-success" />
                  <span className="text-sm text-ink">{s.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Pricing */}
      <section id="pricing" className="px-5 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Simple, seat-based pricing
            </h2>
            <p className="mt-3 text-ink-dim">
              Start free. Upgrade when your team grows.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <Reveal>
              <div className="card h-full p-8">
                <h3 className="font-display text-xl font-semibold">Free</h3>
                <p className="mt-1 text-sm text-muted">For small teams</p>
                <div className="mt-5 font-display text-4xl font-semibold">
                  $0
                  <span className="text-base font-normal text-muted">/mo</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm text-ink-dim">
                  {[
                    "Up to 3 seats",
                    "Unlimited tickets",
                    "Customer portal",
                    "SLA tracking & audit log",
                  ].map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <span className="text-success">✓</span> {x}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href="/sign-up"
                  variant="outline"
                  className="mt-7 w-full"
                >
                  Get started
                </ButtonLink>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card relative h-full overflow-hidden border-accent/40 p-8">
                <div className="absolute top-0 right-0 rounded-bl-[var(--radius-md)] bg-accent px-3 py-1 text-[0.7rem] font-medium text-accent-ink">
                  Most popular
                </div>
                <h3 className="font-display text-xl font-semibold">Pro</h3>
                <p className="mt-1 text-sm text-muted">
                  For growing support orgs
                </p>
                <div className="mt-5 font-display text-4xl font-semibold">
                  $24
                  <span className="text-base font-normal text-muted">
                    /seat/mo
                  </span>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm text-ink-dim">
                  {[
                    "Unlimited seats",
                    "Gemini AI triage & draft replies",
                    "Priority SLA policies",
                    "Everything in Free",
                  ].map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <span className="text-accent">✓</span> {x}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/sign-up" className="mt-7 w-full">
                  Start free trial
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Footer */}
      <footer className="border-t border-line px-5 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo />
          <p className="font-mono text-xs text-muted">
            Built by Basel Mahmoud · multi-tenant SaaS reference
          </p>
          <div className="flex gap-6 text-sm text-ink-dim">
            <a href="#features" className="hover:text-ink">
              Features
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
            </a>
            <Link href="/sign-in" className="hover:text-ink">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
