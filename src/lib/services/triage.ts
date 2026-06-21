import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { withSystem } from "@/lib/db/client";
import { ticketMessages, tickets, workspaces } from "@/lib/db/schema";
import { appendAudit } from "@/lib/services/audit";
import { serverEnv, features } from "@/lib/env";

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
type Priority = (typeof PRIORITIES)[number];

type TriageOutput = {
  summary: string;
  category: string;
  priority: Priority;
  draftReply: string;
};

const SYSTEM = `You are a senior customer-support triage assistant.
Given a support ticket, respond ONLY with JSON matching exactly:
{"summary": string (<=200 chars), "category": one of ["Billing","Bug","How-to","Account","Feature request","Outage","Other"], "priority": one of ["low","normal","high","urgent"], "draftReply": string (a concise, empathetic first reply the agent can edit, <=120 words)}.
Judge priority by customer impact and urgency.`;

/**
 * Triage a ticket with Google Gemini (free AI Studio tier). Idempotent (skips
 * if already triaged) and a no-op when AI is not configured or disabled for the
 * workspace, so the product degrades gracefully to manual triage.
 */
export async function maybeTriageTicket(
  workspaceId: string,
  ticketId: string,
): Promise<void> {
  try {
    if (!features().ai) return;

    const prepared = await withSystem(async (tx) => {
      const ws = await tx
        .select({ aiEnabled: workspaces.aiEnabled })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      if (!ws[0]?.aiEnabled) return null;

      const t = await tx
        .select({ subject: tickets.subject, aiSummary: tickets.aiSummary })
        .from(tickets)
        .where(and(eq(tickets.id, ticketId), isNull(tickets.aiSummary)))
        .limit(1);
      if (t.length === 0) return null;

      const first = await tx
        .select({ body: ticketMessages.body })
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticketId))
        .orderBy(asc(ticketMessages.createdAt))
        .limit(1);
      return { subject: t[0].subject, body: first[0]?.body ?? "" };
    });
    if (!prepared) return;

    const model = serverEnv().CLASSIFY_MODEL;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": serverEnv().GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Subject: ${prepared.subject}\n\nMessage:\n${prepared.body}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 700,
          },
        }),
      },
    );
    if (!res.ok) {
      console.error("gemini triage http", res.status, await res.text());
      return;
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Partial<TriageOutput>;
    const priority: Priority = PRIORITIES.includes(parsed.priority as Priority)
      ? (parsed.priority as Priority)
      : "normal";

    await withSystem(async (tx) => {
      await tx
        .update(tickets)
        .set({
          aiSummary: (parsed.summary ?? "").slice(0, 240),
          aiCategory: (parsed.category ?? "Other").slice(0, 60),
          aiPriority: priority,
          aiDraftReply: (parsed.draftReply ?? "").slice(0, 2000),
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticketId));
      await appendAudit(tx, {
        workspaceId,
        actorType: "system",
        actorId: "ai-triage",
        action: "ticket.triaged",
        targetType: "ticket",
        targetId: ticketId,
        metadata: { category: parsed.category, priority, model },
      });
    });
  } catch (err) {
    // Never let triage failures break ticket creation.
    console.error("triage failed", err);
  }
}
