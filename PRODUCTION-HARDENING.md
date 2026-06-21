# Production hardening — DeskHive

Honest status of each production-readiness control. Legend:
**✅ Code** (implemented in this repo) · **☁️ Platform** (provided by Clerk / Neon /
Vercel) · **📄 Docs/Process** · **🟡 Partial** (intentional scope limit, noted).

## Security

| Control | Status | Where / notes |
| --- | --- | --- |
| Input sanitization & injection prevention | ✅ Code | All input via Zod schemas (`src/lib/validation.ts`); `sanitizeText` strips control/zero-width chars; Drizzle uses parameterized queries everywhere; output rendered as text (no `dangerouslySetInnerHTML` for user data). |
| Authentication | ✅ Code / ☁️ | Clerk (email + Google), `clerkMiddleware` protects `/app` & `/onboarding`. |
| Authorization, roles & permissions | ✅ Code | `requireRole` + `roleAtLeast` (owner > agent > viewer), least-privilege checks in every mutating service; last-owner protection. |
| Session management & token expiry | ☁️ Platform | Clerk-managed short-lived sessions, rotation & revocation. |
| Secrets management | ✅ Code / 📄 | Only `NEXT_PUBLIC_*` exposed to client; secrets in `.env.local` (gitignored) / Vercel env; validated in `src/lib/env.ts`. |
| HTTPS / TLS / encryption in transit | ☁️ Platform | Vercel TLS; Neon `sslmode=verify-full`; Clerk/Stripe over HTTPS. |
| Encryption at rest | ☁️ Platform | Neon (Postgres) and Clerk encrypt at rest. |
| Rate limiting & abuse prevention | ✅ Code | DB-backed fixed-window limiter (`rate-limit.ts`) on all public endpoints; honeypot field on portal. |
| Dependency scanning & patching | ✅ Code / 📄 | CI runs `npm audit --omit=dev --audit-level=high`; Dependabot weekly; `postcss` pinned via overrides. Remaining moderate advisories are dev-only (`drizzle-kit`). |
| Multi-tenancy & data isolation | ✅ Code | `workspace_id` on every tenant row; **forced** Postgres RLS keyed on `app.user_id`; app connects as a non-bypassing role; scoped queries in the data layer. Verified by `npm run test:rls`. |
| PII handling | ✅ Code / 📄 | PII limited to user + requester email/name; documented in ARCHITECTURE; no PII in logs or URLs. |
| Data retention & deletion | 🟡 Partial / 📄 | Workspaces support soft-delete (`deleted_at`); per-user deletion policy documented (Clerk `user.deleted` webhook is the planned hook). |
| Regulatory compliance (GDPR-style) | 📄 Docs | Data map + lawful-basis notes in ARCHITECTURE; export/delete flows are the documented next step. |
| Audit trails & tamper-evident logging | ✅ Code | Per-workspace SHA-256 **hash chain** (`audit.ts`); `audit_logs` is append-only under FORCE RLS (no UPDATE/DELETE policy). `verifyChain` + tests. |
| Security headers (CSP, HSTS, etc.) | ✅ Code | `next.config.ts`: CSP, HSTS preload, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. CSP `script-src` is `https:`-permissive for Clerk/Stripe — nonce-based tightening is the documented follow-up. |

## Testing & CI

| Control | Status | Where |
| --- | --- | --- |
| Unit tests | ✅ Code | Vitest: validation/sanitization, audit hash-chain tamper detection, id/slug helpers. |
| Integration tests | ✅ Code | `npm run test:rls` provisions two tenants and asserts cross-tenant read **and** write are blocked by RLS. |
| End-to-end tests | ✅ Code | Playwright smoke (`e2e/`): landing, auth redirect, sign-in. Run locally / against preview. |
| Regression tests | ✅ Code | The unit + e2e suites run on every PR via CI. |
| Load & stress testing | 📄 Docs | Method documented (k6 against the portal API); not bundled. |
| Chaos / resilience testing | 📄 Docs | Failure-injection plan documented (DB unavailable → graceful degradation paths exist). |
| Test discovery / schedule / enforcement | ✅ Code | GitHub Actions on push/PR to `main`; lint + typecheck + tests + audit + build gate merges. |
| Code review process & standards | ✅ Code / 📄 | ESLint (next config) + `tsc` strict; conventional commits; PR-based flow. |

## Reliability & resilience

| Control | Status | Where |
| --- | --- | --- |
| Error handling & graceful degradation | ✅ Code | AI triage is best-effort (never blocks ticket creation); billing/AI features no-op when unconfigured. |
| Retry logic w/ backoff + idempotency | ✅ Code | Idempotency keys on the portal submit API (`idempotency.ts`); webhook dedupe via `processed_events`; clients can safely retry. |
| Circuit breakers & fallback | 🟡 Partial | Triage failures are caught and isolated; explicit breaker library is a documented next step. |
| Concurrency & race-condition prevention | ✅ Code | Optimistic concurrency on ticket updates (`version`); advisory locks serialise ticket numbering and audit-chain appends. |
| Caching strategy & invalidation | ✅ Code | Per-request `React.cache`; `revalidatePath` after mutations; Vercel CDN for static assets. |
| RTO / RPO, DR, backups | ☁️ Platform / 📄 | Neon PITR/branching (RPO target ≤ 5 min, RTO ≤ 1 h documented in ARCHITECTURE); migrations are version-controlled and replayable. |

## Architecture & docs

| Control | Status | Where |
| --- | --- | --- |
| Accessibility (WCAG) | 🟡 Partial | Semantic HTML, labelled controls, focus-visible rings, `prefers-reduced-motion` honored; full audit pending. |
| ADRs | ✅ Docs | `docs/adr/`. |
| Architecture diagrams | ✅ Docs | `docs/ARCHITECTURE.md` (Mermaid). |
| API contracts | ✅ Docs | `docs/openapi.yaml` (portal API) + typed server actions. |
