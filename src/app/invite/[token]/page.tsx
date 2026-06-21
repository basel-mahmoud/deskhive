import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { acceptInviteAction } from "@/lib/actions/members";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=/invite/${token}`);
  const user = await requireUser();

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5">
      <div className="hive-grid pointer-events-none absolute inset-0 -z-10 opacity-50" />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">
            You&apos;ve been invited
          </h1>
          <p className="mt-2 text-sm text-muted">
            Accept this invitation to join the workspace as{" "}
            <span className="text-ink">{user.email}</span>.
          </p>
          <form action={acceptInviteAction.bind(null, token)} className="mt-6">
            <Button type="submit" className="w-full">
              Accept invitation
            </Button>
          </form>
          <ButtonLink
            href="/app"
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
          >
            Not now
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
