# ADR 0001 — Multi-tenancy via forced row-level security

**Status:** Accepted

## Context
DeskHive is multi-tenant: many workspaces share one database. A single missed
`WHERE workspace_id = ?` must not leak another tenant's data.

## Decision
Enforce isolation in two layers. (1) The data-access layer always scopes by
workspace and checks role. (2) Postgres `FORCE ROW LEVEL SECURITY` on tenant
tables, with policies that resolve membership from `current_setting('app.user_id')`
via a `SECURITY DEFINER` helper. The runtime connects as a dedicated role
(`deskhive_app`) created **without** `BYPASSRLS`; migrations use the owner role.

## Consequences
- Even a buggy/forgotten filter cannot cross tenants — the DB rejects it.
- Requires a per-request transaction that sets `app.user_id` (`withUser`).
- System paths (webhooks, AI, portal pre-insert) use an explicit `withSystem`
  bypass GUC, keeping cross-tenant access auditable and deliberate.
- `audit_logs` gets SELECT/INSERT-only policies → append-only by construction.
