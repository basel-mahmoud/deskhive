import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/services/workspaces";
import { listInvites, listMembers } from "@/lib/services/members";
import { MembersManager } from "@/components/app/members-manager";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const ctx = await getWorkspaceForUser(user.id, slug);
  if (!ctx) redirect("/app");

  const canManage = ctx.role === "owner";
  const [members, invites] = await Promise.all([
    listMembers(user.id, ctx.workspace.id),
    canManage ? listInvites(user.id, ctx.workspace.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center border-b border-line px-6">
        <h1 className="font-display text-lg font-semibold">Team</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <MembersManager
          slug={slug}
          canManage={canManage}
          currentUserId={user.id}
          members={members.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            email: m.email,
            name: m.name,
          }))}
          invites={invites.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            token: i.token,
          }))}
        />
      </div>
    </>
  );
}
