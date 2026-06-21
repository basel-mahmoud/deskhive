# DeskHive

**The support desk that stays calm under load.** A multi-tenant, AI-assisted
help desk: a public ticket portal, an agent inbox with SLA tracking, role-based
teams, seat-based billing, and a tamper-evident audit trail — production-hardened
from line one.

> Built by Basel Mahmoud as a portfolio reference for a genuinely
> production-grade B2B SaaS (not a demo).

- **Live:** **https://deskhive-ten.vercel.app** · customer portal demo: `/p/northwind-support`
- **Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
  **Decisions:** [`docs/adr/`](docs/adr) ·
  **API:** [`docs/openapi.yaml`](docs/openapi.yaml) ·
  **Hardening status:** [`PRODUCTION-HARDENING.md`](PRODUCTION-HARDENING.md)

## Features

- **Multi-tenant workspaces** with full data isolation (forced Postgres RLS).
- **Customer portal** per workspace — submit & track tickets, no account needed.
- **Agent inbox** — filters, search, live SLA countdowns, assignment.
- **Ticket threads** — customer/agent messages, internal notes, status &
  priority with optimistic concurrency.
- **AI triage (Claude)** — auto summary, category, priority, draft reply
  (degrades gracefully when unconfigured).
- **RBAC** — owner / agent / viewer, least-privilege, last-owner protection.
- **Seat-based billing (Stripe)** — checkout, customer portal, idempotent
  webhooks.
- **Tamper-evident audit log** — per-workspace SHA-256 hash chain, append-only.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Drizzle ORM ·
Neon Postgres · Clerk (auth) · Stripe (billing) · Anthropic Claude · Vitest +
Playwright · GitHub Actions · Vercel.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run db:migrate                 # apply schema + RLS to your Neon DB
npx tsx scripts/create-app-role.ts # create the non-bypassing runtime role
npm run dev                        # http://localhost:3000
```

### Environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection (owner) |
| `DIRECT_URL` | Neon unpooled connection (migrations) |
| `APP_DATABASE_URL` | Pooled connection as the non-bypassing `deskhive_app` role |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk auth |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PRO` | Billing |
| `ANTHROPIC_API_KEY` / `CLASSIFY_MODEL` | AI triage |
| `NEXT_PUBLIC_APP_URL` | Public base URL |

Billing and AI are optional — the app runs and degrades gracefully without them.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / build / serve |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:rls` | Integration test — proves cross-tenant isolation |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run db:generate` / `db:migrate` | Drizzle migrations |

## Testing

- **Unit** (Vitest): input validation/sanitization, audit hash-chain tamper
  detection, id/slug helpers.
- **Integration** (`test:rls`): provisions two tenants and asserts cross-tenant
  reads **and** writes are blocked by RLS.
- **E2E** (Playwright): landing, auth redirect, sign-in.
- **CI** (GitHub Actions): lint + typecheck + tests + `npm audit` + build on
  every push/PR.

## Security highlights

Forced RLS tenant isolation · parameterized queries + Zod validation ·
rate limiting + honeypot on public endpoints · idempotent mutating APIs ·
tamper-evident audit log · strict security headers (CSP/HSTS/…) · secrets never
shipped to the client. Full status in
[`PRODUCTION-HARDENING.md`](PRODUCTION-HARDENING.md).

## Deployment

Deployed on **Vercel** (app) + **Neon** (database). On deploy: set the env vars
above, run `db:migrate`, create the `deskhive_app` role, and point the Stripe
webhook at `/api/webhooks/stripe`.
