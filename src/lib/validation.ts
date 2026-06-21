/**
 * Input validation + sanitization. All external input flows through these Zod
 * schemas. Text is normalised (NFC, control chars stripped, length-capped); we
 * never render stored text as HTML, so output stays injection-safe.
 */
import { z } from "zod";

/** Strip control characters and zero-width chars; collapse to a sane length. */
export function sanitizeText(input: string, max = 10_000): string {
  const normalized = input.normalize("NFC");
  let out = "";
  for (const ch of normalized) {
    const code = ch.codePointAt(0)!;
    const isControl =
      (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
      (code >= 0x7f && code <= 0x9f);
    const isZeroWidth =
      code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff;
    if (!isControl && !isZeroWidth) out += ch;
  }
  return out.trim().slice(0, max);
}

const text = (min: number, max: number) =>
  z
    .string()
    .transform((s) => sanitizeText(s, max))
    .pipe(z.string().min(min, "Too short").max(max, "Too long"));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email")
  .max(254);

export const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const statusSchema = z.enum(["open", "pending", "resolved", "closed"]);
export const roleSchema = z.enum(["owner", "agent", "viewer"]);

export const createWorkspaceSchema = z.object({
  name: text(2, 60),
});

export const createTicketSchema = z.object({
  subject: text(3, 200),
  body: text(1, 10_000),
  requesterEmail: emailSchema,
  requesterName: text(0, 100).optional().or(z.literal("")),
  priority: prioritySchema.default("normal"),
});

export const portalTicketSchema = z.object({
  subject: text(3, 200),
  body: text(1, 5_000),
  requesterEmail: emailSchema,
  requesterName: text(0, 100).optional().or(z.literal("")),
  // Honeypot — must be empty (bots fill it).
  company: z.literal("").optional(),
});

export const addMessageSchema = z.object({
  body: text(1, 10_000),
  isInternalNote: z.boolean().default(false),
});

export const inviteSchema = z.object({
  email: emailSchema,
  role: roleSchema.default("agent"),
});

export const updateTicketSchema = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  version: z.number().int().nonnegative(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type PortalTicketInput = z.infer<typeof portalTicketSchema>;
