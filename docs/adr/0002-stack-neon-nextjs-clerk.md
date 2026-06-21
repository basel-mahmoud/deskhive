# ADR 0002 — Stack: Next.js + Neon + Clerk + Stripe

**Status:** Accepted

## Context
Need a full-stack, deployable SaaS with auth, a serverless-friendly database,
billing, and AI — fast to build, cheap to run, credible on a CV.

## Decision
- **Next.js (App Router) on Vercel** — one deploy unit for UI, server actions
  and API routes; static marketing + dynamic app.
- **Neon Postgres + Drizzle ORM** — serverless Postgres with branching/PITR;
  typed schema and migrations; RLS support. WebSocket pool driver for
  transactional `SET LOCAL` (needed for RLS context).
- **Clerk** — managed auth (email + Google), sessions, MFA-ready; we keep
  authorization in our own DB.
- **Stripe** — subscription billing with a hosted checkout/portal.
- **Anthropic Claude** — ticket triage.

## Consequences
- Minimal ops; each concern handled by a focused provider.
- Identity (Clerk) and authorization (our DB) are decoupled — flexible RBAC,
  no lock-in of the permission model.
- Serverless + pooled Postgres requires care with connections (singleton pool,
  short transactions).
