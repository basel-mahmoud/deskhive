"use client";

import { useActionState } from "react";
import { createTicketAction, type ActionState } from "@/lib/actions/tickets";
import { Button } from "@/components/ui/button";

const field =
  "w-full rounded-[var(--radius-md)] border border-line-strong bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent";

export function NewTicketForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createTicketAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label className="mb-1.5 block text-sm font-medium">Subject</label>
        <input name="subject" required maxLength={200} className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Requester email
          </label>
          <input
            name="requesterEmail"
            type="email"
            required
            className={field}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Requester name <span className="text-muted">(optional)</span>
          </label>
          <input name="requesterName" maxLength={100} className={field} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Priority</label>
        <select name="priority" defaultValue="normal" className={field}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Message</label>
        <textarea
          name="body"
          required
          rows={7}
          maxLength={10000}
          className={`${field} resize-y`}
        />
      </div>
      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create ticket"}
        </Button>
      </div>
    </form>
  );
}
