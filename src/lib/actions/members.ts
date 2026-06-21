"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, AuthzError } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/services/workspaces";
import {
  acceptInvite,
  changeRole,
  inviteMember,
  removeMember,
  revokeInvite,
} from "@/lib/services/members";
import { inviteSchema, roleSchema } from "@/lib/validation";

export type ActionState = { error?: string; ok?: boolean; inviteUrl?: string };

async function resolve(slug: string) {
  const user = await requireUser();
  const ctx = await getWorkspaceForUser(user.id, slug);
  if (!ctx) throw new AuthzError("Workspace not found");
  return { user, ...ctx };
}

export async function inviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const slug = String(formData.get("slug"));
  const { user, workspace } = await resolve(slug);
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") ?? "agent",
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const res = await inviteMember(
    user,
    workspace.id,
    parsed.data.email,
    parsed.data.role,
  );
  if (!res.ok) {
    return {
      error:
        res.reason === "seat_limit"
          ? "Seat limit reached on the Free plan. Upgrade to add more agents."
          : "That person is already a member.",
    };
  }
  revalidatePath(`/app/${slug}/members`);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return { ok: true, inviteUrl: `${base}/invite/${res.token}` };
}

export async function changeRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const slug = String(formData.get("slug"));
  const memberId = String(formData.get("memberId"));
  const { user, workspace } = await resolve(slug);
  const role = roleSchema.parse(formData.get("role"));
  const res = await changeRole(user, workspace.id, memberId, role);
  if (!res.ok)
    return {
      error:
        res.reason === "last_owner"
          ? "A workspace must keep at least one owner."
          : "Could not update role.",
    };
  revalidatePath(`/app/${slug}/members`);
  return { ok: true };
}

export async function removeMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const slug = String(formData.get("slug"));
  const memberId = String(formData.get("memberId"));
  const { user, workspace } = await resolve(slug);
  const res = await removeMember(user, workspace.id, memberId);
  if (!res.ok)
    return {
      error:
        res.reason === "last_owner"
          ? "A workspace must keep at least one owner."
          : "Could not remove member.",
    };
  revalidatePath(`/app/${slug}/members`);
  return { ok: true };
}

export async function revokeInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const slug = String(formData.get("slug"));
  const inviteId = String(formData.get("inviteId"));
  const { user, workspace } = await resolve(slug);
  await revokeInvite(user, workspace.id, inviteId);
  revalidatePath(`/app/${slug}/members`);
  return { ok: true };
}

export async function acceptInviteAction(token: string): Promise<void> {
  const user = await requireUser();
  const res = await acceptInvite(user, token);
  if (res.ok) redirect(`/app/${res.slug}/inbox`);
  redirect(`/app?invite_error=${res.reason}`);
}
