import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/ui/logo";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-16">
      <div className="hive-grid pointer-events-none absolute inset-0 -z-10 opacity-50" />
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="card p-7">
          <h1 className="mb-1 font-display text-xl font-semibold">
            Start your desk
          </h1>
          <p className="mb-6 text-sm text-muted">
            Create an account — 3 seats free, no card required.
          </p>
          <SignUp
            appearance={clerkAppearance}
            signInUrl="/sign-in"
            fallbackRedirectUrl="/onboarding"
          />
        </div>
      </div>
    </main>
  );
}
