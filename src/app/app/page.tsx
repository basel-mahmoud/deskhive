import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/services/workspaces";

// Entry point: route to the user's first workspace, or onboarding.
export default async function AppIndex() {
  const user = await requireUser();
  const workspaces = await getUserWorkspaces(user.id);
  if (workspaces.length === 0) redirect("/onboarding");
  redirect(`/app/${workspaces[0].slug}/inbox`);
}
