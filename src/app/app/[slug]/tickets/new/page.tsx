import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser, roleAtLeast } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/services/workspaces";
import { NewTicketForm } from "@/components/app/new-ticket-form";

export default async function NewTicketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const ctx = await getWorkspaceForUser(user.id, slug);
  if (!ctx) redirect("/app");
  // Viewers cannot create tickets.
  if (!roleAtLeast(ctx.role, "agent")) redirect(`/app/${slug}/inbox`);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-6">
        <Link
          href={`/app/${slug}/inbox`}
          className="text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display text-lg font-semibold">New ticket</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <NewTicketForm slug={slug} />
        </div>
      </div>
    </>
  );
}
