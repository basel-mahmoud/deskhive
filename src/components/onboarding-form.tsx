"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { createWorkspaceAction, type FormState } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createWorkspaceAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Workspace name
        </label>
        <input
          id="name"
          name="name"
          required
          autoFocus
          maxLength={60}
          placeholder="Northwind Support"
          className="w-full rounded-[var(--radius-md)] border border-line-strong bg-surface-2 px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-accent"
        />
        <p className="mt-1.5 text-xs text-muted">
          You can rename it later. We&apos;ll generate a portal URL from this.
        </p>
      </div>
      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create workspace"}
        {!pending && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
