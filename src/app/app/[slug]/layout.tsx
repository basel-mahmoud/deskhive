import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getUserWorkspaces,
  getWorkspaceForUser,
} from "@/lib/services/workspaces";
import { Sidebar } from "@/components/app/sidebar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const ctx = await getWorkspaceForUser(user.id, slug);
  if (!ctx) redirect("/app");
  const workspaces = await getUserWorkspaces(user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      <Sidebar
        slug={slug}
        plan={ctx.workspace.plan}
        role={ctx.role}
        workspaces={workspaces}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
