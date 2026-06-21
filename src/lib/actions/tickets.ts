"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, AuthzError } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/services/workspaces";
import {
  addMessage,
  createTicketByAgent,
  updateTicket,
} from "@/lib/services/tickets";
import { maybeTriageTicket } from "@/lib/services/triage";
import {
  addMessageSchema,
  createTicketSchema,
  updateTicketSchema,
} from "@/lib/validation";

export type ActionState = { error?: string; ok?: boolean };

async function resolve(slug: string) {
  const user = await requireUser();
  const ctx = await getWorkspaceForUser(user.id, slug);
  if (!ctx) throw new AuthzError("Workspace not found");
  return { user, ...ctx };
}

export async function createTicketAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const slug = String(formData.get("slug"));
  const { user, workspace } = await resolve(slug);
  const parsed = createTicketSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    requesterEmail: formData.get("requesterEmail"),
    requesterName: formData.get("requesterName") ?? "",
    priority: formData.get("priority") ?? "normal",
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { id, number } = await createTicketByAgent(
    user,
    workspace.id,
    parsed.data,
  );
  // Fire-and-forget AI triage (no-op if AI not configured).
  void maybeTriageTicket(workspace.id, id);
  redirect(`/app/${slug}/tickets/${number}`);
}

export async function replyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const slug = String(formData.get("slug"));
  const ticketId = String(formData.get("ticketId"));
  const { user, workspace } = await resolve(slug);
  const parsed = addMessageSchema.safeParse({
    body: formData.get("body"),
    isInternalNote: formData.get("isInternalNote") === "on",
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await addMessage(
    user,
    workspace.id,
    ticketId,
    parsed.data.body,
    parsed.data.isInternalNote,
  );
  revalidatePath(`/app/${slug}/tickets`);
  return { ok: true };
}

export async function updateTicketAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const slug = String(formData.get("slug"));
  const ticketId = String(formData.get("ticketId"));
  const { user, workspace } = await resolve(slug);
  const assigneeRaw = formData.get("assigneeId");
  const parsed = updateTicketSchema.safeParse({
    status: formData.get("status") || undefined,
    priority: formData.get("priority") || undefined,
    assigneeId:
      assigneeRaw === null
        ? undefined
        : assigneeRaw === "unassigned"
          ? null
          : String(assigneeRaw),
    version: Number(formData.get("version")),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const res = await updateTicket(user, workspace.id, ticketId, parsed.data);
  if (!res.ok)
    return { error: "This ticket changed since you loaded it. Refresh and retry." };
  revalidatePath(`/app/${slug}/tickets`);
  return { ok: true };
}
