"use server";

import { redirect } from "next/navigation";
import { requireUser, AuthzError } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/services/workspaces";
import { openBillingPortal, startCheckout } from "@/lib/services/billing";

async function resolve(slug: string) {
  const user = await requireUser();
  const ctx = await getWorkspaceForUser(user.id, slug);
  if (!ctx) throw new AuthzError("Workspace not found");
  return { user, ...ctx };
}

export async function upgradeAction(slug: string): Promise<void> {
  const { user, workspace } = await resolve(slug);
  const url = await startCheckout(user.id, workspace.id, slug);
  redirect(url);
}

export async function manageBillingAction(slug: string): Promise<void> {
  const { user, workspace } = await resolve(slug);
  const url = await openBillingPortal(user.id, workspace.id, slug);
  redirect(url);
}
