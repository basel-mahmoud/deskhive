/**
 * DeskHive data model (Drizzle ORM, PostgreSQL / Neon).
 *
 * Tenancy: every tenant-scoped row carries `workspace_id`. Isolation is enforced
 * twice — in the application data layer (scoped queries) and in the database
 * (forced row-level security keyed on `current_setting('app.user_id')`). See
 * drizzle/0001_rls.sql.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const planEnum = pgEnum("workspace_plan", ["free", "pro"]);
export const roleEnum = pgEnum("member_role", ["owner", "agent", "viewer"]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "pending",
  "resolved",
  "closed",
]);
export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);
export const ticketSourceEnum = pgEnum("ticket_source", [
  "portal",
  "agent",
  "email",
]);
export const authorTypeEnum = pgEnum("message_author_type", [
  "customer",
  "agent",
  "system",
]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
]);

const now = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

// ---------------------------------------------------------------------------
// Users — local mirror of Clerk identities (PII: email, name)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id (e.g. user_xxx)
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------------------------------------------------------------------------
// Workspaces — the tenant boundary
// ---------------------------------------------------------------------------
export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    plan: planEnum("plan").notNull().default("free"),
    aiEnabled: boolean("ai_enabled").notNull().default(false),
    seatLimit: integer("seat_limit").notNull().default(3),
    // Stripe linkage
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    // SLA policy (minutes) per priority, JSON for flexibility
    slaMinutes: jsonb("sla_minutes")
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{"low":2880,"normal":1440,"high":480,"urgent":120}'::jsonb`),
    createdAt: now(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("workspaces_slug_key").on(t.slug)],
);

// ---------------------------------------------------------------------------
// Membership + RBAC
// ---------------------------------------------------------------------------
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("agent"),
    createdAt: now(),
  },
  (t) => [
    uniqueIndex("members_workspace_user_key").on(t.workspaceId, t.userId),
    index("members_user_idx").on(t.userId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").notNull().default("agent"),
    token: text("token").notNull(),
    status: inviteStatusEnum("status").notNull().default("pending"),
    invitedBy: text("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: now(),
  },
  (t) => [
    uniqueIndex("invitations_token_key").on(t.token),
    index("invitations_workspace_idx").on(t.workspaceId),
  ],
);

// ---------------------------------------------------------------------------
// Tickets + thread (PII: requester_email, requester_name)
// ---------------------------------------------------------------------------
export const tickets = pgTable(
  "tickets",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    number: integer("number").notNull(), // per-workspace human id
    subject: text("subject").notNull(),
    status: ticketStatusEnum("status").notNull().default("open"),
    priority: ticketPriorityEnum("priority").notNull().default("normal"),
    category: text("category"),
    requesterEmail: text("requester_email").notNull(),
    requesterName: text("requester_name"),
    assigneeId: text("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    source: ticketSourceEnum("source").notNull().default("portal"),
    // AI triage output
    aiSummary: text("ai_summary"),
    aiCategory: text("ai_category"),
    aiPriority: ticketPriorityEnum("ai_priority"),
    aiDraftReply: text("ai_draft_reply"),
    // SLA / lifecycle timestamps
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    // Optimistic concurrency
    version: integer("version").notNull().default(0),
    createdAt: now(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("tickets_workspace_number_key").on(t.workspaceId, t.number),
    index("tickets_workspace_status_idx").on(t.workspaceId, t.status),
    index("tickets_assignee_idx").on(t.assigneeId),
  ],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    authorType: authorTypeEnum("author_type").notNull(),
    authorUserId: text("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorEmail: text("author_email"),
    body: text("body").notNull(),
    isInternalNote: boolean("is_internal_note").notNull().default(false),
    createdAt: now(),
  },
  (t) => [index("messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Tamper-evident audit log (hash chain per workspace)
// ---------------------------------------------------------------------------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id"),
    actorType: text("actor_type").notNull().default("user"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
    createdAt: now(),
  },
  (t) => [index("audit_workspace_idx").on(t.workspaceId, t.id)],
);

// ---------------------------------------------------------------------------
// Infrastructure: rate limiting, idempotency, webhook dedupe
// ---------------------------------------------------------------------------
export const rateLimits = pgTable(
  "rate_limits",
  {
    bucket: text("bucket").primaryKey(), // scope:identifier:window
    count: integer("count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limits_expiry_idx").on(t.expiresAt)],
);

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  workspaceId: text("workspace_id"),
  requestHash: text("request_hash").notNull(),
  statusCode: integer("status_code"),
  response: jsonb("response"),
  createdAt: now(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const processedEvents = pgTable("processed_events", {
  id: text("id").primaryKey(), // provider event id
  provider: text("provider").notNull(),
  createdAt: now(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type Member = typeof workspaceMembers.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
