import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/services/workspaces";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata: Metadata = { title: "Create your workspace" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const workspaces = await getUserWorkspaces(user.id);
  // If they already have a workspace, skip onboarding.
  if (workspaces.length > 0) redirect(`/app/${workspaces[0].slug}/inbox`);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-16">
      <div className="hive-grid pointer-events-none absolute inset-0 -z-10 opacity-50" />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8">
          <span className="font-mono text-xs tracking-widest text-accent uppercase">
            Step 1 of 1
          </span>
          <h1 className="mt-2 mb-1 font-display text-2xl font-semibold">
            Name your desk
          </h1>
          <p className="mb-6 text-sm text-muted">
            Welcome, {user.name || user.email}. Spin up a workspace to start
            taking tickets.
          </p>
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
