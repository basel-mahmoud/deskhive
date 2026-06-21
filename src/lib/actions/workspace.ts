"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createWorkspace } from "@/lib/services/workspaces";
import { createWorkspaceSchema } from "@/lib/validation";

export type FormState = { error?: string };

export async function createWorkspaceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }
  const ws = await createWorkspace(user, parsed.data.name);
  redirect(`/app/${ws.slug}/inbox`);
}
