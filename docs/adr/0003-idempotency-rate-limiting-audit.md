# ADR 0003 — Idempotency, rate limiting & tamper-evident audit

**Status:** Accepted

## Context
Public endpoints (the customer portal) and webhooks must resist abuse and be
safe to retry, and privileged actions must be auditable for compliance.

## Decision
- **Rate limiting:** DB-backed fixed-window counter keyed by
  `scope:identifier:window` with an atomic upsert — consistent across serverless
  instances without extra infra (Redis optional later).
- **Idempotency:** portal submit accepts an `Idempotency-Key`; first request
  runs and its response is stored, replays return it, a different body under the
  same key is a 409. Stripe events are de-duplicated via `processed_events`.
- **Audit:** per-workspace SHA-256 hash chain; append-only under FORCE RLS;
  `verifyChain` detects tampering/deletion.

## Consequences
- No external dependency for limiting/idempotency; trades absolute precision for
  operational simplicity (acceptable for current scale).
- Hash chaining adds a serialised advisory lock per workspace on writes — cheap
  at expected volumes, revisit if a workspace becomes extremely hot.
